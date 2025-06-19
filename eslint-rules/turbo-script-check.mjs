/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'fs';
import path from 'path';

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
 * ESLint rule to prevent circular dependencies and warn about unfiltered turbo usage
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent circular dependencies and warn about unfiltered turbo run calls in package.json scripts',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedDirectTargets: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Array of turbo targets that are allowed to be called directly',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      turboCircular:
        'Script "{{scriptName}}" calls "turbo run {{target}}" which creates a circular dependency. Turbo will call this script when running "{{target}}".',
      turboUnfiltered:
        'Script "{{scriptName}}" calls "turbo run {{target}}" without a filter, which will run across all packages. Consider using --filter to scope to specific packages or call the local script directly.',
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

          // Skip if this is the root package.json (which should orchestrate with turbo)
          const isRootPackage =
            packageJson.workspaces && Array.isArray(packageJson.workspaces);
          if (isRootPackage) {
            return;
          }

          // Check each script for circular dependencies and unfiltered turbo usage
          Object.entries(packageJson.scripts).forEach(
            ([scriptName, scriptCommand]) => {
              if (typeof scriptCommand !== 'string') {
                return;
              }

              // Skip if this script name is in the allowed direct targets
              if (allowedDirectTargets.has(scriptName)) {
                return;
              }

              const normalizedCommand = scriptCommand.trim();

              // Check for direct turbo calls
              const turboRunMatch = normalizedCommand.match(/turbo run (\S+)/);
              if (turboRunMatch) {
                const turboTarget = turboRunMatch[1];
                if (turboTargets.has(turboTarget)) {
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

                  // Determine if this is a circular dependency or just unfiltered usage
                  const isCircular = scriptName === turboTarget;
                  const hasFilter = normalizedCommand.includes('--filter');

                  if (isCircular) {
                    // Circular dependency - error
                    context.report({
                      node,
                      loc: {
                        start: { line: scriptLine, column: scriptColumn },
                        end: {
                          line: scriptLine,
                          column: scriptColumn + scriptName.length + 2,
                        }, // +2 for quotes
                      },
                      messageId: 'turboCircular',
                      data: {
                        scriptName,
                        target: turboTarget,
                      },
                      severity: 0, // 0 = error
                    });
                  } else if (!hasFilter) {
                    // Unfiltered turbo usage - warning
                    context.report({
                      node,
                      loc: {
                        start: { line: scriptLine, column: scriptColumn },
                        end: {
                          line: scriptLine,
                          column: scriptColumn + scriptName.length + 2,
                        }, // +2 for quotes
                      },
                      messageId: 'turboUnfiltered',
                      data: {
                        scriptName,
                        target: turboTarget,
                      },
                      severity: 1, // 1 = warning
                    });
                  }
                }
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
