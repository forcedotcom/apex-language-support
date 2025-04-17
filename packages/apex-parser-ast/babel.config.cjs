/**
 * Babel configuration for apex-parser-ast package
 */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
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
};
