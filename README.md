# CodeA11y - Accessibility GitHub Copilot Extension

CodeA11y is a GitHub Copilot extension that helps developers write accessible code that conforms to WCAG 2.1 Level A and AA success criteria.

## Features

- 🤖 AI-powered accessibility guidance through GitHub Copilot Chat
- 🔍 Automated accessibility analysis using axe-core
- 📋 TODO management for accessibility fixes
- 🎯 Context-aware suggestions based on your current code

## Installation

1. Install the extension from the VS Code marketplace
2. Ensure you have GitHub Copilot enabled
3. Configure your website URL in settings

## Configuration

- `codea11y.websiteUrl`: The URL of your website to analyze (default: http://127.0.0.1:5500)
- `codea11y.timeout`: Timeout for website analysis in milliseconds (default: 10000)

## Usage

1. Open the GitHub Copilot Chat panel
2. Use `@CodeA11y` to interact with the accessibility assistant
3. Ask questions about making your code more accessible
4. Get real-time analysis of your website's accessibility issues

## Development

- Run `npm install` to install dependencies
- Run `npm run compile` to build the extension
- Run `npm run watch` for development with auto-compilation
- Run `npm run lint` to check code quality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[Add your license here]
