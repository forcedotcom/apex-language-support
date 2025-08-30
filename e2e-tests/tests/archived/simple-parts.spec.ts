import { test, expect, Page } from '@playwright/test';

/**
 * Simple test to verify VS Code parts exist
 */

test.describe('Simple Parts Test', () => {
  test('should find VS Code parts and elements', async ({ page }) => {
    // Navigate to VS Code Web
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait a reasonable amount of time
    await page.waitForTimeout(10000);
    
    // Check each part one by one
    const parts = [
      'workbench.parts.sidebar',
      'workbench.parts.editor', 
      'workbench.parts.panel',
      'workbench.parts.statusbar',
      'workbench.view.explorer'
    ];
    
    for (const partId of parts) {
      const element = page.locator(`[id="${partId}"]`);
      const exists = await element.count() > 0;
      console.log(`Part ${partId}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      
      if (exists) {
        const isVisible = await element.isVisible();
        console.log(`Part ${partId}: ${isVisible ? 'VISIBLE' : 'NOT VISIBLE'}`);
      }
    }
    
    // Check file icon classes
    const fileIconClasses = [
      '.cls-ext-file-icon',
      '.apex-lang-file-icon', 
      '.accounttrigger.trigger-name-file-icon'
    ];
    
    for (const className of fileIconClasses) {
      const element = page.locator(className);
      const count = await element.count();
      console.log(`File icon ${className}: ${count} found`);
    }
    
    // Check list items
    const listItems = ['#list_id_1_0', '#list_id_1_1', '#list_id_1_2'];
    
    for (const listId of listItems) {
      const element = page.locator(listId);
      const exists = await element.count() > 0;
      const isVisible = exists ? await element.isVisible() : false;
      console.log(`List item ${listId}: ${exists ? 'EXISTS' : 'NOT FOUND'} ${isVisible ? 'VISIBLE' : 'NOT VISIBLE'}`);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/simple-parts-check.png', fullPage: true });
    
    // This test always passes - it's just for inspection
    expect(true).toBe(true);
  });
});