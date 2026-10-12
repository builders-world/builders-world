// The city knowledge base (cities/KNOWLEDGE.md): every country's and city's knowledge.json has the shape the game
// reads, its city's street languages are ones it defines, nothing has an em dash, and names come out of the right place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { setKnowledge, nameFor, registerFor, line, phrase, titled } from '../src/look/knowledge.js';

const ROOT = new URL('../../../cities/', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, ROOT), 'utf8'));
const dirs = (p) => readdirSync(new URL(p, ROOT)).filter((d) => statSync(new URL(`${p}${d}`, ROOT)).isDirectory());
const has = (p) => existsSync(new URL(p, ROOT));
const strings = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (o && typeof o === 'object') Object.values(o).forEach((v) => strings(v, out)); return out; };

const countries = dirs('').filter((k) => has(`${k}/knowledge.json`));

test('the live countries and cities all have a knowledge base', () => {
  for (const p of ['nigeria', 'nigeria/lagos', 'nigeria/abuja', 'nigeria/port-harcourt', 'nigeria/uyo', 'kenya', 'kenya/nairobi', 'ghana', 'ghana/accra']) assert.ok(has(`${p}/knowledge.json`), `${p}/knowledge.json`);
});

test('every country knowledge.json has languages, name groups and phrases', () => {
  for (const k of countries) {
    const c = read(`${k}/knowledge.json`), N = c.names;
    assert.ok(c.languages?.length, `${k}: languages`);
    assert.ok(N?.groups && Object.keys(N.groups).length, `${k}: names.groups`);
    for (const [g, G] of Object.entries(N.groups)) {
      assert.ok((G.given?.m?.length || 0) + (G.also?.m?.length || 0) >= 6 && (G.given?.f?.length || 0) + (G.also?.f?.length || 0) >= 6, `${k}/${g}: at least 6 names each for men and women`);
      assert.ok(G.family?.length >= 6, `${k}/${g}: at least 6 family names`);
    }
    for (const g of Object.keys(N.weights || {})) assert.ok(N.groups[g], `${k}: weights name a group that does not exist: ${g}`);
    assert.ok(c.phrases && Object.keys(c.phrases).length, `${k}: phrases`);
    for (const [lang, P] of Object.entries(c.phrases)) for (const [key, list] of Object.entries(P)) assert.ok(Array.isArray(list) && list.every((x) => Array.isArray(x) && x.length === 2), `${k}: phrases.${lang}.${key} is a list of [phrase, English]`);
    assert.ok(!strings(c).some((s) => s.includes('—')), `${k}: no em dashes`);
  }
});

test('every city knowledge.json speaks languages its country or city defines', () => {
  for (const k of countries) for (const c of dirs(`${k}/`)) {
    if (!has(`${k}/${c}/knowledge.json`)) continue;
    const C = read(`${k}/${c}/knowledge.json`), country = read(`${k}/knowledge.json`);
    const known = new Set(['en', ...country.languages.map((l) => l.code), ...Object.keys(C.registers || {})]);
    assert.ok(C.street && Object.keys(C.street).length, `${k}/${c}: street`);
    for (const r of Object.keys(C.street)) assert.ok(known.has(r), `${k}/${c}: street register "${r}" is not a language of ${k} nor a city register`);
    for (const r of Object.keys(C.chat || {})) assert.ok(known.has(r), `${k}/${c}: chat register "${r}" is not defined`);
    assert.ok(C.chat?.en?.greet?.length >= 3, `${k}/${c}: English greetings`);
    for (const g of Object.keys(C.names?.weights || {})) assert.ok(country.names.groups[g], `${k}/${c}: name weight for an unknown group "${g}"`);
    assert.ok(!strings(C).some((s) => s.includes('—')), `${k}/${c}: no em dashes`);
  }
});

test('Nairobi: Kenyan names, and no Pidgin on its streets', () => {
  setKnowledge(read('kenya/knowledge.json'), read('kenya/nairobi/knowledge.json'), 'Nairobi');
  const all = new Set(Object.values(read('kenya/knowledge.json').names.groups).flatMap((G) => [...(G.given?.m || []), ...(G.given?.f || []), ...(G.also?.m || []), ...(G.also?.f || [])]));
  for (let i = 0; i < 40; i++) { const n = nameFor(`t${i}`); assert.ok(all.has(n.first), `${n.full} is not a Kenyan first name here`); }
  assert.equal(nameFor('same').full, nameFor('same').full, 'the same seed gives the same name');
  const regs = new Set(Array.from({ length: 200 }, (_, i) => registerFor(2, `p${i}`)));
  assert.ok(!regs.has('pcm') && (regs.has('sheng') || regs.has('sw')), `Nairobi speaks ${[...regs]}`);
  assert.ok(line('greet', 'sheng', 0.1));
  assert.ok(phrase('thanks', 'sw', 0)[0] === 'Asante');
});

test('Lagos: Pidgin and Yoruba on the street; the well-off lean to English', () => {
  setKnowledge(read('nigeria/knowledge.json'), read('nigeria/lagos/knowledge.json'), 'Lagos');
  const rich = Array.from({ length: 300 }, (_, i) => registerFor(0, `r${i}`)).filter((r) => r === 'en').length;
  const poor = Array.from({ length: 300 }, (_, i) => registerFor(2, `r${i}`)).filter((r) => r === 'en').length;
  assert.ok(rich > poor, 'tier 0 speaks more English than tier 2');
  assert.ok(Array.from({ length: 200 }, (_, i) => registerFor(1, `m${i}`)).includes('pcm'));
});

test('names follow each place\'s own rules: family name first, women\'s forms, titles after the name', () => {
  const groupOf = (c, g) => read(`${c}/knowledge.json`).names.groups[g];
  if (has('japan/knowledge.json')) {
    setKnowledge(read('japan/knowledge.json'), {}, 'Tokyo');
    const n = nameFor('jp', 'm'); assert.ok(n.full.startsWith(n.family), `Japanese names put the family first: ${n.full}`);
    assert.equal(titled('elder_m', n), `${n.family}-san`);
  }
  if (has('singapore/knowledge.json')) {
    setKnowledge(read('singapore/knowledge.json'), { names: { weights: { chinese: 1 } } }, 'Singapore');
    const n = nameFor('sg', 'f'); assert.ok(n.full.startsWith(n.family), `Chinese Singaporean names put the family first: ${n.full}`);
  }
  if (has('kazakhstan/knowledge.json')) {
    setKnowledge(read('kazakhstan/knowledge.json'), { names: { weights: { kazakh: 1 } } }, 'Almaty');
    const f = groupOf('kazakhstan', 'kazakh').family_f;
    for (let i = 0; i < 20; i++) assert.ok(f.includes(nameFor(`kz${i}`, 'f').family), 'Kazakh women carry the women\'s form of the family name');
  }
  if (has('mexico/knowledge.json')) {
    setKnowledge(read('mexico/knowledge.json'), read('mexico/mexico-city/knowledge.json'), 'Mexico City');
    const n = nameFor('mx', 'f'); assert.equal(n.full.split(' ').length >= 3, true, `Mexicans carry two family names: ${n.full}`); assert.notEqual(n.family, n.second);
  }
  if (has('germany/knowledge.json')) { setKnowledge(read('germany/knowledge.json'), {}, 'Berlin'); const n = nameFor('de', 'm'); assert.equal(titled('elder_m', n), `Herr ${n.family}`); }
  setKnowledge(read('kenya/knowledge.json'), read('kenya/nairobi/knowledge.json'), 'Nairobi');
  const n = nameFor('ke', 'm'); assert.equal(titled('elder_m', n), `Mzee ${n.first}`);
});
