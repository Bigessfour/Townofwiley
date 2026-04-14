import { test, expect } from '@playwright/test';
import { ClassicRunner, BatchInfo, Configuration, Eyes, Target } from '@applitools/eyes-playwright';

let runner: ClassicRunner;
let batch: BatchInfo;
let config: Configuration;

test.beforeAll(async () => {
  // Use ClassicRunner for sequential screenshot uploads, or VisualGridRunner for cross-browser
  runner = new ClassicRunner();

  // Create a new batch for this test run
  batch = new BatchInfo({ name: 'TownOfWiley Visual Validation' });

  // Initialize configuration
  config = new Configuration();
  config.setBatch(batch);

  // Grab the API key from environment variable
  config.setApiKey(process.env.APPLITOOLS_API_KEY!);
});

test.describe('Main Page Visual Test', () => {
  let eyes: Eyes;

  test.beforeEach(async ({ page }, testInfo) => {
    // Create new Eyes instance per test
    eyes = new Eyes(runner, config);
    // Open the page using the test's title as the test name
    await eyes.open(page, 'TownOfWiley', testInfo.title, { width: 1280, height: 720 });
  });

  test('Verify Homepage layout', async ({ page }) => {
    // Navigate to local or production
    await page.goto('/');
    
    // Check the whole window view visually
    await eyes.check('Homepage Full Window', Target.window().fully());
  });

  test.afterEach(async () => {
    // Close eyes to release resources
    await eyes.close();
  });
});

test.afterAll(async () => {
  // Wait for all results to be uploaded/processed
  const results = await runner.getAllTestResults();
  console.log('Applitools visual test results', results);
});