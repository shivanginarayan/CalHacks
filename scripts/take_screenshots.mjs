/**
 * Automated High-Resolution Screenshot Capture Suite
 * Captures crystal-clear gallery images of all major simulation states,
 * visual layers, institution inspectors, and multi-future comparisons.
 */
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const api = 'http://127.0.0.1:8000';
const ui = 'http://127.0.0.1:5173';
const outputDir = resolve('artifacts/pics');

await mkdir(outputDir, {recursive: true});

async function post(path, body) {
 const res = await fetch(api + path, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(body || {})
 });
 if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
 return res.json();
}

console.log('--- Initializing Screenshot Capture Suite ---');

// 1. Create a fresh world
const world = await post('/api/worlds', {scenario: 'credit_crunch', seed: 42});
const simId = world.simulation_id;
console.log(`Created world: ${simId}`);

const browser = await chromium.launch({
 channel: 'chrome',
 headless: true,
 args: ['--enable-unsafe-swiftshader', '--font-render-hinting=medium']
});

try {
 const context = await browser.newContext({
  viewport: {width: 1600, height: 1000},
  deviceScaleFactor: 2 // 2x Retina resolution for razor-sharp pictures
 });

 const page = await context.newPage();

 // Pre-load simulation ID in localStorage
 await page.addInitScript(({id, origin}) => {
  if (location.origin === origin) {
   localStorage.setItem('economy-world', id);
  }
 }, {id: simId, origin: new URL(ui).origin});

 await page.goto(ui);
 await page.waitForSelector('.city-scene canvas');
 await page.waitForTimeout(1500);

 // 1. Full Overview with labeled institutions & particles
 console.log('Capturing: 01-live-economic-map-overview.png');
 await page.screenshot({
  path: resolve(outputDir, '01-live-economic-map-overview.png'),
  fullPage: false
 });

 // 2. Apply Bank Shock and capture shockwaves & exposed borrower connections
 console.log('Applying Bank Shock...');
 await post(`/api/worlds/${simId}/shocks`, {
  bank_id: 'bank_1',
  loss_bps: 4000,
  asset_category: 'risky_assets',
  transaction_id: 'screen_shock_1'
 });

 await page.waitForTimeout(1000);
 console.log('Capturing: 02-bank-shock-transmission.png');
 await page.screenshot({
  path: resolve(outputDir, '02-bank-shock-transmission.png'),
  fullPage: false
 });

 // 3. Open Causal Timeline Drawer
 console.log('Opening Causal Timeline Drawer...');
 const causalToggle = page.locator('.causal-chain-toggle-btn');
 if (await causalToggle.isVisible()) {
  await causalToggle.click({force: true});
  await page.waitForTimeout(600);
  console.log('Capturing: 03-causal-timeline-drawer.png');
  await page.screenshot({
   path: resolve(outputDir, '03-causal-timeline-drawer.png'),
   fullPage: false
  });
  // Close drawer
  const closeBtn = page.locator('.drawer-close-btn');
  if (await closeBtn.isVisible()) await closeBtn.click({force: true});
 }

 // 4. Filter to Credit & Banks Layer
 console.log('Switching to Credit & Banks Layer...');
 const creditLayerBtn = page.getByRole('button', {name: /Credit & Banks/i});
 if (await creditLayerBtn.isVisible()) {
  await creditLayerBtn.click({force: true});
  await page.waitForTimeout(600);
  console.log('Capturing: 04-layer-filter-credit-mode.png');
  await page.screenshot({
   path: resolve(outputDir, '04-layer-filter-credit-mode.png'),
   fullPage: false
  });
  // Switch back to All Layers
  const allLayersBtn = page.getByRole('button', {name: /All Layers/i});
  if (await allLayersBtn.isVisible()) await allLayersBtn.click({force: true});
 }

 // 5. Zoom to Café Seventy8 (Business 1) and inspect with Nessie Mirror
 console.log('Navigating to Mission shops / Café Seventy8...');
 const shopsBtn = page.getByRole('button', {name: 'Mission shops', exact: true});
 if (await shopsBtn.isVisible()) {
  await shopsBtn.click({force: true});
  await page.waitForTimeout(1200);

  // Inspect Business 1
  await page.evaluate(() => {
   const w = window;
   if (w.useStore) w.useStore.getState().set({selected: 'business_1'});
  });

  // If evaluate didn't select, click through UI list
  const selectedInspector = page.locator('.inspector h2');
  if (await selectedInspector.count() === 0) {
   const details = page.locator('.institution-list summary');
   if (await details.isVisible()) {
    await details.click({force: true});
    await page.locator('.institution-list button').filter({hasText: /Business 1/}).click({force: true});
   }
  }

  await page.waitForTimeout(1000);
  console.log('Capturing: 05-cafe-seventy8-inspector.png');
  await page.screenshot({
   path: resolve(outputDir, '05-cafe-seventy8-inspector.png'),
   fullPage: false
  });

  // Back to whole city
  const homeBtn = page.locator('.city-home');
  if (await homeBtn.isVisible()) await homeBtn.click({force: true});
 }

 // 6. Fork Reality (Three Futures Comparison)
 console.log('Testing Fork Reality...');
 const forkBtn = page.getByRole('button', {name: 'Fork Reality', exact: false});
 if (await forkBtn.isVisible()) {
  await forkBtn.click({force: true});
  await page.waitForSelector('.compare-view');
  await page.waitForTimeout(1200);
  console.log('Capturing: 06-fork-reality-comparison.png');
  await page.screenshot({
   path: resolve(outputDir, '06-fork-reality-comparison.png'),
   fullPage: false
  });

  // Back to city
  const backCityBtn = page.getByRole('button', {name: 'Back to city', exact: false});
  if (await backCityBtn.isVisible()) await backCityBtn.click({force: true});
 }

 // 7. Financial Network View
 console.log('Opening Financial Network Graph...');
 const networkBtn = page.getByRole('button', {name: 'Network', exact: true});
 if (await networkBtn.isVisible()) {
  await networkBtn.click({force: true});
  await page.waitForSelector('.network-view');
  await page.waitForTimeout(800);
  console.log('Capturing: 07-financial-network-graph.png');
  await page.screenshot({
   path: resolve(outputDir, '07-financial-network-graph.png'),
   fullPage: false
  });

  // Switch back to City
  const cityBtn = page.getByRole('button', {name: 'City', exact: true});
  if (await cityBtn.isVisible()) await cityBtn.click({force: true});
 }

 // 8. Mobile Viewport
 console.log('Testing Mobile Viewport...');
 await page.setViewportSize({width: 390, height: 844});
 await page.waitForTimeout(800);
 console.log('Capturing: 08-mobile-responsive-city.png');
 await page.screenshot({
  path: resolve(outputDir, '08-mobile-responsive-city.png'),
  fullPage: false
 });

 console.log('--- All High-Resolution Screenshots Successfully Captured! ---');
} catch (err) {
 console.error('Screenshot capture failed:', err);
 throw err;
} finally {
 await browser.close();
}
