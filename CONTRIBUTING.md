# Contributing to Sidequest

Thank you for your interest in contributing to **Sidequest**! 🎉  
We welcome contributions from everyone. This guide will help you get started.

## Table of Contents

- [Contributing to Sidequest](#contributing-to-sidequest)
  - [Table of Contents](#table-of-contents)
  - [How Can I Contribute?](#how-can-i-contribute)
    - [Reporting Bugs](#reporting-bugs)
    - [Suggesting Enhancements](#suggesting-enhancements)
    - [Submitting Pull Requests](#submitting-pull-requests)
      - [Pull Request Checklist](#pull-request-checklist)
  - [Development Setup](#development-setup)
  - [Style Guide](#style-guide)
  - [Commit Messages](#commit-messages)
  - [License](#license)

---

## How Can I Contribute?

### Reporting Bugs

- Please use [GitHub Issues](https://github.com/sidequestjs/sidequest/issues) to report bugs.
- Include as much information as possible, such as:
  - Steps to reproduce
  - Expected and actual behavior
  - Error messages and logs
  - Node.js and OS version
  - A minimal reproducible example, if possible

### Suggesting Enhancements

- Before opening a new issue, check [existing issues](https://github.com/sidequestjs/sidequest/issues).
- Clearly describe the enhancement and its benefits.
- Include relevant examples or use cases.

### Submitting Pull Requests

1. **Fork the repository** and clone your fork locally.
2. **Create a new branch** for your feature or fix:
   ```bash
   git checkout -b your-feature-name
   ```
3. **Make your changes**
4. **🚨 Write tests 🚨**
5. **Follow the style guide** (see below).
6. **Lint your code** `yarn lint`
7. **Commit your changes** (see [Commit Messages](#commit-messages)).
8. **Push your branch** and open a Pull Request against `master`.
9. **Describe your changes** clearly in the PR.

#### Pull Request Checklist

- [ ] All tests pass (`yarn test:all`)
- [ ] Code follows the style guide and passes lint checks
- [ ] Documentation is updated (README, docs, etc)
- [ ] Linked to corresponding issue, if applicable

## Development Setup

1. **Install dependencies**:

   ```bash
   yarn install
   ```

2. **Build the project**:

   ```bash
   yarn build
   ```

3. **Start DBs for tests**:

   ```bash
   yarn db:all
   ```

4. **Run tests**:

   ```bash
   yarn test:all
   ```

5. **Run in development mode**:

   ```bash
   yarn dev
   ```

For CLI development, install globally:

```bash
yarn global add @sidequest/cli
```

## Style Guide

- Use [TypeScript](https://www.typescriptlang.org/) for all source code.
- Follow the project's existing code style (see `prettier.config.js`).
- Write [JSDoc](https://www.typescriptlang.org/doc/comments/) style docstrings for all exported entities.
- Avoid unnecessary changes to unrelated files.

## Commit Messages

- Use [Conventional Commits](https://www.conventionalcommits.org/) style:
  - `fix:` for bug fixes
  - `feat:` for new features
  - `docs:` for documentation changes
  - `refactor:` for code refactoring
  - `test:` for adding or fixing tests
  - `chore:` for maintenance tasks

## License

By contributing, you agree that your contributions will be licensed under the [LGPL v3](LICENSE.md).

---

If you have any questions, feel free to open an issue or reach out to the maintainers.

Happy coding! 🚀
