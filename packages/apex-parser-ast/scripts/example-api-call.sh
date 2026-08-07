#!/bin/bash
# Example: How to call the Apex Symbol Table API using sf cli
#
# This demonstrates the API call pattern for the new stub generator
#
# Usage:
#   ./example-api-call.sh <org-alias> <category> [namespace] [name]
#
# Examples:
#   ./example-api-call.sh myorg CLASS
#   ./example-api-call.sh myorg CLASS System
#   ./example-api-call.sh myorg CLASS System String

ORG_ALIAS="${1:-gus}"
CATEGORY="${2:-CLASS}"
NAMESPACE="$3"
NAME="$4"

# Build the query string
QUERY="category=${CATEGORY}"
if [ -n "$NAMESPACE" ]; then
  QUERY="${QUERY}&namespace=${NAMESPACE}"
fi
if [ -n "$NAME" ]; then
  QUERY="${QUERY}&name=${NAME}"
fi

# Construct the full URL
# Note: You'll need to determine the correct API version
API_VERSION="v67.0"
URL="/services/data/${API_VERSION}/tooling/symbols?${QUERY}"

echo "Fetching: ${URL}"
echo "From org: ${ORG_ALIAS}"
echo ""

# Make the API request
# The response will be JSON with a "typeStubs" array
sf api request rest "${URL}" -o "${ORG_ALIAS}" | jq '.'

# Example response structure:
# {
#   "typeStubs": [
#     {
#       "name": "String",
#       "kind": "CLASS",
#       "modifiers": ["global"],
#       "namespace": "System",
#       "fields": [...],
#       "properties": [...],
#       "methods": [...]
#     }
#   ]
# }
