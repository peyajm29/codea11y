# CodeA11y

CodeA11y is a Visual Studio Code extension that integrates with GitHub Copilot to help developers identify and fix accessibility issues in web projects. It combines AI-powered guidance with automated analysis (axe-core) and a simple TODO tracker for accessibility work.

Key goals:
- Surface WCAG 2.1 (Level A / AA) relevant issues while you work
- Provide actionable, context-aware suggestions through Copilot Chat
- Make it simple to track accessibility fixes in your codebase

## Features

- AI-assisted accessibility guidance via GitHub Copilot Chat
- Automated accessibility scanning powered by axe-core
- In-editor TODO management for accessibility remediation
- Configurable website URL and analysis timeout

## Installation

Install the extension from the Visual Studio Code Marketplace and make sure GitHub Copilot is enabled in your editor. After installation configure the extension settings (see Configuration below).

## Configuration

You can configure the extension from the VS Code Settings UI or by editing your settings.json. The main settings are:

- `codea11y.websiteUrl` (string) — The URL of the site to analyze. Default: `http://127.0.0.1:5500`.
- `codea11y.timeout` (number) — Request timeout in milliseconds for fetching site content. Default: `10000`.

Examples:

{
	// settings.json
	"codea11y.websiteUrl": "http://localhost:3000",
	"codea11y.timeout": 15000
}

## Usage

1. Open the GitHub Copilot Chat pane in VS Code.
2. Invoke the CodeA11y participant (use `@CodeA11y` in the chat input when available).
3. Ask for accessibility guidance or request a scan of the configured website.
4. Review findings and add or address TODO items created by the extension.

Notes:
- For best results run the website locally or on a reachable dev server so axe-core can crawl and analyze the pages.

## Development

Project commands (from the repository root):

- Install dependencies: `npm install`
- Build: `npm run compile`
- Watch (development): `npm run watch`
- Lint: `npm run lint`

The extension is written in TypeScript; the compiled output is emitted to the `out/` directory and `./out/extension.js` is the extension entry point.

## Contributing

Contributions are welcome. A healthy contribution flow:

1. Fork the repository and create a branch for your feature/bugfix.
2. Make changes and run linting/build locally.
3. Open a PR with a clear description and link to any related issue.

Please follow the repository coding style and commit message guidelinest. Using conventional commits (feat:, fix:, chore:, etc.) makes changelog automation easier.

## License


## Further reading

- WCAG 2.1: https://www.w3.org/TR/WCAG21/
- axe-core: https://github.com/dequelabs/axe-core
