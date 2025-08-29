import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up e2e test environment...');
  
  // Clean up any temporary files if needed
  // For now, we'll keep the test workspace for debugging
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;