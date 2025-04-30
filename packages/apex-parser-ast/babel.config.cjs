/**
 * Babel configuration for apex-parser-ast package
 */
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        modules: 'commonjs',
      },
    ],
    [
      '@babel/preset-typescript',
      {
        sourceMaps: 'both',
        isTSX: false,
        allExtensions: true,
      },
    ],
  ],
  plugins: [
    // Support for TypeScript import/export syntax
    '@babel/plugin-transform-typescript',
    // Support for ESM syntax
    [
      '@babel/plugin-transform-modules-commonjs',
      {
        allowTopLevelThis: true,
        strictMode: false,
        loose: true,
      },
    ],
  ],
  sourceMaps: 'both',
  retainLines: true,
};
