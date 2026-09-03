# free-shrimp

A playground for testing [release-please](https://github.com/googleapis/release-please-action).

## What's here

- [`.github/workflows/release-please.yml`](.github/workflows/release-please.yml) — runs only on
  pushes to `dev`. It opens (or updates) a release PR, and merging that PR tags an `rc`
  prerelease. `main` is not managed by release-please at all — no config, no release PR, no tags.
- [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml) — checks that PR titles are
  Conventional Commits, since the squashed title is what release-please reads.
- [`release-please-config.json`](release-please-config.json) +
  [`.release-please-manifest.json`](.release-please-manifest.json) — the one and only release
  line: `vX.Y.Z-rc.N` prereleases plus a `CHANGELOG.md`. Every conventional type is listed in
  `changelog-sections`, so *every* merged PR shows up — not just `feat`/`fix`.
- [`package.json`](package.json) + [`tsconfig.json`](tsconfig.json) — a private package with a
  strict `npm run typecheck`. Not touched by release-please (`release-type: simple`); its
  `version` field stays at `0.0.0`.

## The flow

```
feature PR ──► dev ──► release PR "chore(dev): release 0.1.0-rc.1"
                          └─ merge ──► tag v0.1.0-rc.1  (GitHub prerelease)
                                          └─ QC tests this build
```

Develop and QC work on `dev`. Every batch of conventional commits that lands there produces a
tagged, downloadable prerelease, so QC always has a specific version to point at.

`main` sits outside this loop on purpose — nothing here tags or releases from it. If you still
promote `dev` → `main` for deploys, do that with a plain merge (not squash) so the history isn't
collapsed; release-please just won't be involved on that side.

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

## How versions are computed

Verified against release-please's `PrereleaseVersioningStrategy`:

| current | commit | next |
|---|---|---|
| `0.0.0` | `feat:` | `0.1.0-rc` |
| `0.1.0-rc` | `feat:` or `fix:` | `0.1.0-rc.1` |
| `0.1.0-rc.1` | `feat:` or `fix:` | `0.1.0-rc.2` |

Note the first rc has no number (`0.1.0-rc`, not `0.1.0-rc.0`) — the strategy only appends `.1`
once there is a prerelease to increment. While the version is a prerelease with `patch == 0`,
both `feat:` and `fix:` just advance the rc number rather than moving the minor; the minor was
already claimed when the prerelease line opened.

Pre-1.0, `bump-minor-pre-major` keeps breaking changes on the minor rather than going to `1.0.0`.

Nothing here ever cuts a stable, non-`-rc` tag. If you later want one — say, on merge to `main` —
that needs its own config, manifest, and workflow trigger back on that branch.

## Reset and retry

```sh
gh release delete v0.1.0-rc --cleanup-tag --yes
```

Then reset `.release-please-manifest.json` to the previous version and delete the
`release-please--branches--dev` branch, or release-please will think the version is already out.

## Things worth poking at

- **The job's outputs** — `release_created` and `tag_name` are exported but currently unused. They
  are the hook for any follow-on job (build, publish, deploy) that should run only when a release
  actually happened.
- **If you add a job that reacts to a release, put it in this workflow** — release-please tags with
  `GITHUB_TOKEN`, and GitHub suppresses workflow triggers on refs pushed by that token, to avoid
  recursion. A separate `on: push: tags: ['v*']` workflow would never fire.
- **`prerelease: true` vs `versioning: prerelease`** — the first only flags the GitHub Release as
  a prerelease (the grey "Pre-release" badge, excluded from "latest"). The second is what actually
  produces `-rc` version numbers. You need both; setting only the first gives you stable version
  numbers wearing a prerelease badge.
- **Visible == releasable** — release-please decides whether to release by rendering the changelog
  text and checking `changelogEntry.split('\n').length <= 1`. So a commit type that is hidden from
  the changelog also cannot trigger a release. That is one switch, not two: `changelog-sections`
  controls both. By default `chore`, `docs`, `refactor`, `test`, `build`, `ci` and `style` are all
  hidden, which is why a `chore:` PR used to produce absolutely nothing.
- **Releases are batched, not one-per-PR** — release-please keeps a single release PR open and
  force-pushes it as more PRs land. Three merged PRs then one release PR merge = one rc containing
  all three. To get one rc per merged PR, the release PR has to be merged after each one (enabling
  auto-merge on it is the usual way).
- **`permissions`** — the job needs `contents: write` *and* `pull-requests: write` (it opens the
  PR). The workflow's top-level default is `contents: read`. Drop either write and watch the 403.
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
