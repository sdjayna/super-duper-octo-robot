# Contributing to Plotter Art Generator

We love your input! We want to make contributing to the Plotter Art Generator as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the style guidelines
6. Issue that pull request!

## Pull Request Process

1. Update the README.md with details of changes to the interface
2. Update the CHANGELOG.md with notes on your changes
3. The PR will be merged once you have the sign-off of two other developers

## Any Contributions You Make Will Be Under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report Bugs Using GitHub's [Issue Tracker](https://github.com/sdjayna/super-duper-octo-robot/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/sdjayna/super-duper-octo-robot/issues/new).

## Write Bug Reports With Detail, Background, and Sample Code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Use a Consistent Coding Style

* 4 spaces for indentation rather than tabs
* Use JSDoc comments for functions and classes
* 100 character line length
* Run ESLint to ensure style compliance

## Adding a Drawing

1. Decide whether the drawing belongs in `drawings/core/` (maintained presets) or `drawings/community/` (user experiments).
2. Create a module that exports:
   - A config class extending `SizedDrawingConfig` / `PointCloudDrawingConfig` from `drawings/shared/kit.js`.
   - A `draw` function that receives `(drawingConfig, renderContext)` and returns an SVG using `createDrawingRuntime` (also from the kit).
   - A definition created via `defineDrawing({ id, name, configClass, drawFunction, presets })` and exported as the default export.
3. Add at least one preset so the UI shows a selectable example.
4. Run `make manifest` (or `npm run build:drawings`) to refresh `drawings/manifest.json` so the loader picks up your new file.
5. Add or update tests in `tests/drawings.test.js` (or a dedicated spec) to cover the new logic.
6. Run `make test` before opening the pull request.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## References

This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/a9316a723f9e918afde44dea68b5f9f39b7d9b00/CONTRIBUTING.md).
