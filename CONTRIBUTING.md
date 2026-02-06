# Contributing to TYPECAST

🌐 **[日本語版はこちら (Japanese)](./CONTRIBUTING.ja.md)**

Thank you for your interest in contributing to TYPECAST! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- Be respectful and considerate in all interactions
- Provide constructive feedback
- Focus on what is best for the project and community
- Show empathy towards other contributors

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information without permission
- Any conduct that would be inappropriate in a professional setting

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Go 1.25 or higher
- Node.js 20 or higher
- Git
- A GitHub account
- Basic knowledge of React, TypeScript, and Go

### Setting Up Your Development Environment

1. **Fork the repository**
   - Click the "Fork" button on the GitHub repository page

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/typecast.git
   cd typecast
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/typecast.git
   ```

4. **Set up the development environment**
   - Follow the instructions in [README.md](./README.md) to set up backend and frontend

5. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Workflow

### 1. Sync with Upstream

Before starting work, sync your fork with the upstream repository:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications

### 3. Make Your Changes

- Write clean, maintainable code
- Follow the coding standards (see below)
- Add tests for new features
- Update documentation as needed

### 4. Test Your Changes

#### Backend Tests
```bash
go test ./...
```

#### Frontend Tests
```bash
cd typecast-web
npm run lint
npm run build
```

#### Manual Testing
- Test locally with both backend and frontend running
- Verify all affected features work correctly

### 5. Commit Your Changes

Follow the commit guidelines (see below):

```bash
git add .
git commit -m "feat: add new feature description"
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

- Go to your fork on GitHub
- Click "New Pull Request"
- Fill out the PR template
- Wait for review

---

## Coding Standards

### Go (Backend)

- Follow [Effective Go](https://golang.org/doc/effective_go.html) guidelines
- Use `gofmt` to format code
- Handle all errors explicitly (no ignored `err` values)
- Write meaningful variable and function names
- Add comments for exported functions and complex logic
- Keep functions small and focused

Example:
```go
// GetUserHistory retrieves the recommendation history for a user
func GetUserHistory(ctx context.Context, userID string) ([]History, error) {
    if userID == "" {
        return nil, fmt.Errorf("userID cannot be empty")
    }
    
    // Implementation...
    
    return history, nil
}
```

### TypeScript/React (Frontend)

- Use TypeScript for all new code
- Avoid `any` type; use proper type definitions
- Use functional components with hooks
- Follow React best practices
- Use meaningful component and variable names
- Keep components small and reusable

Example:
```typescript
interface MovieCardProps {
  title: string;
  posterUrl: string;
  onSelect: (movieId: string) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ 
  title, 
  posterUrl, 
  onSelect 
}) => {
  return (
    <div onClick={() => onSelect(title)}>
      <img src={posterUrl} alt={title} />
      <h3>{title}</h3>
    </div>
  );
};
```

### General Guidelines

- Write self-documenting code
- Add comments for complex logic
- Keep files under 500 lines when possible
- Use consistent naming conventions
- Remove unused imports and variables
- Avoid deep nesting (max 3-4 levels)

---

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)
- `perf`: Performance improvements

### Examples

```bash
feat(recommend): add MBTI-based movie filtering

Implement filtering logic that uses MBTI psychological functions
to recommend movies that match user's cognitive preferences.

Closes #123
```

```bash
fix(auth): resolve token expiration issue

Fixed bug where expired tokens were not being refreshed properly,
causing users to be logged out unexpectedly.

Fixes #456
```

```bash
docs(readme): update installation instructions

Added missing steps for Firebase configuration and clarified
environment variable setup process.
```

---

## Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Commit messages follow the guidelines
- [ ] Branch is up to date with `main`
- [ ] No merge conflicts

### PR Title

Use the same format as commit messages:

```
feat(scope): brief description
```

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows coding standards
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**: GitHub Actions will run tests automatically
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged

### After Merge

- Delete your feature branch
- Sync your fork with upstream
- Celebrate! 🎉

---

## Reporting Issues

### Before Reporting

- Search existing issues to avoid duplicates
- Verify the issue exists in the latest version
- Collect relevant information (logs, screenshots, etc.)

### Issue Template

```markdown
## Description
Clear description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Go version: [e.g., 1.25]
- Node version: [e.g., 20.10]

## Additional Context
Any other relevant information
```

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `question`: Further information requested

---

## Questions?

If you have questions about contributing, feel free to:

- Open a discussion on GitHub
- Ask in pull request comments
- Contact the maintainers

Thank you for contributing to TYPECAST! 🎬✨
