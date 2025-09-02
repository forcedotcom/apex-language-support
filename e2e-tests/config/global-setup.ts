import type { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { ALL_SAMPLE_FILES } from '../fixtures/apex-samples';

const execAsync = promisify(exec);

/**
 * Global setup for e2e tests.
 * 
 * Ensures extension is built and creates test workspace with sample files
 * following TypeScript best practices from .cursor guidelines.
 * 
 * @param config - Playwright configuration
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('🔧 Setting up e2e test environment...');
  
  // Ensure extension is built
  const extensionPath = path.resolve(__dirname, '../../packages/apex-lsp-vscode-extension');
  const distPath = path.join(extensionPath, 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('📦 Building extension for web...');
    try {
      await execAsync('npm run compile && npm run bundle', {
        cwd: extensionPath,
      });
      console.log('✅ Extension built successfully');
    } catch (error) {
      console.error('❌ Failed to build extension:', error);
      throw error;
    }
  } else {
    console.log('✅ Extension already built');
  }
  
  // Create test workspace using fixtures  
  const workspacePath = path.resolve(__dirname, '../test-workspace');
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
    
    // Create sample files using fixtures
    for (const sampleFile of ALL_SAMPLE_FILES) {
      fs.writeFileSync(
        path.join(workspacePath, sampleFile.filename),
        sampleFile.content
      );
    }
    
    console.log(`✅ Created test workspace with ${ALL_SAMPLE_FILES.length} sample files`);
  }
  
  console.log('🚀 Global setup completed');
}

export default globalSetup;