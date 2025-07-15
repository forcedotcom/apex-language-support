/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { log, setOutput } from './utils';

/**
 * Parse environment variables for package selection
 */
function parseEnvironment(): {
  selectedPackage: string;
  availablePackages: string;
  changedPackages: string;
} {
  return {
    selectedPackage: process.env.SELECTED_PACKAGE || '',
    availablePackages: process.env.AVAILABLE_PACKAGES || '',
    changedPackages: process.env.CHANGED_PACKAGES || '',
  };
}

/**
 * Convert comma-separated string to JSON array
 */
function stringToJsonArray(input: string): string {
  if (!input || input.trim() === '') {
    return '[]';
  }

  const packages = input
    .split(',')
    .map((pkg) => pkg.trim())
    .filter((pkg) => pkg.length > 0);
  return JSON.stringify(packages);
}

/**
 * Select packages based on input criteria
 */
export function selectNpmPackages(
  selectedPackage: string,
  availablePackages: string,
  changedPackages: string,
): string {
  log.info('Selecting NPM packages for release...');
  log.debug(`Selected package: ${selectedPackage}`);
  log.debug(`Available packages: ${availablePackages}`);
  log.debug(`Changed packages: ${changedPackages}`);

  let selectedPackages: string;

  if (selectedPackage === 'none') {
    // No packages selected
    log.info('No packages selected for release');
    selectedPackages = '';
  } else if (selectedPackage === 'all') {
    // Use all available packages
    if (availablePackages) {
      log.info('Using all available packages');
      selectedPackages = availablePackages;
    } else {
      // Fallback to changed packages detection
      log.info('No available packages specified, using changed packages');
      selectedPackages = changedPackages;
    }
  } else if (selectedPackage === 'changed') {
    // Use changed packages
    log.info('Using changed packages');
    selectedPackages = changedPackages;
  } else if (selectedPackage) {
    // Use the specific selected package
    log.info(`Using specific package: ${selectedPackage}`);
    selectedPackages = selectedPackage;
  } else {
    // Default to changed packages
    log.info('No selection specified, using changed packages');
    selectedPackages = changedPackages;
  }

  // Convert to JSON array format
  const jsonArray = stringToJsonArray(selectedPackages);

  log.info(`Selected packages: ${selectedPackages}`);
  log.debug(`JSON array: ${jsonArray}`);

  return jsonArray;
}

/**
 * Set GitHub Actions outputs for package selection
 */
export function setPackageSelectionOutputs(selectedPackages: string): void {
  setOutput('packages', selectedPackages);

  log.success('Package selection outputs set');
}

/**
 * Main function for CLI usage
 */
export async function main(): Promise<void> {
  try {
    const env = parseEnvironment();
    const selectedPackages = selectNpmPackages(
      env.selectedPackage,
      env.availablePackages,
      env.changedPackages,
    );
    setPackageSelectionOutputs(selectedPackages);
  } catch (error) {
    log.error(`Failed to select packages: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
