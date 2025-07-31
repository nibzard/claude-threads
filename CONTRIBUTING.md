# Contributing to Claude Threads Viewer

Thank you for your interest in contributing to Claude Threads Viewer! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows a simple code of conduct:

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment for all contributors
- Follow best practices for open source collaboration

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a feature branch for your changes

```bash
git clone https://github.com/your-username/claude-threads.git
cd claude-threads
npm install
```

## Development Setup

### Prerequisites

- Node.js 14+ 
- Access to `~/.claude/projects` directory (for testing)
- Modern web browser with ES6 support

### Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Open browser to http://localhost:3000
```

### Project Structure

- `server.js` - Express server (~400 lines)
- `public/app.js` - Frontend application (~800 lines)
- `public/style.css` - Terminal styling
- `public/index.html` - Application shell
- `SPECS.md` - Technical specification

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-dark-mode-toggle`
- `fix/keyboard-navigation-bug`
- `docs/update-api-documentation`

### Commit Messages

Follow conventional commit format:
- `feat: add keyboard shortcut for clearing search`
- `fix: resolve conversation panel toggle issue`
- `docs: update installation instructions`
- `style: improve ASCII art alignment`

## Coding Standards

### JavaScript

- Use vanilla JavaScript (ES6+)
- Follow existing code style and patterns
- Add comments for complex logic
- Ensure browser compatibility

### CSS

- Follow existing naming conventions
- Maintain terminal aesthetic consistency
- Use CSS custom properties for colors
- Ensure responsive design principles

### HTML

- Use semantic HTML elements
- Maintain accessibility standards
- Follow existing structure patterns

## Testing

### Manual Testing Checklist

- [ ] Project loading and navigation
- [ ] Keyboard shortcuts (j/k/h/l/Enter/1/2///g/G/Escape)
- [ ] Search functionality
- [ ] Panel toggling
- [ ] Message expansion/collapse
- [ ] Tool call syntax highlighting
- [ ] Responsive design on mobile

### Browser Testing

Test in these browsers:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Submitting Changes

### Pull Request Process

1. **Create a Pull Request**
   - Use a descriptive title
   - Reference related issues
   - Provide detailed description of changes

2. **PR Description Template**
   ```markdown
   ## Summary
   Brief description of changes made

   ## Changes Made
   - List specific changes
   - Include any breaking changes

   ## Testing
   - Describe testing performed
   - Include screenshots if UI changes

   ## Checklist
   - [ ] Code follows project style guidelines
   - [ ] Manual testing completed
   - [ ] Documentation updated if needed
   ```

3. **Review Process**
   - Address reviewer feedback promptly
   - Make requested changes in new commits
   - Squash commits before merge if requested

## Reporting Issues

### Bug Reports

Include the following information:
- Browser and version
- Operating system
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots if applicable
- Console errors if any

### Feature Requests

Provide:
- Clear description of the feature
- Use case and motivation
- Proposed implementation approach
- Potential impact on existing functionality

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation updates
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed

## Development Guidelines

### Performance Considerations

- Be mindful of file size limits (25MB conversations)
- Consider search result limiting (100 results max)
- Optimize for large project directories
- Test with realistic data sizes

### Security Guidelines

- Maintain read-only file system access
- Validate and escape all user inputs
- Prevent path traversal attacks
- Follow existing security patterns

### Accessibility

- Maintain keyboard navigation support
- Use semantic HTML elements
- Provide appropriate ARIA labels
- Ensure sufficient color contrast

## Questions?

If you have questions about contributing:

1. Check existing issues and documentation
2. Create a new issue with the `question` label
3. Join discussions in existing issues

Thank you for contributing to Claude Threads Viewer!