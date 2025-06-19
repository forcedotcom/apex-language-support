/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const fs = require('fs');
const path = require('path');

/**
 * Reads the root turbo.json configuration and extracts defined targets
 * @returns {string[]} Array of turbo target names
 */
function getTurboTargets() {
  try {
    // Find the workspace root by looking for turbo.json
    let currentDir = process.cwd();
    let turboJsonPath = null;

    while (currentDir !== path.dirname(currentDir)) {
      const potentialTurboPath = path.join(currentDir, 'turbo.json');
      if (fs.existsSync(potentialTurboPath)) {
        turboJsonPath = potentialTurboPath;
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    if (!turboJsonPath) {
      return [];
    }

    const turboConfig = JSON.parse(fs.readFileSync(turboJsonPath, 'utf8'));
    const targets = Object.keys(turboConfig.tasks || {});

    // Filter out package-specific targets (those with # in the name)
    return targets.filter((target) => !target.includes('#'));
  } catch (error) {
    console.warn('Failed to read turbo.json:', error.message);
    return [];
  }
}

/**
 * ESLint rule to check package.json scripts for direct usage of turbo targets
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent direct execution of turbo targets in package.json scripts',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowedDirectTargets: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Array of turbo targets that are allowed to be run directly',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      directTurboTarget:
        'Script "{{scriptName}}" directly runs turbo target "{{target}}". Consider using "turbo run {{target}}" instead.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedDirectTargets = new Set(options.allowedDirectTargets || []);
    const turboTargets = new Set(getTurboTargets());

    return {
      Program(node) {
        const filename = context.getFilename();

        // Only process package.json files
        if (!filename.endsWith('package.json')) {
          return;
        }

        try {
          const packageJsonContent = fs.readFileSync(filename, 'utf8');
          const packageJson = JSON.parse(packageJsonContent);

          if (!packageJson.scripts) {
            return;
          }

          // Check each script for direct turbo target usage
          Object.entries(packageJson.scripts).forEach(
            ([scriptName, scriptCommand]) => {
              if (typeof scriptCommand !== 'string') {
                return;
              }

              // Skip if this script name is in the allowed direct targets
              if (allowedDirectTargets.has(scriptName)) {
                return;
              }

              // Special case mappings of common commands to turbo targets
              const commandToTargetMap = {
                tsc: 'compile',
                'tsc --build': 'compile',
                jest: 'test',
                'jest --coverage': 'test:coverage',
                tsup: 'bundle',
                eslint: 'lint',
                rimraf: 'clean',
              };

              const normalizedCommand = scriptCommand.trim();
              const firstWord = normalizedCommand.split(' ')[0];

              let mappedTarget = null;

              // Check specific command patterns first (before the generic map)
              if (normalizedCommand.startsWith('tsc')) {
                mappedTarget = 'compile';
              } else if (normalizedCommand.startsWith('jest')) {
                // Check script name first to determine if it's a coverage script
                if (
                  scriptName.includes('coverage') ||
                  normalizedCommand.includes('--coverage')
                ) {
                  mappedTarget = 'test:coverage';
                } else {
                  mappedTarget = 'test';
                }
              } else if (normalizedCommand.startsWith('tsup')) {
                mappedTarget = 'bundle';
              } else if (normalizedCommand.startsWith('eslint')) {
                // Check script name first to determine if it's a fix script
                if (
                  scriptName.includes('fix') ||
                  normalizedCommand.includes('--fix')
                ) {
                  mappedTarget = 'lint:fix';
                } else {
                  mappedTarget = 'lint';
                }
              } else if (normalizedCommand.startsWith('rimraf')) {
                // Check script name first to determine specific clean target
                if (
                  scriptName.includes('coverage') ||
                  scriptName === 'clean:coverage'
                ) {
                  mappedTarget = 'clean:coverage';
                } else if (
                  scriptName.includes('all') ||
                  scriptName === 'clean:all' ||
                  normalizedCommand.includes('node_modules')
                ) {
                  mappedTarget = 'clean:all';
                } else {
                  mappedTarget = 'clean';
                }
              } else {
                // Fall back to exact command mapping
                mappedTarget =
                  commandToTargetMap[normalizedCommand] ||
                  commandToTargetMap[firstWord];
              }

              // If we found a mapped target and it exists in turbo targets, report it
              if (mappedTarget && turboTargets.has(mappedTarget)) {
                // Skip if this script name matches the target (it's probably the intended implementation)
                if (scriptName === mappedTarget) {
                  return;
                }

                // Calculate the line number where this script appears
                const lines = packageJsonContent.split('\n');
                let scriptLine = 1;
                let scriptColumn = 1;

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  if (line.includes(`"${scriptName}"`)) {
                    scriptLine = i + 1;
                    scriptColumn = line.indexOf(`"${scriptName}"`) + 1;
                    break;
                  }
                }

                context.report({
                  node,
                  loc: {
                    start: { line: scriptLine, column: scriptColumn },
                    end: {
                      line: scriptLine,
                      column: scriptColumn + scriptName.length + 2,
                    }, // +2 for quotes
                  },
                  messageId: 'directTurboTarget',
                  data: {
                    scriptName,
                    target: mappedTarget,
                  },
                  fix(fixer) {
                    // Suggest using turbo run instead
                    const newScriptCommand = `turbo run ${mappedTarget}`;

                    // This is a simplistic fix - in practice, you might want more sophisticated logic
                    const sourceCode = context.getSourceCode();
                    const text = sourceCode.getText();
                    const oldLine = `"${scriptName}": "${scriptCommand}"`;
                    const newLine = `"${scriptName}": "${newScriptCommand}"`;

                    if (text.includes(oldLine)) {
                      const range = [
                        text.indexOf(oldLine),
                        text.indexOf(oldLine) + oldLine.length,
                      ];
                      return fixer.replaceTextRange(range, newLine);
                    }

                    return null;
                  },
                });
              }
            },
          );
        } catch (error) {
          // Silently ignore JSON parsing errors
          return;
        }
      },
    };
  },
};
