# free-shrimp

A playground for testing [release-please](https://github.com/googleapis/release-please-action).

## What's here

- [`.github/workflows/release-please.yml`](.github/workflows/release-please.yml) — runs only on
  pushes to `dev`. It opens (or updates) a release PR, and merging that PR tags a version and
  publishes it. `main` is not managed by release-please at all — no config, no release PR, no tags.
- [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml) — checks that PR titles are
  Conventional Commits, since the squashed title is what release-please reads.
- [`release-please-config.json`](release-please-config.json) +
  [`.release-please-manifest.json`](.release-please-manifest.json) — the one and only release
  line: `vX.Y.Z` versions plus a `CHANGELOG.md`. Every conventional type is listed in
  `changelog-sections`, so *every* merged PR shows up — not just `feat`/`fix`.
- [`package.json`](package.json) + [`tsconfig.json`](tsconfig.json) — a private package with a
  strict `npm run typecheck`. Not touched by release-please (`release-type: simple`); its
  `version` field stays at `0.0.0`.

## The flow

```
feature PR ──► dev ──► release PR "chore(dev): release 0.2.0"
                          └─ merge ──► tag v0.2.0  (flagged prerelease while 0.x)
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
gh release view v0.2.0
```

## How versions are computed

Verified against release-please's `PrereleaseVersioningStrategy`:

| current | commit | next |
|---|---|---|
| `0.1.0` | `feat:` | `0.2.0` |
| `0.2.0` | `fix:` / `chore:` / `docs:` … | `0.2.1` |
| `0.2.1` | `feat!:` (breaking) | `0.3.0` |

Pre-1.0, `bump-minor-pre-major` keeps breaking changes on the minor rather than jumping to
`1.0.0`.

Releases are still flagged as prereleases on GitHub (grey badge, excluded from "Latest"). That
comes from `prerelease: true`, which applies while `major === 0` — see `manifest.ts`:

```js
prerelease: config.prerelease &&
  (!!release.tag.version.preRelease || release.tag.version.major === 0)
```

So the badge is free until you cut `1.0.0`. At that point, either accept normal releases or
reintroduce an explicit prerelease scheme.

## Reset and retry

```sh
gh release delete v0.2.0 --cleanup-tag --yes
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
- **`prerelease: true` vs `versioning: prerelease`** — two unrelated things. The first only flags
  the GitHub Release with the grey "Pre-release" badge. The second rewrites the *numbers* into
  `-rc` form, and it is deliberately not used here: with no stable line to graduate into, the rc
  counter is the only thing that ever moves. `feat`, `fix`, a breaking change and a `chore` all
  collapse to `0.1.0-rc.N+1`, so the version stops carrying any information at all.
- **Visible == releasable** — release-please decides whether to release by rendering the changelog
  text and checking `changelogEntry.split('\n').length <= 1`. So a commit type that is hidden from
  the changelog also cannot trigger a release. That is one switch, not two: `changelog-sections`
  controls both. By default `chore`, `docs`, `refactor`, `test`, `build`, `ci` and `style` are all
  hidden, which is why a `chore:` PR used to produce absolutely nothing.
- **Releases are batched, not one-per-PR** — release-please keeps a single release PR open and
  force-pushes it as more PRs land. Three merged PRs then one release PR merge = one release
  containing all three. To get one release per merged PR, the release PR has to be merged after
  each one (enabling auto-merge on it is the usual way).
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
