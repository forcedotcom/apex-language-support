import { test, expect, Page } from '@playwright/test';

/**
 * Debug test to understand what's actually on the VS Code Web page
 */

test.describe('Debug Page Structure', () => {
  test('should debug VS Code Web page structure', async ({ page }) => {
    // Navigate to VS Code Web
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait a reasonable amount of time
    await page.waitForTimeout(10000);
    
    // Take a full page screenshot
    await page.screenshot({ path: 'test-results/debug-full-page.png', fullPage: true });
    
    // Get all elements with class attributes
    const elementsWithClasses = await page.evaluate(() => {
      const elements = document.querySelectorAll('*[class]');
      const classes = new Set();
      elements.forEach(el => {
        el.classList.forEach(cls => classes.add(cls));
      });
      return Array.from(classes).sort();
    });
    
    console.log('All CSS classes found on the page:');
    console.log(elementsWithClasses.slice(0, 50)); // First 50 classes
    
    // Get all elements with id attributes
    const elementsWithIds = await page.evaluate(() => {
      const elements = document.querySelectorAll('*[id]');
      return Array.from(elements).map(el => el.id);
    });
    
    console.log('All IDs found on the page:');
    console.log(elementsWithIds.slice(0, 20));
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get body content (first 500 chars)
    const bodyText = await page.locator('body').textContent();
    console.log('Body text preview:', bodyText?.substring(0, 500));
    
    // Look for any VS Code related text
    const vsCodeText = await page.locator('text=/vscode|code|editor|monaco/i').first().textContent().catch(() => 'Not found');
    console.log('VS Code related text:', vsCodeText);
    
    // Check if there are any visible elements at all
    const visibleElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let visibleCount = 0;
      elements.forEach(el => {
        const style = getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0) {
          visibleCount++;
        }
      });
      return visibleCount;
    });
    
    console.log('Number of visible elements:', visibleElements);
    
    // Get the HTML of the page
    const html = await page.content();
    console.log('Page HTML length:', html.length);
    console.log('Page HTML preview:', html.substring(0, 1000));
    
    // This test always passes - it's just for debugging
    expect(true).toBe(true);
  });
});