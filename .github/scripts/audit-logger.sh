#!/bin/bash

# GitHub Actions Audit Logger
# This script provides consistent audit logging across workflows

set -e

# Default values
AUDIT_LOG_DIR="/tmp"
AUDIT_LOG_FILE="github_audit.log"
LOG_LEVEL="INFO"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log audit events
log_audit() {
    local event_type="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local actor="${GITHUB_ACTOR:-unknown}"
    local repo="${GITHUB_REPOSITORY:-unknown}"
    local run_id="${GITHUB_RUN_ID:-unknown}"
    local workflow="${GITHUB_WORKFLOW:-unknown}"
    local ref="${GITHUB_REF:-unknown}"
    
    # Create structured log entry
    local log_entry="[$timestamp] $event_type: actor=$actor, repo=$repo, run_id=$run_id, workflow=$workflow, ref=$ref, message=\"$message\""
    
    # Write to audit log file
    echo "$log_entry" >> "$AUDIT_LOG_DIR/$AUDIT_LOG_FILE"
    
    # Output to console with color coding
    case $event_type in
        *SUCCESS*)
            echo -e "${GREEN}✅ AUDIT: $event_type - $timestamp${NC}"
            ;;
        *FAILURE*|*ERROR*)
            echo -e "${RED}❌ AUDIT: $event_type - $timestamp${NC}"
            ;;
        *ATTEMPT*|*START*)
            echo -e "${BLUE}🔍 AUDIT: $event_type - $timestamp${NC}"
            ;;
        *WARNING*)
            echo -e "${YELLOW}⚠️  AUDIT: $event_type - $timestamp${NC}"
            ;;
        *)
            echo -e "${BLUE}🔍 AUDIT: $event_type - $timestamp${NC}"
            ;;
    esac
    
    # Output additional context
    echo "  Actor: $actor"
    echo "  Repository: $repo"
    echo "  Run ID: $run_id"
    echo "  Workflow: $workflow"
    echo "  Ref: $ref"
    echo "  Message: $message"
    echo ""
}

# Function to log security events
log_security_event() {
    local event_type="$1"
    local details="$2"
    local severity="${3:-INFO}"
    
    log_audit "SECURITY_${event_type}" "$details (severity: $severity)"
}

# Function to log workflow events
log_workflow_event() {
    local event_type="$1"
    local details="$2"
    
    log_audit "WORKFLOW_${event_type}" "$details"
}

# Function to log publish events
log_publish_event() {
    local event_type="$1"
    local tool="$2"
    local file="$3"
    local marketplace="$4"
    local dry_run="${5:-false}"
    
    local details="tool=$tool, file=$file, marketplace=$marketplace, dry_run=$dry_run"
    log_audit "PUBLISH_${event_type}" "$details"
}

# Function to log merge events
log_merge_event() {
    local event_type="$1"
    local pr_number="$2"
    local pr_title="$3"
    local pr_author="$4"
    local merge_method="${5:-unknown}"
    
    local details="pr_number=$pr_number, pr_title=\"$pr_title\", pr_author=$pr_author, merge_method=$merge_method"
    log_audit "MERGE_${event_type}" "$details"
}

# Function to log release events
log_release_event() {
    local event_type="$1"
    local branch="$2"
    local registry="$3"
    local marketplace="$4"
    local dry_run="${5:-false}"
    
    local details="branch=$branch, registry=$registry, marketplace=$marketplace, dry_run=$dry_run"
    log_audit "RELEASE_${event_type}" "$details"
}

# Function to validate file integrity
audit_file_integrity() {
    local file_path="$1"
    local file_name=$(basename "$file_path")
    
    if [ ! -f "$file_path" ]; then
        log_security_event "FILE_MISSING" "File not found: $file_path" "HIGH"
        return 1
    fi
    
    # Get file information
    local file_size=$(stat -c%s "$file_path" 2>/dev/null || stat -f%z "$file_path" 2>/dev/null || echo "unknown")
    local file_hash=$(sha256sum "$file_path" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
    local file_perms=$(stat -c%a "$file_path" 2>/dev/null || stat -f%Lp "$file_path" 2>/dev/null || echo "unknown")
    
    log_security_event "FILE_INTEGRITY" "file=$file_name, size=$file_size, hash=$file_hash, perms=$file_perms" "INFO"
    
    # Check for suspicious file permissions
    if [ "$file_perms" != "644" ] && [ "$file_perms" != "600" ] && [ "$file_perms" != "640" ]; then
        log_security_event "FILE_PERMS_WARNING" "Suspicious file permissions: $file_perms for $file_name" "MEDIUM"
    fi
    
    echo "$file_hash"
}

# Function to audit environment variables
audit_environment() {
    local sensitive_vars=("GITHUB_TOKEN" "VSCE_PERSONAL_ACCESS_TOKEN" "OVSX_PAT" "NPM_TOKEN")
    
    for var in "${sensitive_vars[@]}"; do
        if [ -n "${!var}" ]; then
            # Check if token is exposed in logs (should be masked)
            if [[ "${!var}" == *"ghp_"* ]] || [[ "${!var}" == *"gho_"* ]] || [[ "${!var}" == *"ghu_"* ]] || [[ "${!var}" == *"ghs_"* ]] || [[ "${!var}" == *"ghr_"* ]]; then
                log_security_event "TOKEN_EXPOSURE" "GitHub token detected in environment variable: $var" "CRITICAL"
            else
                log_security_event "TOKEN_PRESENT" "Token present in environment variable: $var" "INFO"
            fi
        else
            log_security_event "TOKEN_MISSING" "Expected token not found in environment variable: $var" "WARNING"
        fi
    done
}

# Function to audit workflow inputs
audit_workflow_inputs() {
    local inputs="$1"
    
    if [ -n "$inputs" ]; then
        log_security_event "WORKFLOW_INPUTS" "Workflow inputs: $inputs" "INFO"
        
        # Check for potentially dangerous inputs
        if [[ "$inputs" == *"../"* ]] || [[ "$inputs" == *"..\\"* ]]; then
            log_security_event "PATH_TRAVERSAL" "Potential path traversal detected in inputs: $inputs" "HIGH"
        fi
        
        if [[ "$inputs" == *"<script"* ]] || [[ "$inputs" == *"javascript:"* ]]; then
            log_security_event "XSS_ATTEMPT" "Potential XSS attempt detected in inputs: $inputs" "HIGH"
        fi
    fi
}

# Function to generate audit report
generate_audit_report() {
    local report_file="$AUDIT_LOG_DIR/audit_report_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "=== GitHub Actions Audit Report ===" > "$report_file"
    echo "Generated: $(date -u)" >> "$report_file"
    echo "Repository: ${GITHUB_REPOSITORY:-unknown}" >> "$report_file"
    echo "Workflow: ${GITHUB_WORKFLOW:-unknown}" >> "$report_file"
    echo "Run ID: ${GITHUB_RUN_ID:-unknown}" >> "$report_file"
    echo "Actor: ${GITHUB_ACTOR:-unknown}" >> "$report_file"
    echo "" >> "$report_file"
    
    # Count events by type
    echo "=== Event Summary ===" >> "$report_file"
    if [ -f "$AUDIT_LOG_DIR/$AUDIT_LOG_FILE" ]; then
        grep -o "\[.*\] [A-Z_]*:" "$AUDIT_LOG_DIR/$AUDIT_LOG_FILE" | cut -d' ' -f2 | sort | uniq -c | sort -nr >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "=== Recent Events ===" >> "$report_file"
    if [ -f "$AUDIT_LOG_DIR/$AUDIT_LOG_FILE" ]; then
        tail -20 "$AUDIT_LOG_DIR/$AUDIT_LOG_FILE" >> "$report_file"
    fi
    
    echo "Audit report generated: $report_file"
    log_workflow_event "REPORT_GENERATED" "report_file=$report_file"
}

# Main execution
case "${1:-help}" in
    "log")
        log_audit "$2" "$3"
        ;;
    "security")
        log_security_event "$2" "$3" "$4"
        ;;
    "workflow")
        log_workflow_event "$2" "$3"
        ;;
    "publish")
        log_publish_event "$2" "$3" "$4" "$5" "$6"
        ;;
    "merge")
        log_merge_event "$2" "$3" "$4" "$5" "$6"
        ;;
    "release")
        log_release_event "$2" "$3" "$4" "$5" "$6"
        ;;
    "file-integrity")
        audit_file_integrity "$2"
        ;;
    "audit-env")
        audit_environment
        ;;
    "audit-inputs")
        audit_workflow_inputs "$2"
        ;;
    "report")
        generate_audit_report
        ;;
    "help"|*)
        echo "GitHub Actions Audit Logger"
        echo ""
        echo "Usage: $0 <command> [arguments]"
        echo ""
        echo "Commands:"
        echo "  log <event_type> <message>                    - Log a generic audit event"
        echo "  security <event_type> <details> [severity]    - Log a security event"
        echo "  workflow <event_type> <details>               - Log a workflow event"
        echo "  publish <event_type> <tool> <file> <marketplace> [dry_run] - Log a publish event"
        echo "  merge <event_type> <pr_number> <pr_title> <pr_author> [merge_method] - Log a merge event"
        echo "  release <event_type> <branch> <registry> <marketplace> [dry_run] - Log a release event"
        echo "  file-integrity <file_path>                    - Audit file integrity"
        echo "  audit-env                                      - Audit environment variables"
        echo "  audit-inputs <inputs>                         - Audit workflow inputs"
        echo "  report                                         - Generate audit report"
        echo "  help                                           - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 security TOKEN_EXPOSURE 'Token found in logs' HIGH"
        echo "  $0 publish ATTEMPT vsce extension.vsix 'VS Code Marketplace' false"
        echo "  $0 file-integrity ./packages/extension.vsix"
        ;;
esac 