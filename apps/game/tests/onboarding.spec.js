import { test, expect } from '@playwright/test';

// A stand-in for the game's server and for GitHub: signing in sends the browser straight back with a session, and the server then knows
// who it is. Nothing leaves the machine.
const TOKEN = 'a'.repeat(64);
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const signedIn = route.request().headers().authorization === `Bearer ${TOKEN}`;
    if (url.pathname === '/api/auth/github') return route.fulfill({ status: 302, headers: { location: `/#bw-session=${TOKEN}` } });
    if (url.pathname === '/api/me') return signedIn
      ? route.fulfill({ json: { account: { id: 'u' + 'b'.repeat(32), login: 'elvis-obi', name: 'Elvis Obi' }, profile: null } })
      : route.fulfill({ status: 401, json: { error: 'session_invalid' } });
    if (url.pathname === '/api/me/profile') return route.fulfill({ json: {} });
    return route.fulfill({ json: { offline: true, players: [], bins: [] } });
  });
});

async function checkIn(page, role = 'developer', start = '/') {
  await page.goto(start);
  await page.getByRole('button', { name: 'Walk to arrivals' }).click();
  await expect(page.getByRole('button', { name: 'Continue', exact: false })).toBeDisabled();
  await page.getByLabel('Your name', { exact: true }).fill('Elvis Obi');
  await page.locator(`[data-role="${role}"]`).click();
  await page.getByRole('button', { name: 'Continue', exact: false }).click();
  const signIn = page.getByRole('button', { name: 'Sign in with GitHub' });
  if (await signIn.isVisible()) await signIn.click(); // already signed in when a test arrives with a session
  await expect(page.getByText('Signed in as @elvis-obi')).toBeVisible();
  await page.getByRole('button', { name: 'Choose your destination' }).click();
}
async function board(page, city = 'Lagos') {
  await page.locator(`[data-city="${city}"]`).click();
  await expect(page.getByRole('button', { name: 'Board your flight' })).toBeDisabled();
  await page.locator('[data-action="district"]').click();
  await page.getByRole('button', { name: 'Board your flight' }).click();
}
async function capture(page, name, project) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `artifacts/${name}-${project}.png` });
}

test('complete arrival, simultaneous film/avatar, saved profile, and Yaba handoff', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to Builders World.' })).toBeVisible();
  await capture(page, '01-terminal', testInfo.project.name);
  if (testInfo.project.name === 'desktop') {
    const before = await page.evaluate(() => window.__arrivals.diagnostics.cameraPosition[2]);
    await page.keyboard.down('w'); await page.waitForTimeout(300); await page.keyboard.up('w');
    const after = await page.evaluate(() => window.__arrivals.diagnostics.cameraPosition[2]);
    expect(after).toBeLessThan(before);
  }
  await checkIn(page);
  await capture(page, '02-destinations', testInfo.project.name);
  await board(page);
  await page.getByRole('button', { name: 'Pause intro', exact: true }).click();
  const paused = await page.evaluate(() => window.__arrivals.film.time);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__arrivals.film.time)).toBe(paused);
  await page.getByRole('button', { name: 'Hoodie', exact: true }).click();
  await page.getByRole('button', { name: 'Blue outfit', exact: true }).click();
  expect(await page.evaluate(() => window.__arrivals.profile.avatar)).toEqual({ color: '#7088aa', style: 'hoodie' });
  await capture(page, '03-flight-avatar', testInfo.project.name);
  await page.getByRole('button', { name: 'Play intro', exact: true }).click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__arrivals.film.time)).toBeGreaterThan(paused);
  await page.getByRole('button', { name: 'Next chapter' }).click();
  await expect(page.locator('#film-title')).toHaveText('Find your people');
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('#film-title')).toHaveText('A place for your work');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hoodie', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Ready to land' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome home, Elvis Obi.' })).toBeVisible();
  await capture(page, '04-home', testInfo.project.name);
  expect(await page.evaluate(() => window.__arrivals.diagnostics.calls)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Enter Yaba' }).click();
  await expect(page).toHaveURL(/world=1&resident=1/);
  await page.waitForFunction(() => window.__bw?.ready);
  expect(await page.evaluate(() => window.__bw.world.plots.find(p => p.b.id === 'you').b.name)).toBe('Elvis Obi');
  expect(await page.evaluate(() => window.__bw.world.plots.find(p => p.b.id === 'you').b.verified)).toEqual([]);
  await capture(page, '05-yaba', testInfo.project.name);
  await page.getByRole('link', { name: 'Your arrival / edit avatar' }).click();
  await page.getByRole('button', { name: 'Edit your avatar' }).click();
  await page.getByRole('button', { name: 'Sage outfit' }).click();
  await expect(page.getByRole('button', { name: 'Sage outfit' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Restart journey' }).click();
  await page.getByRole('button', { name: 'Start again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Builders World.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('designer route, city changes, and honest previews for every destination', async ({ page }) => {
  await checkIn(page, 'designer');
  for (const city of ['Abuja', 'Uyo', 'Port Harcourt']) {
    await board(page, city);
    await page.getByRole('button', { name: 'Ready to land' }).click();
    await expect(page.locator('.home-pass')).toContainText(city);
    await expect(page.getByRole('button', { name: 'Enter Yaba' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Explore your home preview' }).click();
    await expect(page.getByRole('dialog')).toContainText(`an explorable ${city} world are coming later`);
    await page.getByRole('button', { name: 'Back to your home', exact: true }).click();
    await page.getByRole('button', { name: 'Change destination' }).click();
  }
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.locator('[data-role="developer"]').click();
  await page.getByRole('button', { name: 'Continue', exact: false }).click();
  // changing role does not sign you out: who you are on GitHub has nothing to do with what you make
  await expect(page.getByRole('button', { name: 'Choose your destination' })).toBeVisible();
  expect(await page.evaluate(() => window.__arrivals.profile.connection)).toEqual({ mode: 'github', provider: 'GitHub' });
});

test('reduced motion, malformed storage, and no false country detection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // corrupt on the first load only: signing in sends the browser away and back, and that return must not wipe the progress again
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('bw-arrivals-v1', '{corrupt'); } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nigeria' }).click();
  await expect(page.getByRole('dialog')).toContainText('Your location has not been detected or requested');
  await page.getByRole('button', { name: 'Continue in Nigeria' }).click();
  await checkIn(page);
  await board(page);
  await expect(page.getByRole('button', { name: 'Play intro', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__arrivals.film.time)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('blocked persistence never hands the user a different resident identity', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Test: storage blocked'); }; });
  // with storage blocked nothing survives the trip to GitHub and back, so arrive already signed in (the session lives in memory)
  await checkIn(page, 'developer', `/#bw-session=${TOKEN}`); await board(page);
  await page.getByRole('button', { name: 'Ready to land' }).click();
  await page.getByRole('button', { name: 'Enter Yaba' }).click();
  await expect(page.locator('#arrival-toast')).toContainText('Allow site storage');
  await expect(page).not.toHaveURL(/world=1/);
  await expect(page.getByRole('heading', { name: 'Welcome home, Elvis Obi.' })).toBeVisible();
});
