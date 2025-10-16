# Changelog

All notable changes to this project will be documented in this file. The format is based on "Keep a Changelog" and this project follows Semantic Versioning.

## [0.1.0] - 2025-10-16

### Added
- N/A

### Changed
- N/A

### Fixed
- Context window issue for chat participant
    - Filtered logs to only feed violations data to the model 
    - Sorted Violations by severity and only included the top 3 violations in the context window if there are too many violations
    - Truncated long violation details to fit within the context window

## [0.0.4] - 2025-10-08

### Added
- LICENSE file with MIT License

### Changed
- N/A

### Fixed
- The axe-cli tool is missing or not installed correctly error

## [0.0.3] - 2025-10-08

### Added
- N/A

### Changed
- Documentation improvements and README rework

### Fixed
- N/A

## [0.0.2] - 2025-10-06

### Added
- Initial public extension features: Copilot chat integration, axe-core analysis, and TODO management for accessibility fixes.

### Fixed
- N/A
