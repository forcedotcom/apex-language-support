# Git Hooks

This directory contains Git hooks managed by [husky](https://typicode.github.io/husky/) to enforce code quality and consistent commit messages.

## Hooks

- **commit-msg**: Validates that commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format.
- **pre-commit**: Runs linting before allowing commits to ensure code quality.

## Using Conventional Commits

Create commits with `git commit` and follow the conventional commit format below.
The `commit-msg` hook validates the message before the commit is accepted.

## Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

For more details, see the [CONTRIBUTING.md](../CONTRIBUTING.md) file.
