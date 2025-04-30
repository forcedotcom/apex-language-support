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
  sourceMaps: 'both',
  retainLines: true,
};
