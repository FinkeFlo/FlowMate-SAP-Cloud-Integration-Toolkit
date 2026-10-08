---
name: release
description: Cut a FlowMate release by pushing a version tag (the GitHub workflow bumps package.json and CHANGELOG, builds Chrome/Firefox zips and publishes the GitHub Release). User-invoked only.
argument-hint: <major|minor|patch|X.Y.Z>
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *), Bash(npm run *), Read
---

# Release

Releases are **tag-driven** (`.github/workflows/release.yml`). Never edit `package.json` version by hand.

1. Preconditions, abort on any failure:
   - On `main`, clean working tree, `git pull` up to date.
   - `gh run list --branch main --limit 1` shows the last CI run green.
   - `CHANGELOG.md` has content under `## [Unreleased]`; headings are unique per section; English only.
2. Determine the version: `$ARGUMENTS` is `X.Y.Z` or a bump keyword applied to the latest `v*` tag
   (`git describe --tags --abbrev=0`). Breaking entries (`!`) require a major bump; `### Added` → minor;
   only `### Fixed`/`### Changed` → patch. State the chosen version and the reasoning.
3. Show the release notes that will be published (the `[Unreleased]` block) and ask for confirmation.
4. `git tag vX.Y.Z && git push origin vX.Y.Z`.
5. Watch `gh run list --workflow release.yml --limit 1` until finished; report the release URL from
   `gh release view vX.Y.Z --json url`.
6. Afterwards `git pull` (the workflow pushed the version-bump commit to `main`).

If the workflow fails, do not retag. Report the failing step verbatim; the tag may need to be deleted by the user.
