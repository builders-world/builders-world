#!/usr/bin/env python3
"""Bake a city's real hills into public/city/<slug>/hills.json (Elvis, 13 October 2026: "So go ahead and build hills").

For every site in the city's city.json "hills" list ({name, lat, lon, km, biome}) this reads:
  - the ground's height from the Terrain Tiles on AWS Open Data (Mapzen/Tilezen terrarium PNGs, SRTM and others,
    free and public; https://registry.opendata.aws/terrain-tiles/),
  - the footpaths, tracks, named peaks and forests from OpenStreetMap (Overpass API, ODbL),
and writes a height grid relative to the foot of the hills (tapered to nothing at the edge of the site, so the hills
rise out of the open country round the city), the trails, the peaks, a forest mask, and two routes worked out over the
real ground: a hike from the trailhead (the side facing the city) to the highest summit, and a mountain bike line down
from the summit, both following the mapped paths where they go the right way.

Positions are in the bake's frame (bake.mjs: x east, z south, metres from the city's lat/lon).
    pip install pillow numpy
    python3 scripts/city/hills.py <country>/<city>        e.g. kenya/nairobi
"""
import base64, heapq, io, json, math, os, sys, urllib.parse, urllib.request
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
Z, N = 13, 161  # terrain tile zoom (about 19 m a pixel at the equator); samples a side
CACHE = os.path.join(os.path.expanduser('~'), '.cache', 'bw-terrain')

def tile(x, y):
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, f'{Z}_{x}_{y}.png')
    if not os.path.exists(f):
        urllib.request.urlretrieve(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', f)
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float64)
    return a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768

def txy(lat, lon):
    n = 2 ** Z
    return (lon + 180) / 360 * n, (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n

def elevation_grid(s, w, n_, e):
    x0, y0 = txy(n_, w); x1, y1 = txy(s, e)
    tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
    E = np.vstack([np.hstack([tile(tx, ty) for tx in range(tx0, tx1 + 1)]) for ty in range(ty0, ty1 + 1)])
    E = np.maximum(E, 0)
    def at(lat, lon):  # bilinear
        fx, fy = txy(lat, lon); px, py = (fx - tx0) * 256 - 0.5, (fy - ty0) * 256 - 0.5
        i, j = int(math.floor(py)), int(math.floor(px)); a, b = py - i, px - j
        i = max(0, min(E.shape[0] - 2, i)); j = max(0, min(E.shape[1] - 2, j))
        return (E[i, j] * (1 - a) * (1 - b) + E[i, j + 1] * (1 - a) * b + E[i + 1, j] * a * (1 - b) + E[i + 1, j + 1] * a * b)
    return at

def overpass(s, w, n_, e):
    q = f'[out:json][timeout:90];(way["highway"~"^(path|footway|track|bridleway|steps)$"]({s},{w},{n_},{e});node["natural"="peak"]({s},{w},{n_},{e});way["landuse"="forest"]({s},{w},{n_},{e});way["natural"="wood"]({s},{w},{n_},{e}););out geom;'
    import time, hashlib
    cache = os.path.join(CACHE, 'osm-' + hashlib.sha1(q.encode()).hexdigest()[:16] + '.json')
    if os.path.exists(cache): return json.load(open(cache))
    for k, url in enumerate(['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']):
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'builders-world-bake/1 (github.com/builders-world)'})
            els = json.load(urllib.request.urlopen(req, timeout=180))['elements']
            json.dump(els, open(cache, 'w')); return els
        except Exception as err:  # the public servers are busy at times: another, after a pause
            print('overpass', url, err); time.sleep(10 * (k + 1))
    raise SystemExit('Overpass did not answer')

def simplify(pts, tol):  # Douglas-Peucker
    if len(pts) < 3: return pts
    a, b = np.array(pts[0]), np.array(pts[-1]); d = b - a; L = np.hypot(*d) or 1
    dist = [abs(d[0] * (p[1] - a[1]) - d[1] * (p[0] - a[0])) / L for p in pts[1:-1]]
    k = int(np.argmax(dist)) + 1
    if dist[k - 1] > tol: return simplify(pts[:k + 1], tol)[:-1] + simplify(pts[k:], tol)
    return [pts[0], pts[-1]]

def bake_site(site, C0, KX, KZ):
    km = site.get('km', 10); half = km * 500
    cx, cz = (site['lon'] - C0['lon']) * KX, -(site['lat'] - C0['lat']) * KZ
    dlat, dlon = half / KZ, half / KX
    s, n_, w, e = site['lat'] - dlat, site['lat'] + dlat, site['lon'] - dlon, site['lon'] + dlon
    at = elevation_grid(s - 0.01, w - 0.01, n_ + 0.01, e + 0.01)
    step = km * 1000 / (N - 1)
    # the grid: row r from north (z = -half) to south, column c from west to east, in metres relative to the site's centre
    lat_of = lambda z: site['lat'] - z / KZ
    lon_of = lambda x: site['lon'] + x / KX
    G = np.array([[at(lat_of(-half + r * step), lon_of(-half + c * step)) for c in range(N)] for r in range(N)])
    # the foot of the hills: low along the edge; the hills rise from it, and the edge fades out to the plain
    edge = np.concatenate([G[0], G[-1], G[:, 0], G[:, -1]]); base = float(np.percentile(edge, 20))
    H = np.maximum(G - base, 0)
    rr, cc = np.mgrid[0:N, 0:N]; t = np.minimum(np.minimum(rr, N - 1 - rr), np.minimum(cc, N - 1 - cc)) / (N * 0.16)
    fade = np.clip(t, 0, 1); fade = fade * fade * (3 - 2 * fade)
    H = H * fade
    # OpenStreetMap: paths, peaks, forests
    els = overpass(s, w, n_, e)
    P = lambda lat, lon: ((lon - site['lon']) * KX, -(lat - site['lat']) * KZ)
    inside = lambda x, z: abs(x) < half * 0.9 and abs(z) < half * 0.9
    trails, peaks, forests = [], [], []
    for el in els:
        tg = el.get('tags', {})
        if el['type'] == 'node' and tg.get('natural') == 'peak':
            x, z = P(el['lat'], el['lon'])
            if inside(x, z): peaks.append([tg.get('name') or tg.get('name:en') or '', round(x), round(z)])
        elif el['type'] == 'way' and 'geometry' in el:
            pts = [P(g['lat'], g['lon']) for g in el['geometry']]
            if tg.get('landuse') == 'forest' or tg.get('natural') == 'wood': forests.append(pts)
            elif 'highway' in tg:
                pts = [p for p in pts if inside(*p)]
                if len(pts) >= 2: trails.append([tg['highway'], tg.get('name', ''), simplify([[round(x, 1), round(z, 1)] for x, z in pts], 4)])
    # keep the longest paths (the file stays small), named ones first
    length = lambda tr: sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(tr[2], tr[2][1:]))
    trails.sort(key=lambda tr: (not tr[1], -length(tr))); trails = [tr for tr in trails if length(tr) > 150][:60]
    # a forest mask on the same grid
    F = np.zeros((N, N), dtype=np.uint8)
    for poly in forests:
        if len(poly) < 3: continue
        from PIL import ImageDraw
        im = Image.new('L', (N, N), 0)
        ImageDraw.Draw(im).polygon([((x + half) / step, (z + half) / step) for x, z in poly], fill=1)
        F |= np.asarray(im, dtype=np.uint8)
    # the routes, over the real ground: cost is distance, steepness (squared, so it zigzags up a slope) and leaving the
    # mapped paths; the hike goes from the city side of the site up to the highest point, the bike line back down
    on = np.zeros((N, N), dtype=bool)
    for _, _, pts in trails:
        for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
            k = max(1, int(math.hypot(x1 - x0, z1 - z0) / (step * 0.5)))
            for i in range(k + 1):
                r = int(round((z0 + (z1 - z0) * i / k + half) / step)); c = int(round((x0 + (x1 - x0) * i / k + half) / step))
                if 0 <= r < N and 0 <= c < N: on[r, c] = True
    def route(a, b, path_bonus, max_grade):
        dist = {a: 0.0}; prev = {}; pq = [(0.0, a)]
        while pq:
            d, u = heapq.heappop(pq)
            if u == b: break
            if d > dist.get(u, 1e18): continue
            r, c = u
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if not dr and not dc: continue
                    v = (r + dr, c + dc)
                    if not (2 <= v[0] < N - 2 and 2 <= v[1] < N - 2): continue
                    run = step * math.hypot(dr, dc); grade = abs(H[v] - H[u]) / run
                    cost = run * (1 + (grade / max_grade) ** 2 * 3) * (path_bonus if on[v] else 1)
                    nd = d + cost
                    if nd < dist.get(v, 1e18): dist[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
        out = [b]
        while out[-1] != a and out[-1] in prev: out.append(prev[out[-1]])
        return out[::-1]
    m8 = N // 8; top = np.unravel_index(np.argmax(H[m8:N - m8, m8:N - m8]), (N - 2 * m8, N - 2 * m8)); top = (int(top[0]) + m8, int(top[1]) + m8)
    # the trailhead: the gate on the city's side of the summit, 2.2 to 3.6 km from it (a walk of an hour or two, as the
    # real ones are), on the lowest ground there, near a mapped path if it can
    to_city = np.array([-cx - (top[1] * step - half), -cz - (top[0] * step - half)]); to_city = to_city / (np.linalg.norm(to_city) or 1)
    best = None
    tx_, tz_ = -half + top[1] * step, -half + top[0] * step
    for r in range(N // 10, N - N // 10):
        for c in range(N // 10, N - N // 10):
            x, z = -half + c * step, -half + r * step; dd = math.hypot(x - tx_, z - tz_)
            if not (2200 < dd < 3600): continue
            facing = ((x - tx_) * to_city[0] + (z - tz_) * to_city[1]) / dd
            score = H[r, c] - facing * 120 + (0 if on[r, c] else 25)
            if facing > 0 and (best is None or score < best[0]): best = (score, (r, c))
    start = best[1] if best else (N - N // 5, N // 2)
    hike = route(start, top, 0.6, 0.32)
    bike = route(top, start, 0.85, 0.24)
    # no hairpins that double back (a path that loops round costs less than the grass, but no one rides it like that)
    def unkink(pts):
        out = list(pts); changed = True
        while changed:
            changed = False
            for i in range(1, len(out) - 1):
                a, b, c = out[i - 1], out[i], out[i + 1]
                v1, v2 = (b[0] - a[0], b[1] - a[1]), (c[0] - b[0], c[1] - b[1])
                n1, n2 = math.hypot(*v1) or 1, math.hypot(*v2) or 1
                if (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2) < -0.5: del out[i]; changed = True; break
        return out
    xy = lambda rc: [round(-half + rc[1] * step), round(-half + rc[0] * step)]
    # name the summit after the nearest mapped peak, if there is one close
    tx, tz = xy(top); near = sorted(peaks, key=lambda p: math.hypot(p[1] - tx, p[2] - tz))
    summit = near[0][0] if near and near[0][0] and math.hypot(near[0][1] - tx, near[0][2] - tz) < 600 else ''
    hq = np.round(H * 10).astype('<i2')
    return {
        'name': site['name'], 'x': round(cx), 'z': round(cz), 'size': km * 1000, 'n': N, 'base': round(base), 'biome': site.get('biome', 'grass'),
        'h': base64.b64encode(hq.tobytes()).decode(), 'forest': base64.b64encode(np.packbits(F.ravel()).tobytes()).decode(),
        'peaks': peaks, 'trails': trails, 'start': xy(start), 'top': xy(top), 'summit': summit or site.get('summit', site['name']),
        'hike': unkink(simplify([xy(p) for p in hike], 6)), 'bike': unkink(simplify([xy(p) for p in bike], 6)),
        'relief': round(float(H.max())), 'top_m': round(float(H.max()) + base), 'features': site.get('features', []),
    }

def main():
    key = sys.argv[1]
    cdir = os.path.join(ROOT, 'cities', key); city = json.load(open(os.path.join(cdir, 'city.json')))
    slug = key.split('/')[-1]
    C0 = {'lat': city['lat'], 'lon': city['lon']}; KX = 111320 * math.cos(math.radians(C0['lat'])); KZ = 110574
    sites = [bake_site(s, C0, KX, KZ) for s in city.get('hills', [])]
    out = os.path.join(ROOT, 'apps', 'game', 'public', 'city', slug, 'hills.json')
    json.dump({'v': 1, 'city': city['name'], 'sites': sites,
               'source': 'Heights: Terrain Tiles on AWS Open Data (Mapzen/Tilezen; SRTM, NASA). Paths, peaks, forests: OpenStreetMap contributors (ODbL).'},
              open(out, 'w'), separators=(',', ':'))
    for s in sites: print(f"{s['name']}: {s['relief']} m of hills above {s['base']} m (top {s['top_m']} m, {s['summit']}), {len(s['trails'])} paths, {len(s['peaks'])} peaks, hike {len(s['hike'])} pts, bike {len(s['bike'])} pts")
    print(out, os.path.getsize(out) // 1024, 'KB')

if __name__ == '__main__':
    main()
