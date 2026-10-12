// The cities/ folder at the top of the repository: one folder per country, one per city inside it. These checks
// are what a contributor adding a city has to pass (cities/README.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { REGIONS } from '../src/look/areas.js';

const ROOT = new URL('../../../cities/', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, ROOT), 'utf8'));
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const dirs = (p) => readdirSync(new URL(p, ROOT)).filter((d) => statSync(new URL(`${p}${d}`, ROOT)).isDirectory());
const WORLD = new Set(JSON.parse(readFileSync(new URL('../src/look/world.json', import.meta.url), 'utf8')).map((c) => c.name));
const countries = dirs('');
const cities = countries.flatMap((k) => dirs(`${k}/`).map((c) => ({ k, c, rec: read(`${k}/${c}/city.json`) })));

test('every country folder has a valid country.json', () => {
  assert.ok(countries.length >= 50);
  for (const k of countries) {
    assert.match(k, SLUG, `${k}: folder names are lower case with hyphens`);
    const c = read(`${k}/country.json`);
    for (const f of ['name', 'region', 'drive', 'currency']) assert.ok(c[f], `${k}: country.json needs "${f}"`);
    assert.ok(['left', 'right'].includes(c.drive), `${k}: drive is "left" or "right"`);
    assert.match(c.currency, /^[A-Z]{3}$/, `${k}: currency is an ISO 4217 code`);
    if (c.mapName) assert.ok(WORLD.has(c.mapName), `${k}: mapName "${c.mapName}" is not a country on the world map`);
    assert.ok(dirs(`${k}/`).length >= 1, `${k}: a country needs at least one city`);
  }
});

test('every city folder has a valid city.json', () => {
  for (const { k, c, rec } of cities) {
    assert.match(c, SLUG, `${k}/${c}: folder names are lower case with hyphens`);
    assert.ok(rec.name && rec.tech, `${k}/${c}: city.json needs "name" and "tech"`);
    assert.ok(['live', 'planned'].includes(rec.status), `${k}/${c}: status is "live" or "planned"`);
    assert.ok(Math.abs(rec.lat) <= 90 && Math.abs(rec.lon) <= 180, `${k}/${c}: lat and lon are degrees`);
    assert.ok(!/—/.test(rec.tech), `${k}/${c}: no em dashes in the copy`);
  }
});

test('the live cities are exactly the cities the game can load', () => {
  const live = cities.filter(({ rec }) => rec.status === 'live');
  assert.deepEqual(live.map(({ rec }) => rec.key).sort(), Object.keys(REGIONS).sort());
  for (const { k, c, rec } of live) assert.ok(rec.state && rec.label, `${k}/${c}: a live city needs "state" and "label"`);
});

test('no stray files: only country.json, city folders and a README.md', () => {
  for (const k of countries) for (const f of readdirSync(new URL(`${k}/`, ROOT))) {
    if (statSync(new URL(`${k}/${f}`, ROOT)).isDirectory()) assert.ok(existsSync(new URL(`${k}/${f}/city.json`, ROOT)), `${k}/${f}: a city folder needs city.json`);
    else assert.ok(['country.json', 'README.md'].includes(f), `${k}/${f}: unexpected file`);
  }
});

test('a city with a "grid" box has its grid baked (scripts/grid/bake.py), every tile present', () => {
  for (const { k, c, rec } of cities.filter(({ rec }) => rec.grid)) {
    const g = rec.grid;
    assert.ok(g.south < g.north && g.west < g.east, `${k}/${c}: grid is {south, west, north, east}`);
    assert.ok(rec.lat > g.south && rec.lat < g.north && rec.lon > g.west && rec.lon < g.east, `${k}/${c}: the city's centre is inside its grid`);
    const dir = new URL(`../public/grid/${c}/`, import.meta.url);
    assert.ok(existsSync(new URL('index.json', dir)), `${k}/${c}: run python3 scripts/grid/bake.py ${k}/${c}`);
    const ix = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8'));
    assert.ok(ix.tiles.length > 0 && ix.sources);
    for (const [i, j] of ix.tiles) {
      const f = new URL(`${i}_${j}.json`, dir);
      assert.ok(existsSync(f), `${k}/${c}: tile ${i}_${j} is missing`);
      assert.ok(statSync(f).size < 400000, `${k}/${c}: tile ${i}_${j} is too big to stream`);
    }
  }
});
