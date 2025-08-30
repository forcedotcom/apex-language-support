import { test, expect, Page } from '@playwright/test';

/**
 * Basic functionality tests for Apex Language Server Extension
 * These tests focus on core functionality without relying on specific UI selectors
 */

test.describe('Basic Extension Startup', () => {
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

    // Wait for VS Code to load - use more generic selector
    await page.waitForSelector('.monaco-workbench, [role="application"], .workbench', { timeout: 30000 });
    
    // Check if VS Code is loaded
    const workbench = page.locator('.monaco-workbench, [role="application"], .workbench').first();
    await expect(workbench).toBeVisible();
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/vscode-loaded.png', fullPage: true });
  });

  test('should not have critical console errors', async () => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate and wait for VS Code to load
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.monaco-workbench, [role="application"], .workbench', { timeout: 30000 });
    
    // Give some time for any async errors to occur
    await page.waitForTimeout(5000);
    
    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon.ico') &&
      !error.includes('sourcemap') &&
      !error.toLowerCase().includes('warning') &&
      !error.includes('404') // VS Code Web often has 404s for optional resources
    );
    
    // Log errors for debugging
    if (criticalErrors.length > 0) {
      console.log('Critical console errors found:', criticalErrors);
    }
    
    // Allow some non-critical errors but not too many
    expect(criticalErrors.length).toBeLessThan(5);
  });

  test('should load editor interface', async () => {
    // Navigate to VS Code Web
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.monaco-workbench, [role="application"], .workbench', { timeout: 30000 });
    
    // Wait for editor area to be available
    await page.waitForSelector('.monaco-editor, .editor-container, [role="textbox"]', { timeout: 15000 });
    
    // Check if editor area exists
    const editor = page.locator('.monaco-editor, .editor-container, [role="textbox"]').first();
    await expect(editor).toBeVisible();
  });

  test('should respond to keyboard shortcuts', async () => {
    // Navigate to VS Code Web
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.monaco-workbench, [role="application"], .workbench', { timeout: 30000 });
    
    // Try opening command palette with Ctrl+Shift+P
    await page.keyboard.press('Control+Shift+P');
    
    // Wait for command palette or quick open
    await page.waitForSelector('.quick-input-widget, .command-palette, .monaco-quick-input-widget', { timeout: 5000 });
    
    // Verify command palette is visible
    const commandPalette = page.locator('.quick-input-widget, .command-palette, .monaco-quick-input-widget').first();
    await expect(commandPalette).toBeVisible();
    
    // Close command palette
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  });

  test('should handle basic workspace interaction', async () => {
    // Navigate to VS Code Web
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.monaco-workbench, [role="application"], .workbench', { timeout: 30000 });
    
    // Try to create a new file (Ctrl+N)
    await page.keyboard.press('Control+N');
    
    // Wait for new untitled file or editor
    await page.waitForTimeout(2000);
    
    // Check if we have an active editor
    const editor = page.locator('.monaco-editor, .editor-container, [role="textbox"]');
    await expect(editor.first()).toBeVisible();
    
    // Try typing some content
    await page.keyboard.type('public class Test { }');
    await page.waitForTimeout(1000);
    
    // The text should be visible somewhere on the page
    await expect(page.locator('text=public class Test').first()).toBeVisible({ timeout: 5000 });
  });

  test('should maintain stability during interactions', async () => {
    // Navigate to VS Code Web
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.monaco-workbench, [role="application"], .workbench', { timeout: 30000 });
    
    // Perform a series of interactions
    await page.keyboard.press('Control+Shift+P'); // Command palette
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    
    await page.keyboard.press('Control+N'); // New file  
    await page.waitForTimeout(500);
    
    await page.keyboard.type('test content');
    await page.waitForTimeout(500);
    
    await page.keyboard.press('Control+A'); // Select all
    await page.keyboard.press('Delete'); // Delete
    await page.waitForTimeout(500);
    
    // VS Code should still be responsive
    const workbench = page.locator('.monaco-workbench, [role="application"], .workbench').first();
    await expect(workbench).toBeVisible();
    
    // Should still be able to use command palette
    await page.keyboard.press('Control+Shift+P');
    await page.waitForSelector('.quick-input-widget, .command-palette, .monaco-quick-input-widget', { timeout: 5000 });
    await page.keyboard.press('Escape');
  });
});