# Git Hooks

This directory contains Git hooks managed by [husky](https://typicode.github.io/husky/) to enforce code quality and consistent commit messages.

## Hooks

- **commit-msg**: Validates that commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format.
- **pre-commit**: Runs linting before allowing commits to ensure code quality.

## Using Conventional Commits

Instead of creating commits with `git commit`, use:

```bash
npm run commit
```

This will start an interactive prompt that helps you create properly formatted commit messages.

## Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

For more details, see the [CONTRIBUTING.md](../CONTRIBUTING.md) file.
