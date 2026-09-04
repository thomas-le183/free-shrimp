# Changelog

## 1.1.0 (2026-09-04)


### ⚠ BREAKING CHANGES

* use release-please as a changelog generator only
* add tag comparison utils, parseTag now throws ([#5](https://github.com/thomas-le183/free-shrimp/issues/5))

### Features

* add release tag parser ([fb81150](https://github.com/thomas-le183/free-shrimp/commit/fb8115059b3acabd880f25e1920731052fcf0249))
* add tag bumping utils ([#8](https://github.com/thomas-le183/free-shrimp/issues/8)) ([f6e656e](https://github.com/thomas-le183/free-shrimp/commit/f6e656e548731ea93ad94296da4402c08126444a))
* add tag comparison utils, parseTag now throws ([#5](https://github.com/thomas-le183/free-shrimp/issues/5)) ([d00f402](https://github.com/thomas-le183/free-shrimp/commit/d00f4021991969c50fec8ea1d2637b0894b7e9ef))
* consolidate release-please onto dev with full changelog coverage ([b19fa45](https://github.com/thomas-le183/free-shrimp/commit/b19fa45f7f0ac4ea604e94de4d3de28a4ebf9096))
* use release-please as a changelog generator only ([ef1dadc](https://github.com/thomas-le183/free-shrimp/commit/ef1dadc7dd3cd99b063d3ac9e5fc4a25e122da39))


### Bug Fixes

* **ci:** settle release PRs left pending by skip-github-release ([#9](https://github.com/thomas-le183/free-shrimp/issues/9)) ([44b76ce](https://github.com/thomas-le183/free-shrimp/commit/44b76cef5f85fb6f151a53ef1968f7bbec45de27))
* drop rc prerelease versioning, use plain semver ([fe0d291](https://github.com/thomas-le183/free-shrimp/commit/fe0d291e767fd93ec849b7ae6d4be8007d63feef))
* start the first release at 0.1.0 instead of 1.0.0 ([fafc2e4](https://github.com/thomas-le183/free-shrimp/commit/fafc2e424dbb06c45c0fd4a0287155e3fbe4bf2a))
* surface every merged PR to QC in the changelog ([4acc5cf](https://github.com/thomas-le183/free-shrimp/commit/4acc5cf34ceac0c44e80820639e286c5a9173a71))


### Documentation

* explain switching between rc and stable versions ([e50e693](https://github.com/thomas-le183/free-shrimp/commit/e50e69379895e5ebf66cfc36de71d99952e7139b))
* match the README to the CHANGELOG-DEV.md path and real branch name ([71307a7](https://github.com/thomas-le183/free-shrimp/commit/71307a71c7d31a9e5d65d1ef496190a59fbc8e0b))


### Build System

* add package.json and switch release-please to the node strategy ([8af725c](https://github.com/thomas-le183/free-shrimp/commit/8af725c1d2ae7b45db67ece1375080e8447c23af))


### CI

* add release-please with dev rc and main stable lanes ([ea7294a](https://github.com/thomas-le183/free-shrimp/commit/ea7294a86120e654dfe4d5ef462a891ea094e82b))
* run release-please only on dev, drop the artifacts build ([4fc2a5c](https://github.com/thomas-le183/free-shrimp/commit/4fc2a5cd5eb8a8befc0ccdf35df74dba64b41668))


### Chores

* **dev:** remove redundant file (PROJECT-1) ([#1](https://github.com/thomas-le183/free-shrimp/issues/1)) ([a99907a](https://github.com/thomas-le183/free-shrimp/commit/a99907ac4e99834f14c6125207ac621b4f649722))
* drop the prerelease flag ([5773535](https://github.com/thomas-le183/free-shrimp/commit/5773535480be131b9b0ac6313b42b87a43cc4c9a))
* reset changelog state for the changelog-only setup ([819477c](https://github.com/thomas-le183/free-shrimp/commit/819477cea9b8645f792c9fc34b38f38f5442e362))

