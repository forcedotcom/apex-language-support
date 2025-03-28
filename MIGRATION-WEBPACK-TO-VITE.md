# Migrating from Webpack to Vite

This document explains the changes made to migrate this monorepo from Webpack to Vite.

## Why Vite?

Vite offers several advantages over Webpack:

- Faster development server with instant HMR (Hot Module Replacement)
- Built-in TypeScript support
- Simpler configuration
- Better ESM support
- Smaller bundle sizes
- Modern defaults

## Changes Made

### 1. Dependencies

Added:

- `vite` - The build tool
- `@rollup/plugin-typescript` - TypeScript support for Rollup (used by Vite)

Removed:

- `webpack`
- `webpack-cli`
- `ts-loader`

### 2. Configuration Files

Each package now has:

- A `vite.config.ts` file instead of `webpack.config.mjs`

Root level:

- Added a root-level `vite.config.ts` for shared configuration

### 3. Key Configuration Differences

#### Webpack (old):

```javascript
export default {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  target: 'node',
};
```

#### Vite (new):

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'utilities',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [
        /* external dependencies */
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
```

### 4. Package.json Scripts

Updated all build scripts to use Vite:

```json
"scripts": {
  "build": "vite build",
  "dev": "vite build --watch"
}
```

### 5. Path Resolution

Vite and Webpack handle path resolution differently:

- Our configuration uses `preserveModules: true` to maintain the directory structure
- We use `entryFileNames: '[name].js'` to keep file names clean
- External dependencies are explicitly defined to avoid bundling them

## Potential Gotchas

1. **ESM Imports**: Vite is ESM-first, so it requires proper ESM import syntax with file extensions (`.js`) for local modules

2. **Node.js Modules**: Some Node.js built-in modules might need polyfills

3. **Dependency Externalization**: You might need to adjust the `external` array in `vite.config.ts` if you encounter missing dependency errors

## Build Instructions

To build all packages:

```bash
npm run build
```

To run development mode with watch:

```bash
npm run dev
```

## Cleanup

After confirming everything works, you can remove the old Webpack configs:

```bash
npm run clean:webpack
```
