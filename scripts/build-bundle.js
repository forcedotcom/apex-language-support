const { build } = require('tsup');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function runBuild() {
  try {
    const packageDir = process.cwd();
    const entries = [];
    const indexPath = path.join(packageDir, 'src/index.ts');
    const extensionPath = path.join(packageDir, 'src/extension.ts');
    if (fs.existsSync(indexPath)) entries.push('src/index.ts');
    if (fs.existsSync(extensionPath)) entries.push('src/extension.ts');
    if (entries.length === 0) {
      throw new Error(
        'No entry points found (src/index.ts or src/extension.ts)',
      );
    }

    // First, generate declaration files using tsc
    console.log('Generating declaration files...');
    execSync(
      `npx tsc --project "${path.join(packageDir, 'tsconfig.json')}" --declaration --emitDeclarationOnly`,
      {
        stdio: 'inherit',
      },
    );

    // Then, generate bundles using tsup
    console.log('Generating bundles...');
    await build({
      entry: entries,
      config: path.resolve(__dirname, '../tsup.config.ts'),
      tsconfig: path.join(packageDir, 'tsconfig.json'),
      dts: false,
    });
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

runBuild();
