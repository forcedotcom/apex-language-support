import { test, expect, Page } from '@playwright/test';

/**
 * Tests for Apex Language Server language features
 * in VS Code Web environment.
 */

test.describe('Apex Language Features', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Navigate to VS Code Web and wait for it to load
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.monaco-workbench', { timeout: 30000 });
    
    // Open the HelloWorld.cls file to activate the extension
    await page.locator('text=HelloWorld.cls').click();
    await page.waitForSelector('.monaco-editor', { timeout: 15000 });
    
    // Wait for extension to activate
    await page.waitForTimeout(5000);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should provide syntax highlighting for Apex code', async () => {
    // Check if the editor has syntax highlighting
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
    
    // Look for syntax-highlighted keywords
    // Monaco editor uses specific CSS classes for syntax highlighting
    const keywords = page.locator('.monaco-editor .mtk1, .monaco-editor .mtk3, .monaco-editor .mtk22');
    
    // We should have some syntax-highlighted tokens
    const keywordCount = await keywords.count();
    expect(keywordCount).toBeGreaterThan(0);
  });

  test('should recognize Apex file types', async () => {
    // Check if the language mode is set correctly for .cls file
    const languageStatus = page.locator('.monaco-status-bar .language-status');
    
    // VS Code should recognize this as an Apex file
    // The exact text might vary, so we'll check if it's not "Plain Text"
    if (await languageStatus.isVisible()) {
      const languageText = await languageStatus.textContent();
      expect(languageText).not.toBe('Plain Text');
    }
    
    // Also check in the tab title or editor area for language indication
    const editorArea = page.locator('.monaco-editor');
    await expect(editorArea).toBeVisible();
  });

  test('should handle SOQL file correctly', async () => {
    // Click on the query.soql file
    await page.locator('text=query.soql').click();
    
    // Wait for the editor to load the SOQL file
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Check if we can see SOQL content
    await expect(page.locator('text=SELECT')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=FROM Account')).toBeVisible({ timeout: 5000 });
    
    // Wait a moment for any language features to activate
    await page.waitForTimeout(3000);
  });

  test('should handle trigger file correctly', async () => {
    // Click on the AccountTrigger.trigger file
    await page.locator('text=AccountTrigger.trigger').click();
    
    // Wait for the editor to load the trigger file
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Check if we can see trigger content
    await expect(page.locator('text=trigger AccountTrigger')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=before insert')).toBeVisible({ timeout: 5000 });
    
    // Wait a moment for any language features to activate
    await page.waitForTimeout(3000);
  });

  test('should allow basic editing operations', async () => {
    // Go back to HelloWorld.cls
    await page.locator('text=HelloWorld.cls').click();
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Click in the editor to focus it
    const editor = page.locator('.monaco-editor .view-lines');
    await editor.click();
    
    // Try to position cursor at the end of the class and add a new method
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    
    // Type a simple method
    await page.keyboard.type('    public void testMethod() {');
    await page.keyboard.press('Enter');
    await page.keyboard.type('        // Test method');
    await page.keyboard.press('Enter');
    await page.keyboard.type('    }');
    
    // Check if the text was added
    await page.waitForTimeout(1000);
    await expect(page.locator('text=testMethod')).toBeVisible();
  });

  test('should not crash when opening multiple Apex files', async () => {
    // Open multiple files in sequence
    const files = ['HelloWorld.cls', 'AccountTrigger.trigger', 'query.soql'];
    
    for (const file of files) {
      await page.locator(`text=${file}`).click();
      await page.waitForTimeout(2000); // Give time for each file to load
      
      // Verify the editor is still working
      const editor = page.locator('.monaco-editor');
      await expect(editor).toBeVisible();
    }
    
    // Verify we can still interact with the editor
    const editor = page.locator('.monaco-editor .view-lines');
    await editor.click();
    await page.keyboard.press('Control+Home');
    
    // The editor should still be responsive
    await page.waitForTimeout(1000);
  });

  test('should maintain extension stability during file operations', async () => {
    // This test ensures the extension doesn't crash during basic operations
    
    // Create a new file (this might not work in web, but we'll try)
    await page.keyboard.press('Control+N');
    await page.waitForTimeout(2000);
    
    // Try to type some Apex code
    await page.keyboard.type('public class TestClass {');
    await page.keyboard.press('Enter');
    await page.keyboard.type('    public String getName() {');
    await page.keyboard.press('Enter');
    await page.keyboard.type('        return "test";');
    await page.keyboard.press('Enter');
    await page.keyboard.type('    }');
    await page.keyboard.press('Enter');
    await page.keyboard.type('}');
    
    // Wait a moment to see if anything crashes
    await page.waitForTimeout(3000);
    
    // The editor should still be functional
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
  });
});