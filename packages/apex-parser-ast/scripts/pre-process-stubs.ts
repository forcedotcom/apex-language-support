/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ResourceLoader } from '../src/utils/resourceLoader';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'fflate';

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    // Path to the ZIP file
    const zipPath = path.join(__dirname, '../resources/StandardApexLibrary.zip');
    if (!fs.existsSync(zipPath)) {
        console.error(`Error: ZIP file not found at ${zipPath}`);
        console.log('Please run "npm run precompile" in packages/apex-parser-ast first.');
        process.exit(1);
    }

    const zipBuffer = fs.readFileSync(zipPath);
    
    console.log('📦 Loading ResourceLoader...');
    const loader = ResourceLoader.getInstance({
        loadMode: 'full',
        zipBuffer: new Uint8Array(zipBuffer)
    });
    
    // ResourceLoader initializes itself in the constructor if zipBuffer is provided
    // and starts compileAllArtifacts() if loadMode is 'full'
    
    console.log('🚀 Compiling all standard library classes (this may take a minute)...');
    
    // Wait for compilation to complete
    await loader.waitForCompilation();
    
    console.log('✅ Compilation complete.');
    console.log('🔍 Generating artifacts JSON...');
    
    const artifactsMap = loader.getAllCompiledArtifacts();
    const artifacts: Record<string, any> = {};
    
    // Convert CaseInsensitivePathMap to a plain object for JSON serialization
    let totalSymbols = 0;
    let sampleArtifact: any = null;

    for (const [key, artifact] of artifactsMap.entries()) {
        totalSymbols += artifact.compilationResult.result?.getAllSymbols().length || 0;
        
        artifacts[key] = {
            path: artifact.path,
            compilationResult: {
                // Exclude some potentially large/redundant fields if possible
                result: artifact.compilationResult.result,
                errors: artifact.compilationResult.errors.length > 0 ? artifact.compilationResult.errors : undefined,
                warnings: artifact.compilationResult.warnings.length > 0 ? artifact.compilationResult.warnings : undefined,
            }
        };

        if (!sampleArtifact && key.toLowerCase().includes('system.cls')) {
            sampleArtifact = artifacts[key];
        }
    }
    
    if (sampleArtifact) {
        const sampleSize = JSON.stringify(sampleArtifact).length;
        console.log(`📊 Sample artifact size (System.cls): ${(sampleSize / 1024).toFixed(2)} KB`);
    }
    console.log(`📊 Total symbols across all artifacts: ${totalSymbols}`);
    
    const outputData = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        totalFiles: artifactsMap.size,
        artifacts
    };
    
    console.log(`📝 Serializing ${artifactsMap.size} artifacts...`);
    const serialized = JSON.stringify(outputData);
    const buffer = new TextEncoder().encode(serialized);
    
    console.log('🤐 Compressing with GZIP...');
    const compressed = gzipSync(buffer);
    
    const outputPath = path.join(__dirname, '../resources/StandardApexLibrary.ast.json.gz');
    fs.writeFileSync(outputPath, compressed);
    
    console.log('✨ Success!');
    console.log(`📂 Output: ${outputPath}`);
    console.log(`📊 Original Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Compressed Size: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📄 Total Files: ${artifactsMap.size}`);
}

main().catch((error) => {
    console.error('❌ Error during pre-processing:', error);
    process.exit(1);
});
