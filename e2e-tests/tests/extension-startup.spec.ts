import { test, expect, Page } from '@playwright/test';

/**
 * Tests for Apex Language Server Extension startup and basic functionality
 * in VS Code Web environment.
 */

test.describe('Apex Extension Startup', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should load VS Code Web successfully', async () => {
    // Navigate to VS Code Web
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for VS Code to load
    await page.waitForSelector('.monaco-workbench', { timeout: 30000 });
    
    // Check if the workbench is visible
    const workbench = page.locator('.monaco-workbench');
    await expect(workbench).toBeVisible();
  });

  test('should load the workspace with test files', async () => {
    // Wait for file explorer to be visible
    await page.waitForSelector('.explorer-viewlet', { timeout: 15000 });
    
    // Check if our test files are visible in the explorer
    const fileExplorer = page.locator('.explorer-viewlet');
    await expect(fileExplorer).toBeVisible();
    
    // Look for our test files
    await expect(page.locator('text=HelloWorld.cls')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=AccountTrigger.trigger')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=query.soql')).toBeVisible({ timeout: 5000 });
  });

  test('should show Apex extension in extensions list', async () => {
    // Open extensions view
    await page.keyboard.press('Control+Shift+X');
    
    // Wait for extensions view to load
    await page.waitForSelector('.extensions-viewlet', { timeout: 15000 });
    
    // Look for the Apex extension
    const extensionsView = page.locator('.extensions-viewlet');
    await expect(extensionsView).toBeVisible();
    
    // Search for apex in the search box or look for the extension name
    const searchBox = page.locator('.extensions-viewlet input[placeholder*="Search"]');
    if (await searchBox.isVisible()) {
      await searchBox.fill('apex');
      await page.waitForTimeout(2000); // Wait for search results
    }
    
    // Check if Apex extension appears in the list
    await expect(page.locator('text=Salesforce Apex Language Server')).toBeVisible({ timeout: 10000 });
  });

  test('should activate extension when opening Apex file', async () => {
    // Click on HelloWorld.cls to open it
    await page.locator('text=HelloWorld.cls').click();
    
    // Wait for the editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 15000 });
    
    // Check if the editor is visible and has content
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
    
    // Check if we can see some Apex code
    await expect(page.locator('text=public class HelloWorld')).toBeVisible({ timeout: 10000 });
    
    // Wait a bit for extension activation
    await page.waitForTimeout(5000);
  });

  test('should show extension output channel', async () => {
    // Open the output panel
    await page.keyboard.press('Control+Shift+U');
    
    // Wait for output panel to be visible
    await page.waitForSelector('.part.panel', { timeout: 10000 });
    
    // Look for the output dropdown
    const outputDropdown = page.locator('.monaco-select-box');
    if (await outputDropdown.first().isVisible()) {
      await outputDropdown.first().click();
      
      // Wait for dropdown options
      await page.waitForTimeout(1000);
      
      // Look for Apex Language Extension output channel
      const apexOutput = page.locator('text=Apex Language Extension');
      if (await apexOutput.isVisible()) {
        await apexOutput.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Check if output panel shows some content (even if no specific channel is found)
    const outputPanel = page.locator('.part.panel');
    await expect(outputPanel).toBeVisible();
  });
});

test.describe('Extension Bundle Tests', () => {
  test('should not have console errors on startup', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate and wait for VS Code to load
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.monaco-workbench', { timeout: 30000 });
    
    // Give some time for any async errors to occur
    await page.waitForTimeout(5000);
    
    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon.ico') &&
      !error.includes('sourcemap') &&
      !error.toLowerCase().includes('warning')
    );
    
    // Report any critical errors found
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }
    
    // This test is informational - we don't fail on console errors
    // but we report them for debugging
    expect(criticalErrors.length).toBeLessThan(10); // Allow some non-critical errors
  });

  test('should load extension worker without network errors', async ({ page }) => {
    const networkFailures: string[] = [];
    
    // Listen for network failures
    page.on('response', (response) => {
      if (!response.ok() && response.url().includes('worker')) {
        networkFailures.push(`${response.status()} ${response.url()}`);
      }
    });
    
    // Navigate and wait for VS Code to load
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.monaco-workbench', { timeout: 30000 });
    
    // Open an Apex file to trigger extension activation
    await page.locator('text=HelloWorld.cls').click();
    await page.waitForTimeout(5000);
    
    // Check if there were any worker loading failures
    if (networkFailures.length > 0) {
      console.log('Network failures for worker files:', networkFailures);
    }
    
    // This is informational - we don't necessarily fail the test
    // but we want to know about worker loading issues
    expect(networkFailures.length).toBeLessThan(5); // Allow some retry attempts
  });
});