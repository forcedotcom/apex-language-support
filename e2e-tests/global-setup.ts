import { chromium, FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up e2e test environment...');
  
  // Ensure extension is built
  const extensionPath = path.resolve(__dirname, '../packages/apex-lsp-vscode-extension');
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
  
  // Create test workspace
  const workspacePath = path.resolve(__dirname, 'test-workspace');
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
    
    // Create sample Apex files for testing
    const sampleApexClass = `public class HelloWorld {
    public static void sayHello() {
        System.debug('Hello from Apex!');
    }
    
    public static Integer add(Integer a, Integer b) {
        return a + b;
    }
}`;

    const sampleTrigger = `trigger AccountTrigger on Account (before insert, before update) {
    for (Account acc : Trigger.new) {
        if (String.isBlank(acc.Name)) {
            acc.addError('Account name is required');
        }
    }
}`;

    const sampleSOQL = `SELECT Id, Name, Phone, Website 
FROM Account 
WHERE Industry = 'Technology' 
ORDER BY Name 
LIMIT 100`;

    fs.writeFileSync(path.join(workspacePath, 'HelloWorld.cls'), sampleApexClass);
    fs.writeFileSync(path.join(workspacePath, 'AccountTrigger.trigger'), sampleTrigger);
    fs.writeFileSync(path.join(workspacePath, 'query.soql'), sampleSOQL);
    
    console.log('✅ Created test workspace with sample files');
  }
  
  console.log('🚀 Global setup completed');
}

export default globalSetup;