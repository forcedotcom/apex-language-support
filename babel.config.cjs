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
  plugins: [['@babel/plugin-transform-modules-commonjs']],
  sourceMaps: 'both',
  retainLines: true,
};
