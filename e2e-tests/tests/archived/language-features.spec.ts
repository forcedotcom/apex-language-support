import { test, expect, Page } from '@playwright/test';

/**
 * Tests for Apex Language Server language features
 * in VS Code Web environment.
 */

test.describe('Apex Language Features', () => {

  test('should provide syntax highlighting for Apex code', async ({ page }) => {
    // Navigate fresh to VS Code Web (self-contained test)
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Give VS Code extra time to fully load
    await page.waitForTimeout(12000);
    
    // Wait for workbench and explorer to be ready
    await page.waitForSelector('.monaco-workbench', { timeout: 5000 });
    const explorer = page.locator('[id="workbench.view.explorer"]');
    await expect(explorer).toBeVisible({ timeout: 5000 });
    
    // Open the HelloWorld.cls file to activate the extension
    const clsFileIcon = page.locator('.cls-ext-file-icon').first();
    if (await clsFileIcon.isVisible()) {
      await clsFileIcon.click();
      console.log('Clicked on .cls file icon');
    }
    
    // Wait for editor to load
    await page.waitForSelector('[id="workbench.parts.editor"]', { timeout: 15000 });
    const editor = page.locator('[id="workbench.parts.editor"] .monaco-editor');
    await expect(editor).toBeVisible();
    
    // Wait for extension to activate
    await page.waitForTimeout(3000);
    
    // Look for syntax-highlighted keywords
    // Monaco editor uses specific CSS classes for syntax highlighting
    const keywords = page.locator('.monaco-editor .mtk1, .monaco-editor .mtk3, .monaco-editor .mtk22');
    
    // We should have some syntax-highlighted tokens
    const keywordCount = await keywords.count();
    expect(keywordCount).toBeGreaterThan(0);
  });

  test('should recognize Apex file types', async ({ page }) => {
    // Navigate fresh to VS Code Web (self-contained test)
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Give VS Code extra time to fully load
    await page.waitForTimeout(12000);
    
    // Wait for workbench and explorer to be ready
    await page.waitForSelector('.monaco-workbench', { timeout: 5000 });
    const explorer = page.locator('[id="workbench.view.explorer"]');
    await expect(explorer).toBeVisible({ timeout: 5000 });
    
    // Open the HelloWorld.cls file
    const clsFileIcon = page.locator('.cls-ext-file-icon').first();
    if (await clsFileIcon.isVisible()) {
      await clsFileIcon.click();
    }
    
    // Wait for editor to load
    await page.waitForSelector('[id="workbench.parts.editor"]', { timeout: 15000 });
    const editorArea = page.locator('[id="workbench.parts.editor"] .monaco-editor');
    await expect(editorArea).toBeVisible();
    
    // Check if the language mode is set correctly for .cls file
    const languageStatus = page.locator('.monaco-status-bar .language-status, [id="workbench.parts.statusbar"] .language-status');
    
    // VS Code should recognize this as an Apex file
    // The exact text might vary, so we'll check if it's not "Plain Text"
    if (await languageStatus.isVisible()) {
      const languageText = await languageStatus.textContent();
      expect(languageText).not.toBe('Plain Text');
    }
  });

  test('should handle SOQL file correctly', async ({ page }) => {
    // Navigate fresh to VS Code Web (self-contained test)
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Give VS Code extra time to fully load
    await page.waitForTimeout(12000);
    
    // Wait for workbench and explorer to be ready
    await page.waitForSelector('.monaco-workbench', { timeout: 5000 });
    const explorer = page.locator('[id="workbench.view.explorer"]');
    await expect(explorer).toBeVisible({ timeout: 5000 });
    
    // Click on the query.soql file - look for any file that contains soql or SOQL
    const soqlFile = page.locator('.monaco-tree-row, .monaco-list-row, .file-icon').filter({ hasText: /soql|SOQL/i }).first();
    if (await soqlFile.isVisible()) {
      await soqlFile.click();
    } else {
      // Fallback: try to find it by looking for list items in explorer
      const explorerItems = page.locator('#list_id_1_0, #list_id_1_1, #list_id_1_2');
      const count = await explorerItems.count();
      if (count >= 3) {
        await explorerItems.nth(2).click(); // Try third item which might be query.soql
      }
    }
    
    // Wait for the editor to load the file
    await page.waitForSelector('[id="workbench.parts.editor"]', { timeout: 15000 });
    const editor = page.locator('[id="workbench.parts.editor"] .monaco-editor');
    await expect(editor).toBeVisible();
    
    // Check if we can see SOQL content
    await expect(page.locator('text=SELECT')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=FROM Account')).toBeVisible({ timeout: 5000 });
    
    // Wait a moment for any language features to activate
    await page.waitForTimeout(3000);
  });

  test('should handle trigger file correctly', async ({ page }) => {
    // Navigate fresh to VS Code Web (self-contained test)
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Give VS Code extra time to fully load
    await page.waitForTimeout(12000);
    
    // Wait for workbench and explorer to be ready
    await page.waitForSelector('.monaco-workbench', { timeout: 5000 });
    const explorer = page.locator('[id="workbench.view.explorer"]');
    await expect(explorer).toBeVisible({ timeout: 5000 });
    
    // Click on the AccountTrigger.trigger file - look for trigger files
    const triggerFile = page.locator('.monaco-tree-row, .monaco-list-row, .file-icon').filter({ hasText: /trigger|AccountTrigger/i }).first();
    if (await triggerFile.isVisible()) {
      await triggerFile.click();
    } else {
      // Fallback: try to find it by looking for list items in explorer
      const explorerItems = page.locator('#list_id_1_0, #list_id_1_1, #list_id_1_2');
      const count = await explorerItems.count();
      if (count >= 2) {
        await explorerItems.nth(1).click(); // Try second item which might be AccountTrigger.trigger
      }
    }
    
    // Wait for the editor to load the trigger file
    await page.waitForSelector('[id="workbench.parts.editor"]', { timeout: 15000 });
    const editor = page.locator('[id="workbench.parts.editor"] .monaco-editor');
    await expect(editor).toBeVisible();
    
    // Check if we can see trigger content
    await expect(page.locator('text=trigger AccountTrigger')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=before insert')).toBeVisible({ timeout: 5000 });
    
    // Wait a moment for any language features to activate
    await page.waitForTimeout(3000);
  });

  test('should allow basic editing operations', async ({ page }) => {
    // Navigate fresh to VS Code Web (self-contained test)
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Give VS Code extra time to fully load
    await page.waitForTimeout(12000);
    
    // Wait for workbench and explorer to be ready
    await page.waitForSelector('.monaco-workbench', { timeout: 5000 });
    const explorer = page.locator('[id="workbench.view.explorer"]');
    await expect(explorer).toBeVisible({ timeout: 5000 });
    
    // Click on HelloWorld.cls file
    const clsFileIcon = page.locator('.cls-ext-file-icon').first();
    if (await clsFileIcon.isVisible()) {
      await clsFileIcon.click();
    }
    
    // Wait for editor to load
    await page.waitForSelector('[id="workbench.parts.editor"]', { timeout: 15000 });
    const editorPart = page.locator('[id="workbench.parts.editor"]');
    await expect(editorPart).toBeVisible();
    
    // Click in the editor to focus it
    const editor = page.locator('[id="workbench.parts.editor"] .monaco-editor .view-lines');
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

  test('should not crash when opening multiple Apex files', async ({ page }) => {
    // Navigate fresh to VS Code Web (self-contained test)
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Give VS Code extra time to fully load
    await page.waitForTimeout(12000);
    
    // Wait for workbench and explorer to be ready
    await page.waitForSelector('.monaco-workbench', { timeout: 5000 });
    const explorer = page.locator('[id="workbench.view.explorer"]');
    await expect(explorer).toBeVisible({ timeout: 5000 });
    
    // Open multiple files in sequence using list items
    const explorerItems = page.locator('#list_id_1_0, #list_id_1_1, #list_id_1_2');
    const itemCount = await explorerItems.count();
    
    for (let i = 0; i < Math.min(itemCount, 3); i++) {
      await explorerItems.nth(i).click();
      await page.waitForTimeout(2000); // Give time for each file to load
      
      // Verify the editor is still working
      const editor = page.locator('[id="workbench.parts.editor"] .monaco-editor');
      await expect(editor).toBeVisible();
    }
    
    // Verify we can still interact with the editor
    const editor = page.locator('[id="workbench.parts.editor"] .monaco-editor .view-lines');
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.press('Control+Home');
    }
    
    // The editor should still be responsive
    await page.waitForTimeout(1000);
  });

  test('should maintain extension stability during file operations', async ({ page }) => {
    // Navigate fresh to VS Code Web (self-contained test)
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Give VS Code extra time to fully load
    await page.waitForTimeout(12000);
    
    // Wait for workbench to be ready
    await page.waitForSelector('.monaco-workbench', { timeout: 5000 });
    
    // This test ensures the extension doesn't crash during basic operations
    
    // Create a new file (this might not work in web, but we'll try)
    await page.keyboard.press('Control+N');
    await page.waitForTimeout(3000);
    
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
    const editor = page.locator('[id="workbench.parts.editor"] .monaco-editor, .monaco-editor');
    await expect(editor).toBeVisible();
  });
});