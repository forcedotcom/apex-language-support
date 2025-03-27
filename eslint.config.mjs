/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import jsdocPlugin from "eslint-plugin-jsdoc";
import typescriptParser from "@typescript-eslint/parser";
import header from "@tony.ganchev/eslint-plugin-header";

export default [
  {
    files: ["**/*.ts", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parser: typescriptParser,
      globals: {
        // Add any global variables here if needed
        console: "readonly",
        process: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
      header: header,
      prettier: prettierPlugin,
      import: importPlugin,
      "unused-imports": unusedImportsPlugin,
      jsdoc: jsdocPlugin,
    },
    rules: {
      "prettier/prettier": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error"],
      "arrow-body-style": ["error", "as-needed"],
      "unused-imports/no-unused-imports": "error",
      "jsdoc/check-alignment": "warn",
      "jsdoc/check-indentation": "warn",
      "header/header": [
        "error",
        "block",
        [
          "",
          {
            pattern: " \\* Copyright \\(c\\) \\d{4}, salesforce\\.com, inc\\.",
            template: " * Copyright (c) 2025, salesforce.com, inc.",
          },
          " * All rights reserved.",
          " * Licensed under the BSD 3-Clause license.",
          " * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause",
          " ",
        ],
      ],
    },
  },
];
