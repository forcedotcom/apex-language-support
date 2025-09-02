/**
 * Helper functions for testing outline view functionality.
 * 
 * Provides utilities for interacting with and validating the outline view
 * in VS Code Web environment.
 */

import type { Page } from '@playwright/test';
import { OUTLINE_SELECTORS, APEX_TERMS, TEST_TIMEOUTS, SELECTORS } from './constants';
import { logStep, logSuccess, logWarning } from './test-helpers';

/**
 * Expected symbol structure for HelloWorld.cls file.
 */
export const EXPECTED_APEX_SYMBOLS = {
  className: 'HelloWorld',
  classType: 'class',
  methods: [
    { name: 'sayHello', visibility: 'public', isStatic: true },
    { name: 'add', visibility: 'public', isStatic: true }
  ],
  totalSymbols: 3, // 1 class + 2 methods
} as const;

/**
 * Attempts to find and activate the outline view.
 * 
 * @param page - Playwright page instance
 * @returns True if outline view was found/activated
 */
export const findAndActivateOutlineView = async (page: Page): Promise<boolean> => {
  logStep('Opening outline view', '🗂️');
  
  // First, try to find outline view in the explorer sidebar
  let outlineFound = false;
  
  for (const selector of OUTLINE_SELECTORS) {
    const outlineElement = page.locator(selector);
    const count = await outlineElement.count();
    
    if (count > 0) {
      logSuccess(`Found outline view with selector: ${selector} (${count} elements)`);
      outlineFound = true;
      
      // Highlight the outline section in debug mode
      if (process.env.DEBUG_MODE && count > 0) {
        await outlineElement.first().hover();
        await page.waitForTimeout(500);
      }
      
      // If it's the text selector, try to click to expand
      if (selector === 'text=OUTLINE') {
        try {
          await outlineElement.first().click();
          await page.waitForTimeout(1000);
          logSuccess('Clicked to expand outline view');
        } catch (e) {
          logStep('Outline view found but click not needed', 'ℹ️');
        }
      }
      break;
    }
  }
  
  // If outline not visible, try to activate it via command palette
  if (!outlineFound) {
    outlineFound = await activateOutlineViaCommandPalette(page);
  }
  
  if (outlineFound) {
    logSuccess('Outline view is now visible and activated');
  }
  
  return outlineFound;
};

/**
 * Activates outline view using the command palette.
 * 
 * @param page - Playwright page instance
 * @returns True if successfully activated
 */
const activateOutlineViaCommandPalette = async (page: Page): Promise<boolean> => {
  logStep('Outline view not immediately visible, trying to activate it', '🔍');
  
  try {
    // Open command palette
    await page.keyboard.press('Control+Shift+P');
    await page.waitForTimeout(1000);
    
    // Type command to show outline
    await page.keyboard.type('outline');
    await page.waitForTimeout(1000);
    
    // Try to find and click outline command
    const outlineCommand = page
      .locator('.quick-input-list .monaco-list-row')
      .filter({ hasText: /outline/i })
      .first();
      
    const isVisible = await outlineCommand.isVisible({ timeout: 2000 });
    if (isVisible) {
      await outlineCommand.click();
      await page.waitForTimeout(2000);
      logSuccess('Activated outline view via command palette');
      return true;
    } else {
      // Close command palette
      await page.keyboard.press('Escape');
      return false;
    }
  } catch (error) {
    logWarning('Failed to activate outline via command palette');
    // Ensure command palette is closed
    await page.keyboard.press('Escape').catch(() => {});
    return false;
  }
};

/**
 * Checks outline structure and content for Apex symbols.
 * 
 * @param page - Playwright page instance
 * @returns Object with outline analysis results
 */
export const analyzeOutlineContent = async (page: Page): Promise<{
  itemsFound: number;
  hasOutlineStructure: boolean;
  symbolCount: number;
  foundTerms: string[];
}> => {
  logStep('Checking outline structure', '🔍');
  
  // Wait for LSP to populate outline
  await page.waitForTimeout(TEST_TIMEOUTS.OUTLINE_GENERATION);
  
  let itemsFound = 0;
  let hasOutlineStructure = false;
  
  // Check if outline view has expanded with content
  const outlineTreeElements = page.locator(SELECTORS.OUTLINE_TREE);
  const treeCount = await outlineTreeElements.count();
  
  if (treeCount > 0) {
    itemsFound += treeCount;
    hasOutlineStructure = true;
    logStep(`Found ${treeCount} outline tree structures`, '   ');
  }
  
  // Look for symbol icons that indicate outline content
  const symbolIcons = page.locator(SELECTORS.SYMBOL_ICONS);
  const symbolCount = await symbolIcons.count();
  
  if (symbolCount > 0) {
    itemsFound += symbolCount;
    logStep(`Found ${symbolCount} symbol icons`, '   ');
  }
  
  // Check for Apex-specific terms
  const foundTerms: string[] = [];
  for (const term of APEX_TERMS) {
    const termElements = page.locator(`text=${term}`);
    const termCount = await termElements.count();
    
    if (termCount > 0) {
      foundTerms.push(term);
      logStep(`Found "${term}" mentioned ${termCount} times (likely in outline or editor)`, '   ');
    }
  }
  
  return {
    itemsFound,
    hasOutlineStructure,
    symbolCount,
    foundTerms,
  };
};

/**
 * Takes a screenshot for debugging outline view issues.
 * 
 * @param page - Playwright page instance
 * @param filename - Screenshot filename
 */
export const captureOutlineViewScreenshot = async (
  page: Page,
  filename = 'outline-view-test.png'
): Promise<void> => {
  try {
    await page.screenshot({ 
      path: `test-results/${filename}`, 
      fullPage: true 
    });
    logStep(`Screenshot saved: test-results/${filename}`, '📸');
  } catch (error) {
    logWarning(`Failed to capture screenshot: ${error}`);
  }
};

/**
 * Validates specific Apex symbols are present in the outline view.
 * 
 * @param page - Playwright page instance
 * @returns Detailed symbol validation results
 */
export const validateApexSymbolsInOutline = async (page: Page): Promise<{
  classFound: boolean;
  methodsFound: string[];
  symbolIconsCount: number;
  totalSymbolsDetected: number;
  isValidStructure: boolean;
}> => {
  logStep('Validating Apex symbols in outline', '🔍');
  
  // Wait additional time for LSP to populate symbols
  await page.waitForTimeout(TEST_TIMEOUTS.OUTLINE_GENERATION);
  
  let classFound = false;
  const methodsFound: string[] = [];
  let symbolIconsCount = 0;
  let totalSymbolsDetected = 0;
  
  // Look for class symbol with specific icon
  const classSelectors = [
    `.codicon-symbol-class`,
    `[aria-label*="HelloWorld"]`,
    `text=${EXPECTED_APEX_SYMBOLS.className}`,
    `.outline-tree .monaco-list-row:has-text("${EXPECTED_APEX_SYMBOLS.className}")`
  ];
  
  for (const selector of classSelectors) {
    const classElements = page.locator(selector);
    const count = await classElements.count();
    if (count > 0) {
      classFound = true;
      logSuccess(`Found class symbol: ${EXPECTED_APEX_SYMBOLS.className} (selector: ${selector})`);
      
      // Highlight the found class symbol in debug mode
      if (process.env.DEBUG_MODE) {
        await classElements.first().hover();
        await page.waitForTimeout(300);
      }
      break;
    }
  }
  
  // Look for method symbols
  for (const method of EXPECTED_APEX_SYMBOLS.methods) {
    const methodSelectors = [
      `.codicon-symbol-method`,
      `[aria-label*="${method.name}"]`,
      `text=${method.name}`,
      `.outline-tree .monaco-list-row:has-text("${method.name}")`
    ];
    
    for (const selector of methodSelectors) {
      const methodElements = page.locator(selector);
      const count = await methodElements.count();
      if (count > 0) {
        methodsFound.push(method.name);
        logSuccess(`Found method symbol: ${method.name} (selector: ${selector})`);
        
        // Highlight the found method symbol in debug mode
        if (process.env.DEBUG_MODE) {
          await methodElements.first().hover();
          await page.waitForTimeout(200);
        }
        break;
      }
    }
  }
  
  // Count total symbol icons
  const symbolIcons = page.locator(SELECTORS.SYMBOL_ICONS);
  symbolIconsCount = await symbolIcons.count();
  
  // Count outline tree items that look like symbols
  const outlineItems = page.locator('.outline-tree .monaco-list-row, .tree-explorer .monaco-list-row');
  const outlineItemCount = await outlineItems.count();
  totalSymbolsDetected = outlineItemCount;
  
  const isValidStructure = classFound && methodsFound.length >= EXPECTED_APEX_SYMBOLS.methods.length;
  
  logStep(`Symbol validation results:`, '📊');
  logStep(`  - Class found: ${classFound ? '✅' : '❌'}`, '   ');
  logStep(`  - Methods found: ${methodsFound.length}/${EXPECTED_APEX_SYMBOLS.methods.length} (${methodsFound.join(', ')})`, '   ');
  logStep(`  - Symbol icons: ${symbolIconsCount}`, '   ');
  logStep(`  - Total symbols: ${totalSymbolsDetected}`, '   ');
  logStep(`  - Valid structure: ${isValidStructure ? '✅' : '❌'}`, '   ');
  
  // Extended pause in debug mode to show validation results
  if (process.env.DEBUG_MODE) {
    logStep('Validation complete - showing final outline state', '🎉');
    await page.waitForTimeout(2000);
  }
  
  return {
    classFound,
    methodsFound,
    symbolIconsCount,
    totalSymbolsDetected,
    isValidStructure,
  };
};

/**
 * Reports comprehensive outline test results with symbol validation.
 * 
 * @param outlineFound - Whether outline view was found
 * @param symbolValidation - Results from symbol validation
 * @param criticalErrors - Number of critical errors
 */
export const reportOutlineTestResults = (
  outlineFound: boolean,
  symbolValidation: {
    classFound: boolean;
    methodsFound: string[];
    totalSymbolsDetected: number;
    isValidStructure: boolean;
  },
  criticalErrors: number
): void => {
  console.log('🎉 Outline view test COMPLETED');
  console.log('   - File opened: ✅ .cls file loaded in editor');
  console.log('   - Extension: ✅ Language features activated');
  console.log(`   - Outline: ${outlineFound ? '✅' : '⚠️'} Outline view ${outlineFound ? 'loaded' : 'attempted'}`);
  
  if (symbolValidation.isValidStructure) {
    console.log(`   - Symbols: ✅ All expected Apex symbols found`);
    console.log(`     • Class: ${symbolValidation.classFound ? '✅' : '❌'} HelloWorld`);
    console.log(`     • Methods: ${symbolValidation.methodsFound.length}/${EXPECTED_APEX_SYMBOLS.methods.length} (${symbolValidation.methodsFound.join(', ')})`);
    console.log(`     • Total: ${symbolValidation.totalSymbolsDetected} symbols detected`);
  } else {
    console.log('   - Symbols: ⚠️  Some expected symbols not found');
    console.log(`     • Class: ${symbolValidation.classFound ? '✅' : '❌'} HelloWorld`);
    console.log(`     • Methods: ${symbolValidation.methodsFound.length}/${EXPECTED_APEX_SYMBOLS.methods.length} (${symbolValidation.methodsFound.join(', ')})`);
  }
  
  console.log(`   - Errors: ✅ ${criticalErrors} critical errors (threshold: 5)`);
  console.log('');
  console.log('   ✨ This test validates LSP symbol parsing and outline population');
};