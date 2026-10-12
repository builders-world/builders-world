import { test, expect } from '@playwright/test';

// Nothing stands on a railway (Elvis, 11 October 2026: "objects or infrastructure like this should not be on the train
// track because this is not how it would work in real life"). In every area with a line, every collider and every solid
// object or instance is measured against the track beds: none may stand within the corridor, apart from the railway's
// own things (its barriers, its station).
const AREAS = [['Yaba', '/?world=1&offline=1&hud=0&quality=low'], ['Old GRA', '/?world=1&offline=1&hud=0&quality=low&city=Port%20Harcourt']];
const CLEAR = 5.4; // world.js keeps 5.5 m either side of each line's centre; a tenth for the samples' rounding

for (const [name, url] of AREAS) {
  test(`nothing stands on the railway in ${name}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'the world is the same on every screen');
    test.setTimeout(120000);
    await page.route('**/api/**', (route) => route.fulfill({ json: { offline: true, players: [], bins: [] } }));
    await page.addInitScript(() => { localStorage.setItem('bw-guide-seen', '1'); localStorage.setItem('bw-help-seen', '1'); });
    await page.goto(url);
    await page.waitForFunction(() => window.__bw?.ready && window.__bw.look, null, { timeout: 100000 });
    const found = await page.evaluate((CLEAR) => {
      const B = window.__bw, W = B.world, segs = [];
      (W.rails || []).forEach((r) => { for (let k = 0; k < r.pts.length - 1; k++) segs.push([r.pts[k], r.pts[k + 1]]); });
      if (!segs.length) return { lines: 0, bad: [] };
      const dRail = (x, z) => Math.min(...segs.map(([a, c]) => { const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u); }));
      const inside = (x, z) => Math.hypot(x, z) < W.radius * 1.02;
      const bad = [];
      // colliders: signs, poles, posts, shelters, walls, stalls, buildings' kit
      for (const k of W.kitColliders || []) {
        if (/^(rail_barrier_post|station)$/.test(k.name || '') || !inside(k.cx, k.cz)) continue;
        const hx = k.hx || 0, hz = k.hz || 0, cs = Math.cos(k.ry || 0), sn = Math.sin(k.ry || 0);
        if (dRail(k.cx, k.cz) - Math.hypot(hx, hz) > CLEAR) continue;
        let d = Infinity; for (let u = -hx; u <= hx + 1e-6; u += Math.max(0.25, hx / 20)) for (let v = -hz; v <= hz + 1e-6; v += Math.max(0.25, hz / 20)) d = Math.min(d, dRail(k.cx + u * cs + v * sn, k.cz - u * sn + v * cs));
        if (d < CLEAR) bad.push(`${k.name || k.kind} at ${Math.round(k.cx)},${Math.round(k.cz)} (${d.toFixed(1)} m from a line)`);
      }
      // solid things with no collider (vehicles waiting, decor): each object, each instance, by its box
      const skip = /^(railway|ground|sky|weather|rain|clouds?|birds?|greenrey|traffic|trains?)$/i;
      B.scene.updateMatrixWorld(true);
      B.scene.traverse((o) => {
        if (!(o.isMesh || o.isInstancedMesh) || !o.geometry) return;
        for (let a = o; a; a = a.parent) if (!a.visible || skip.test(a.name || '') || a.userData?.isPlayer || a.userData?.npc) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const boxes = [];
        if (o.isInstancedMesh) { const m = o.matrixWorld.clone(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); boxes.push(o.geometry.boundingBox.clone().applyMatrix4(m).applyMatrix4(o.matrixWorld)); } }
        else boxes.push(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
        for (const bb of boxes) {
          const sx = bb.max.x - bb.min.x, sz = bb.max.z - bb.min.z, cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
          if (bb.max.y - bb.min.y < 0.3 || bb.max.y < 0.35 || Math.max(sx, sz) > 40 || !inside(cx, cz)) continue; // flat, or a wire across the district
          const d = dRail(cx, cz) - Math.min(sx, sz) / 2;
          if (d < 1.8) { const p = []; for (let a = o; a && a !== B.scene; a = a.parent) p.push(a.name || a.type); bad.push(`${p.slice(0, 3).join(' < ')} at ${Math.round(cx)},${Math.round(cz)} on the track`); }
        }
      });
      return { lines: segs.length, bad };
    }, CLEAR);
    expect(found.bad, `in ${name}`).toEqual([]);
  });
}
