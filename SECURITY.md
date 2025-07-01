# Security Policy

## Supported Versions

We release patches to fix security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of our software seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

- **Email**: security@forcedotcom.com
- **Subject**: [SECURITY] Apex Language Support - [Brief Description]

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the requested information listed below (as much as you can provide) to help us better understand the nature and scope of the possible issue:

- Type of issue (buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Preferred Languages

We prefer all communications to be in English.

## Disclosure Policy

When we receive a security bug report, we will assign it to a primary handler. This person will coordinate the fix and release process, involving the following steps:

1. Confirm the problem and determine the affected versions.
2. Audit code to find any similar problems.
3. Prepare fixes for all supported versions. These fixes will be released as new versions.

## Security Best Practices

### For Contributors

1. **Never commit secrets or sensitive data** to the repository
2. **Use environment variables** for configuration
3. **Validate all inputs** before processing
4. **Follow secure coding practices** and use linting tools
5. **Review dependencies** regularly for security updates

### For Users

1. **Keep your dependencies updated** to the latest secure versions
2. **Use the latest stable release** of our software
3. **Report security issues** through the proper channels
4. **Follow security best practices** in your development environment

## Security Features

This repository includes several security features:

- **Secret Scanning**: Automatically detects secrets in code
- **Dependency Scanning**: Monitors for vulnerable dependencies
- **Code Scanning**: Static analysis for security issues
- **Branch Protection**: Prevents unauthorized changes to main branches
- **Required Reviews**: Ensures code changes are reviewed before merging

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.1, 1.0.2) and will be clearly marked in the release notes. Critical security fixes may be released as hotfixes outside the normal release schedule.

## Acknowledgments

We would like to thank all security researchers and contributors who help us maintain the security of our software by responsibly reporting vulnerabilities.
