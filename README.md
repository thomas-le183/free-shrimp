# free-shrimp

A playground for testing [release-please](https://github.com/googleapis/release-please-action)
across a `dev` → `main` branch flow.

## What's here

- [`.github/workflows/release-please.yml`](.github/workflows/release-please.yml) — runs on pushes
  to `dev` and `main`, and picks its config by branch. On `dev` it cuts `rc` prereleases; on
  `main`, stable releases. Merging the release PR it opens tags the version and attaches artifacts.
- [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml) — checks that PR titles are
  Conventional Commits, since the squashed title is what release-please reads.
- [`release-please-config.json`](release-please-config.json) +
  [`.release-please-manifest.json`](.release-please-manifest.json) — the **main** line: stable
  `vX.Y.Z`, `CHANGELOG.md`.
- [`release-please-config.dev.json`](release-please-config.dev.json) +
  [`.release-please-manifest.dev.json`](.release-please-manifest.dev.json) — the **dev** line:
  `vX.Y.Z-rc.N` prereleases, no changelog file (`skip-changelog`).
- [`scripts/build-artifacts.sh`](scripts/build-artifacts.sh) — writes `dist/hello-<tag>.txt`,
  `dist/free-shrimp-<tag>.tar.gz`, and `dist/SHA256SUMS`. Runnable locally.

## The flow

```
feature PR ──► dev ──► release PR "chore(dev): release 0.1.0-rc.1"
                          └─ merge ──► tag v0.1.0-rc.1  (GitHub prerelease + artifacts)
                                          └─ QC tests this build

dev ──► main ──► release PR "chore(main): release 0.1.0"
                    └─ merge ──► tag v0.1.0  (stable release + artifacts)
```

Develop and QC work on `dev`. Every batch of conventional commits that lands there produces a
tagged, downloadable prerelease, so QC always has a specific version to test and report against.
When a release is signed off, `dev` merges to `main` and the same machinery cuts the stable
version.

## Day to day

Open PRs against `dev` with conventional titles:

```sh
git checkout dev && git pull
git checkout -b add-thing
gh pr create --base dev --title "feat: add a thing" --body ""
gh pr merge --squash --delete-branch
```

release-please then keeps a `chore(dev): release …` PR open. Merge it whenever QC needs a fresh
build:

```sh
gh pr list --base dev --label 'autorelease: pending'
gh pr merge <n> --squash
gh release view v0.1.0-rc.1
```

## Promoting to main

```sh
gh pr create --base main --head dev --title "release: promote 0.1.0" --body ""
gh pr merge <n> --merge          # merge, do NOT squash
```

Use a **merge commit**, not a squash. Squashing `dev` into `main` collapses every `feat:` and
`fix:` into one subject, and release-please would see a single commit instead of the history it
needs to compute the stable version and changelog.

Then merge the `chore(main): release …` PR that appears, which tags the stable `v0.1.0`.

## After a stable release: resync the dev manifest

This is the one manual step, and skipping it produces wrong version numbers.

The two branches track versions in separate manifests, so `dev` does not learn that `main` shipped.
After `v0.1.0` goes out, `.release-please-manifest.dev.json` still reads `0.1.0-rc.N` — and the
prerelease strategy bumps a prerelease by incrementing its number, so the next `feat:` on `dev`
would produce `0.1.0-rc.N+1`, re-cutting a version that has already shipped as stable.

Set it to the released stable version so the next rc starts a new line:

```sh
git checkout dev && git merge main
echo '{ ".": "0.1.0" }' > .release-please-manifest.dev.json
git commit -am "chore: resync dev manifest to 0.1.0"
git push
```

The next `feat:` on `dev` then yields `0.2.0-rc`, and the one after that `0.2.0-rc.1`.

## How versions are computed

Verified against release-please's `PrereleaseVersioningStrategy`:

| current | commit | next |
|---|---|---|
| `0.0.0` | `feat:` | `0.1.0-rc` |
| `0.1.0-rc` | `feat:` or `fix:` | `0.1.0-rc.1` |
| `0.1.0-rc.1` | `feat:` or `fix:` | `0.1.0-rc.2` |
| `0.1.0` (main) | `fix:` | `0.1.1` |
| `0.1.0` (main) | `feat:` | `0.2.0` |

Note the first rc has no number (`0.1.0-rc`, not `0.1.0-rc.0`) — the strategy only appends `.1`
once there is a prerelease to increment. While the version is a prerelease with `patch == 0`,
both `feat:` and `fix:` just advance the rc number rather than moving the minor; the minor was
already claimed when the prerelease line opened.

Pre-1.0, `bump-minor-pre-major` keeps breaking changes on the minor rather than going to `1.0.0`.

## Reset and retry

```sh
gh release delete v0.1.0 --cleanup-tag --yes
```

Then reset the relevant manifest to the previous version and delete the release branch
(`release-please--branches--main` or `release-please--branches--dev`), or release-please will
think the version is already out.

## Build the artifacts locally

```sh
scripts/build-artifacts.sh v0.1.0-local
```

## Things worth poking at

- **One workflow, two lanes** — the branch is selected with `github.ref_name` in
  `config-file` / `manifest-file` / `target-branch`. `target-branch` matters: without it the
  action operates on the repo's default branch no matter which branch pushed.
- **The two jobs** — `release-please` decides *whether* there is a release; `artifacts` only runs
  when it says yes (`release_created == 'true'`). For a root-path (`.`) manifest the action's
  outputs are unprefixed, so it's `tag_name`, not `.--tag_name`.
- **Why `artifacts` uses `gh release upload` and not a tag-push workflow** — release-please tags
  with `GITHUB_TOKEN`, and GitHub suppresses workflow triggers on refs pushed by that token, to
  avoid recursion. So a `on: push: tags: ['v*']` workflow would never fire here.
- **`prerelease: true` vs `versioning: prerelease`** — the first only flags the GitHub Release as
  a prerelease (the grey "Pre-release" badge, excluded from "latest"). The second is what actually
  produces `-rc` version numbers. You need both; setting only the first gives you stable version
  numbers wearing a prerelease badge.
- **One changelog, written only by `main`** — `dev` sets `skip-changelog: true`. In
  `strategies/simple.ts` that flag gates *only* the changelog file update; release notes are built
  separately, so each rc prerelease still renders full notes on its GitHub Release page. A
  committed changelog records what shipped; rc notes are ephemeral status, and a second file would
  merge into `main` on every promotion, duplicating entries that `CHANGELOG.md` already carries
  under the stable version.
- **`permissions`** — the `release-please` job needs `contents: write` *and*
  `pull-requests: write` (it opens the PR); `artifacts` needs only `contents: write`. The
  workflow's top-level default is `contents: read`. Drop either write and watch the 403.
- **Version pinning** — both actions are pinned to commit SHAs rather than moving `@v5`/`@v6`
  tags, so a compromised or retagged upstream can't change what runs here.
  [`.github/dependabot.yml`](.github/dependabot.yml) bumps them weekly. Note that release tags
  are often *annotated*, so the SHA must be the commit the tag dereferences to
  (`git ls-remote <repo> 'refs/tags/v5^{}'`) — the tag object's own SHA is rejected.

## PR titles

[`amannn/action-semantic-pull-request`](https://github.com/amannn/action-semantic-pull-request)
validates the title against the Conventional Commits types listed in
[`pr-title.yml`](.github/workflows/pr-title.yml), and requires a lowercase subject with no
trailing period. Editing the title re-runs the check (`types: [edited]`), so a red run clears
itself without a new push.

Set the repo to squash-merge with the PR title as the commit subject, otherwise the check is
decorative:

```sh
gh repo edit --enable-squash-merge --squash-merge-commit-title PR_TITLE \
  --squash-merge-commit-message PR_BODY
```

Keep merge commits enabled too (`--enable-merge-commit`), since dev → main promotions must not be
squashed.
