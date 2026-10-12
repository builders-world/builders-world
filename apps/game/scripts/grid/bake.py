#!/usr/bin/env python3
"""Bake a city's grid: the whole city, in 500 m tiles, for the game to stream round the district you play in.

Elvis, 12 October 2026, with a model of Nairobi's centre: "use this as a guide for the grid ... so that it's going to
capture a much more accurate view of Nairobi". One continuous city, every building where it really is and about as
tall as it really is, drawn in the game's own clay look (citygrid.js).

  pip install duckdb rasterio numpy
  python3 scripts/grid/bake.py kenya/nairobi

Sources (all open, credited in the game and the README):
  - buildings, roads, parks and water: Overture Maps (OpenStreetMap, Google Open Buildings and Microsoft building
    footprints; ODbL), read straight from Overture's public bucket with DuckDB;
  - heights: OpenStreetMap's `height` or floor count where someone mapped it (the towers, mostly); everywhere else
    the average building height of the surrounding 100 m from the EU's Global Human Settlement Layer
    (GHS-BUILT-H 2018, CC BY 4.0), varied building by building with its footprint.

The area comes from the city's own folder: cities/<country>/<city>/city.json, "grid": {south, west, north, east}.
Output: apps/game/public/grid/<city>/index.json and one <i>_<j>.json per tile, in metres from the city's centre
(x east, z south, as the district manifests), rounded to 10 cm.
"""
import json, math, os, sys, zipfile, urllib.request, hashlib
import duckdb, numpy as np, rasterio

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.normpath(os.path.join(HERE, '..', '..'))
REPO = os.path.normpath(os.path.join(GAME, '..', '..'))
RELEASE = '2026-09-23.1'
OVERTURE = f's3://overturemaps-us-west-2/release/{RELEASE}'
GHS = 'https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_BUILT_H_GLOBE_R2023A/GHS_BUILT_H_ANBH_E2018_GLOBE_R2023A_4326_3ss/V1-0/tiles/'
TILE = 500

ROAD_W = {'motorway': 16, 'trunk': 15, 'primary': 14, 'secondary': 12, 'tertiary': 10, 'unclassified': 8,
          'residential': 8, 'living_street': 6, 'service': 5, 'pedestrian': 4}
ROAD_K = list(ROAD_W)  # stored as an index
GREEN = {'park': 0, 'recreation_ground': 0, 'garden': 0, 'grass': 1, 'village_green': 1, 'meadow': 1, 'golf_course': 2,
         'pitch': 3, 'stadium': 3, 'track': 3, 'cemetery': 4, 'grave_yard': 4, 'forest': 5, 'wood': 5, 'nature_reserve': 5,
         'zoo': 0, 'playground': 0}


def project(lat, lon, c):
    return ((lon - c['lon']) * 111320 * math.cos(math.radians(c['lat'])), -(lat - c['lat']) * 110574)


def simplify(pts, eps):
    """Douglas-Peucker on a list of (x, z)."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz) or 1e-9
    i, dmax = 0, -1
    for k in range(1, len(pts) - 1):
        d = abs((pts[k][0] - a[0]) * dz - (pts[k][1] - a[1]) * dx) / L
        if d > dmax:
            i, dmax = k, d
    if dmax <= eps:
        return [a, b]
    return simplify(pts[:i + 1], eps)[:-1] + simplify(pts[i:], eps)


def area(ring):
    return abs(sum(ring[i][0] * ring[i - 1][1] - ring[i - 1][0] * ring[i][1] for i in range(len(ring)))) / 2


def outer_rings(g):
    """The outer ring of each part of a Polygon or MultiPolygon (holes are left out: from the air a courtyard is roof)."""
    if g['type'] == 'Polygon':
        return [g['coordinates'][0]]
    if g['type'] == 'MultiPolygon':
        return [p[0] for p in g['coordinates']]
    return []


def lines(g):
    if g['type'] == 'LineString':
        return [g['coordinates']]
    if g['type'] == 'MultiLineString':
        return g['coordinates']
    return []


def geom(row):
    """DuckDB writes the GeoJSON as an object or as a string, depending on the version."""
    g = row['g']
    return json.loads(g) if isinstance(g, str) else g


def r1(v):
    return round(v, 1)


def fetch(theme, kind, cols, box, out):
    if os.path.exists(out):
        return
    s, w, n, e = box
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    print(f'  fetching {theme}/{kind} from Overture {RELEASE} ...', flush=True)
    con.execute(f"""COPY (SELECT {cols}, ST_AsGeoJSON(geometry) AS g
        FROM read_parquet('{OVERTURE}/theme={theme}/type={kind}/*')
        WHERE bbox.xmin < {e} AND bbox.xmax > {w} AND bbox.ymin < {n} AND bbox.ymax > {s}) TO '{out}' (FORMAT JSON)""")


def ghs_tiles(box):
    """GHS-BUILT-H tiles are 10 degrees square, R1 C1 at the top left (90 N, 180 W)."""
    s, w, n, e = box
    out = set()
    for lat in (s, n):
        for lon in (w, e):
            out.add((int((90 - lat) // 10) + 1, int((lon + 180) // 10) + 1))
    return sorted(out)


def heights_sampler(box, cache):
    srcs = []
    for r, c in ghs_tiles(box):
        name = f'GHS_BUILT_H_ANBH_E2018_GLOBE_R2023A_4326_3ss_V1_0_R{r}_C{c}'
        tif = os.path.join(cache, name + '.tif')
        if not os.path.exists(tif):
            z = os.path.join(cache, name + '.zip')
            print(f'  fetching GHS-BUILT-H tile R{r} C{c} ...', flush=True)
            urllib.request.urlretrieve(GHS + name + '.zip', z)
            with zipfile.ZipFile(z) as f:
                f.extract(name + '.tif', cache)
            os.remove(z)
        srcs.append(rasterio.open(tif))

    def at(lon, lat):
        for s in srcs:
            b = s.bounds
            if b.left <= lon < b.right and b.bottom < lat <= b.top:
                v = next(s.sample([(lon, lat)]))[0]
                return float(v) if v > 0 else 0.0
        return 0.0
    return at


def unit(seed):
    """A steady number in [0, 1) from a building's id: the same building is the same height every bake."""
    return int(hashlib.md5(seed.encode()).hexdigest()[:8], 16) / 2 ** 32


def height_of(b, base, foot):
    if b.get('height') and 2 < b['height'] < 400:
        return b['height'], 1
    if b.get('num_floors') and 0 < b['num_floors'] < 120:
        return b['num_floors'] * 3.3 + 1.2, 1
    if base <= 0:
        base = 4.0
    u, v = unit(b['id']), unit(b['id'] + 'v')
    # a bigger footprint carries a taller building, up to a point; a shack is a shack
    size = min(1.8, max(0.35, math.sqrt(foot) / 13))
    # spread round the area's average, skewed so a few stand well above it (the way real skylines are)
    spread = math.exp(0.42 * math.sqrt(-2 * math.log(max(u, 1e-6))) * math.cos(2 * math.pi * v))
    h = base * size * spread
    if foot < 45:
        h = min(h, 4.5)
    if b.get('class') in ('house', 'detached', 'residential', 'semidetached_house', 'bungalow', 'hut', 'shed', 'garage', 'roof'):
        h = min(h, 10)
    return max(3.0, min(h, max(base * 3.2, 12))), 0


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    key = sys.argv[1].strip('/')
    city = json.load(open(os.path.join(REPO, 'cities', key, 'city.json')))
    grid = city.get('grid') or sys.exit(f'cities/{key}/city.json has no "grid" box')
    box = (grid['south'], grid['west'], grid['north'], grid['east'])
    c = {'lat': city['lat'], 'lon': city['lon']}
    slug = key.split('/')[-1]
    cache = os.path.join(GAME, '.cache', 'grid', slug)
    os.makedirs(cache, exist_ok=True)
    print(f'Baking {city["name"]}: {box}')

    fetch('buildings', 'building', 'id, height, num_floors, class', box, os.path.join(cache, 'buildings.json'))
    fetch('transportation', 'segment', 'id, subtype, class, names.primary AS name', box, os.path.join(cache, 'roads.json'))
    fetch('base', 'land_use', 'id, subtype, class', box, os.path.join(cache, 'landuse.json'))
    fetch('base', 'water', 'id, subtype, class', box, os.path.join(cache, 'water.json'))
    hat = heights_sampler(box, cache)

    tiles = {}

    def tile_of(x, z):
        k = (math.floor(x / TILE), math.floor(z / TILE))
        if k not in tiles:
            tiles[k] = {'b': [], 'r': [], 'g': [], 'w': [], 'wl': [], 'rl': []}
        return tiles[k]

    def ring_xz(ring, eps):
        pts = [project(lat, lon, c) for lon, lat in ring]
        if len(pts) > 2 and pts[0] == pts[-1]:
            pts = pts[:-1]
        if len(pts) > 4:
            pts = simplify(pts + [pts[0]], eps)[:-1]
        return pts

    def flat(pts):
        return [r1(v) for p in pts for v in p]

    nb = measured = 0
    for line in open(os.path.join(cache, 'buildings.json')):
        b = json.loads(line)
        g = geom(b)
        for ring in outer_rings(g):
            pts = ring_xz(ring, 0.35)
            if len(pts) < 3:
                continue
            foot = area(pts)
            if foot < 12:
                continue
            cx = sum(p[0] for p in pts) / len(pts)
            cz = sum(p[1] for p in pts) / len(pts)
            lon = c['lon'] + cx / (111320 * math.cos(math.radians(c['lat'])))
            lat = c['lat'] - cz / 110574
            h, real = height_of(b, hat(lon, lat), foot)
            measured += real
            tile_of(cx, cz)['b'].append([r1(h)] + flat(pts))
            nb += 1

    nr = 0
    for line in open(os.path.join(cache, 'roads.json')):
        r = json.loads(line)
        g = geom(r)
        for ln in lines(g):
            pts = ring_xz(ln, 0.6) if len(ln) > 2 else [project(lat, lon, c) for lon, lat in ln]
            if len(pts) < 2:
                continue
            mx, mz = pts[len(pts) // 2]
            if r['subtype'] == 'rail':
                if r['class'] in ('standard_gauge', 'narrow_gauge', 'light_rail', 'subway', 'tram'):
                    tile_of(mx, mz)['rl'].append(flat(pts))
                continue
            if r['subtype'] != 'road' or r['class'] not in ROAD_W:
                continue
            tile_of(mx, mz)['r'].append([ROAD_K.index(r['class'])] + flat(pts))
            nr += 1

    ng = 0
    for line in open(os.path.join(cache, 'landuse.json')):
        u = json.loads(line)
        k = GREEN.get(u['class'], GREEN.get(u['subtype']))
        if k is None:
            continue
        for ring in outer_rings(geom(u)):
            pts = ring_xz(ring, 1.0)
            if len(pts) < 3 or area(pts) < 150:
                continue
            cx = sum(p[0] for p in pts) / len(pts)
            cz = sum(p[1] for p in pts) / len(pts)
            tile_of(cx, cz)['g'].append([k] + flat(pts))
            ng += 1

    nw = 0
    for line in open(os.path.join(cache, 'water.json')):
        u = json.loads(line)
        g = geom(u)
        for ring in outer_rings(g):
            pts = ring_xz(ring, 0.8)
            if len(pts) < 3 or area(pts) < 40:
                continue
            cx = sum(p[0] for p in pts) / len(pts)
            cz = sum(p[1] for p in pts) / len(pts)
            tile_of(cx, cz)['w'].append(flat(pts))
            nw += 1
        if u['class'] in ('river', 'stream', 'canal', 'drain', 'ditch'):
            for ln in lines(g):
                pts = ring_xz(ln, 0.8) if len(ln) > 2 else [project(lat, lon, c) for lon, lat in ln]
                if len(pts) >= 2:
                    mx, mz = pts[len(pts) // 2]
                    tile_of(mx, mz)['wl'].append([3 if u['class'] == 'river' else 1.5] + flat(pts))
                    nw += 1

    out = os.path.join(GAME, 'public', 'grid', slug)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        if f.endswith('.json'):
            os.remove(os.path.join(out, f))
    index = []
    for (i, j), t in sorted(tiles.items()):
        t = {k: v for k, v in t.items() if v}
        json.dump(t, open(os.path.join(out, f'{i}_{j}.json'), 'w'), separators=(',', ':'))
        index.append([i, j, len(t.get('b', [])), max([b[0] for b in t.get('b', [])] or [0])])
    json.dump({
        'version': 1, 'city': city['name'], 'center': c, 'tile': TILE, 'box': grid, 'roads': ROAD_K,
        'tiles': index,
        'sources': f'Overture Maps {RELEASE} (OpenStreetMap contributors, Google Open Buildings, Microsoft; ODbL); '
                   'heights partly GHS-BUILT-H 2018, European Commission JRC (CC BY 4.0)',
    }, open(os.path.join(out, 'index.json'), 'w'), separators=(',', ':'))
    size = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
    print(f'{nb} buildings ({measured} with a mapped height), {nr} roads, {ng} parks, {nw} water; '
          f'{len(index)} tiles, {size / 1e6:.1f} MB -> {os.path.relpath(out, REPO)}')


if __name__ == '__main__':
    main()
