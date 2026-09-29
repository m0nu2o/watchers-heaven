# Contributing to Lumina

Thank you for taking the time to contribute to Lumina! We welcome contributions from everyone, whether you are fixing a bug, adding a new feature, improving documentation, or optimizing performance.

Please read through these guidelines to ensure a smooth and efficient development process.

## Code of Conduct

By participating in this project, you agree to maintain a respectful, welcoming, and collaborative environment for all contributors.

## How Can I Contribute?

### 1. Reporting Bugs
Before creating a bug report, please check existing Issues to see if the problem has already been reported. If it hasn't, open a new issue and include:
* A clear, descriptive title.
* Steps to reproduce the behavior.
* Expected vs. actual behavior.
* Screenshots or error logs if applicable.
* Environment details (OS, Node.js version, Browser, etc.).

### 2. Suggesting Enhancements
We love new ideas! To suggest an enhancement, open an issue and describe:
* The goal or problem this feature solves.
* A detailed explanation of how it should work.
* Any alternative solutions you've considered.

### 3. Submitting Code Changes

#### Workflow Strategy
1. **Fork the Repository:** Create a personal fork of the repository on GitHub.
2. **Clone Locally:** Clone your fork to your local machine:
   ```bash
   git clone https://github.com/YOUR-USERNAME/lumina.git
   cd lumina
   npm install
   ```
3. **Branching:** Create a descriptive branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **Test Before Committing:**
   ```bash
   npx tsc --noEmit
   npm run build
   ```
5. **Open a Pull Request:** Submit a PR with a concise description of your changes.
