#!/bin/bash

# Script to test the standalone Apex Language Server with a GitHub repository

# Build the project first
cd "$(dirname "$0")/.."
npm run build

# Example repository with Apex code (this is the official Apex recipes repository)
REPO_URL="https://github.com/salesforce/apex-recipes.git"

# Run the standalone server with the GitHub repository
echo "Starting Apex Language Server with repository: $REPO_URL"
echo "Press Ctrl+C to exit"
npm run start:standalone -- --source "$REPO_URL" 