#!/bin/bash
# Example: How to call the Apex Symbol Table API using sf cli
#
# This demonstrates the API call pattern for the new stub generator
#
# Usage:
#   ./example-api-call.sh [org-alias] [namespace]
#
# Examples:
#   ./example-api-call.sh myorg
#   ./example-api-call.sh myorg System

ORG_ALIAS="${1:-gus}"
NAMESPACE="$2"

ARGS=(--org "${ORG_ALIAS}")
if [ -n "${NAMESPACE}" ]; then
  ARGS+=(--namespace "${NAMESPACE}")
fi

# Invoke the shipping script. It uses category=BUILTIN and API version latest by default.
node "$(dirname "$0")/fetch-api-stubs.mjs" "${ARGS[@]}"

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
