#!/bin/bash

# Run the performance benchmarks with the correct configuration
cd "$(dirname "$0")/../../" 
NODE_OPTIONS="--experimental-vm-modules" npx jest test/performance/lsp-benchmarks.test.ts -t "LSP Performance Benchmarks" --no-cache 