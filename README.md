# free-shrimp

A playground for testing [release-please](https://github.com/googleapis/release-please-action).

Here it is used as a **changelog generator only**. It computes a version, but that version is
release-please's own bookkeeping — it is never written to `package.json`, never tagged, and never
published as a GitHub Release.

## What's here

- [`.github/workflows/release-please.yml`](.github/workflows/release-please.yml) — runs only on
  pushes to `dev`. It opens (or updates) a release PR; merging that PR appends to `CHANGELOG-DEV.md`
  and bumps `.release-please-manifest.json`. Nothing else. `main` is not managed by release-please
  at all — no config, no release PR, no changelog.
- [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml) — checks that PR titles are
  Conventional Commits, since the squashed title is what release-please reads.
- [`release-please-config.json`](release-please-config.json) +
  [`.release-please-manifest.json`](.release-please-manifest.json) — the config, and the single
  place the version lives. Every conventional type is listed in `changelog-sections`, so *every*
  merged PR shows up — not just `feat`/`fix`.
- [`package.json`](package.json) + [`tsconfig.json`](tsconfig.json) — a private package with a
  strict `npm run typecheck`. Its `version` field stays at `0.0.0` forever; see below for why.

## The flow

```
feature PR ──► dev ──► release PR "chore(dev): release 0.2.0"
                          └─ merge ──► CHANGELOG-DEV.md + manifest updated
                                       (no tag, no release, no package.json bump)
```

Develop and QC work on `dev`. Every batch of conventional commits that lands there rolls into the
open release PR, and merging it publishes those entries to the changelog.

`main` sits outside this loop on purpose. If you promote `dev` → `main` for deploys, do that with
a plain merge (not squash) so the history isn't collapsed; release-please just won't be involved
on that side.

## Why nothing but the changelog changes

Two settings in [`release-please-config.json`](release-please-config.json) do all of it:

```json
"release-type": "simple",
"skip-github-release": true,
```

- **`skip-github-release`** drops the entire release step — no git tag, no GitHub Release. Version
  tracking survives because the manifest strategy reads the last version out of
  `.release-please-manifest.json`, which the release PR itself updates, rather than out of tags.
- **`release-type: simple`** decides which files get written. Its updater list is exactly
  `CHANGELOG-DEV.md` plus `version.txt`, and the `version.txt` update is registered with
  `createIfMissing: false` — see
  [`strategies/simple.ts`](https://github.com/googleapis/release-please/blob/main/src/strategies/simple.ts):

  ```ts
  updates.push({
    path: this.addPath(this.versionFile),   // version.txt
    createIfMissing: false,                 // ← absent file stays absent
    updater: new DefaultUpdater({version}),
  });
  ```

  There is no `version.txt` in this repo, so that update is a no-op and `CHANGELOG-DEV.md` (set by
  `changelog-path`) is the only file touched. The `node` release type would instead rewrite
  `package.json`'s `version`, which is precisely what we don't want.

So release-please's version and the app's version are deliberately decoupled. The number in the
release PR title (`chore(dev): release 0.2.0`) is an index into the changelog, nothing more.

## Day to day

Open PRs against `dev` with conventional titles:

```sh
git checkout dev && git pull
git checkout -b add-thing
gh pr create --base dev --title "feat: add a thing" --body ""
gh pr merge --squash --delete-branch
```

release-please then keeps a `chore(dev): release …` PR open. Merge it whenever the changelog
should be updated:

```sh
gh pr list --base dev --label 'autorelease: pending'
gh pr merge <n> --squash
git checkout dev && git pull && cat CHANGELOG-DEV.md
```

## How versions are computed

The numbers still follow normal semver rules, they just land in the changelog instead of a tag:

| current | commit | next |
|---|---|---|
| `0.1.0` | `feat:` | `0.2.0` |
| `0.2.0` | `fix:` / `chore:` / `docs:` … | `0.2.1` |
| `0.2.1` | `feat!:` (breaking) | `0.3.0` |

Pre-1.0, `bump-minor-pre-major` keeps breaking changes on the minor rather than jumping to
`1.0.0`. `initial-version: 0.1.0` sets where the very first entry starts, from a manifest seeded
at `0.0.0`.

## Switching between rc and stable

The two directions are not symmetric. Verified against release-please 17.

**Stable → rc** works from config alone. Add both keys:

```json
"versioning": "prerelease",
"prerelease-type": "rc",
```

`0.2.1` + `feat:` → `0.3.0-rc`, then `0.3.0-rc.1`, `0.3.0-rc.2` … Note that once you are on an
rc, *every* type (including a breaking change) only advances the counter.

**rc → stable does NOT work from config alone.** Removing those keys leaves the suffix attached,
because the default strategy bumps the numeric part without stripping the prerelease:

```
0.1.0-rc.3  + feat:  ->  0.2.0-rc.3     ← still an rc
0.1.0-rc.3  + fix:   ->  0.1.1-rc.3
```

To actually graduate, remove the two keys **and** force the version once with a `Release-As:`
footer, which overrides whatever the strategy computes:

```sh
git commit --allow-empty -m "chore: graduate to 0.3.0" -m "Release-As: 0.3.0"
git push
```

```
0.1.0-rc.3  + Release-As: 0.3.0  ->  0.3.0
```

Under squash-merge with the PR body as the commit message, putting `Release-As: 0.3.0` in a PR
body works too. Editing `.release-please-manifest.json` by hand to the clean version is an
alternative, but the footer leaves an audit trail in the history.

`Release-As:` works under either strategy, so it is also the way to cut a one-off version without
touching config at all — including jumping straight to `1.0.0`.

The `prerelease: true` flag is unrelated and now pointless here: it only controlled the grey
"Pre-release" badge on a GitHub Release, and there are no releases to badge.

## Reset and retry

There is nothing to unpublish, so a reset is just local state:

```sh
# 1. put the manifest back to the previous version (0.0.0 to start from scratch)
# 2. drop the changelog entries you want to redo from CHANGELOG-DEV.md
# 3. delete the branch release-please works from, or it will reuse the old PR
git push origin :release-please--branches--dev--components--free-shrimp
```

If a release PR was already merged, its `autorelease: tagged` label is what release-please uses to
find the last release point — remove that label from the merged PR too, or history before it stays
excluded from the next changelog.

## Things worth poking at

- **Old release commits show up as entries** — with `chore` visible in `changelog-sections`, the
  historical `chore(dev): release X` merge commits appear under Chores in a regenerated changelog.
  They are ordinary commits once their release PRs are no longer the boundary. Drop `chore` from
  `changelog-sections` if that noise bothers you, but remember it also stops `chore:` PRs from
  triggering a release PR at all.
- **Visible == releasable** — release-please decides whether to open a release PR by rendering the
  changelog text and checking `changelogEntry.split('\n').length <= 1`. So a commit type that is
  hidden from the changelog also cannot trigger one. That is one switch, not two:
  `changelog-sections` controls both. By default `chore`, `docs`, `refactor`, `test`, `build`, `ci`
  and `style` are all hidden, which is why a `chore:` PR used to produce absolutely nothing.
- **Entries are batched, not one-per-PR** — release-please keeps a single release PR open and
  force-pushes it as more PRs land. Three merged PRs then one release PR merge = one changelog
  section containing all three. To get one section per merged PR, the release PR has to be merged
  after each one (enabling auto-merge on it is the usual way).
- **`permissions`** — the job needs `contents: write` *and* `pull-requests: write` (it opens the
  PR). The workflow's top-level default is `contents: read`. Drop either write and watch the 403.
  `contents: write` is still required even with `skip-github-release`, because release-please
  pushes the release branch.
- **`skip-github-release` jams after the first merged release PR** — release-please marks a release
  PR `autorelease: pending`, and it is the *release step* that swaps that for `autorelease: tagged`
  once the tag is cut. `skip-github-release` deletes that step, so the label never moves. On the
  next run release-please finds a merged PR still marked pending and aborts with `There are
  untagged, merged release PRs outstanding` — no new release PR, no changelog, and a green check on
  the workflow, because aborting is not a failure. The setup works exactly once and then stops.
  The `Settle merged release PRs left pending` step in
  [`release-please.yml`](.github/workflows/release-please.yml) does the label swap the missing
  release step would have done. If you hit the jam before that step existed, clear it by hand:
  `gh pr edit <n> --remove-label 'autorelease: pending' --add-label 'autorelease: tagged'`, then
  re-run the workflow.
- **No `release_created` output any more** — with the release step skipped, that output is always
  empty, so it was removed from the workflow. A follow-on job (build, publish, deploy) can no
  longer gate on it; gate on the release PR merge instead.
- **Version pinning** — both actions are pinned to commit SHAs rather than moving `@v5`/`@v6`
  tags, so a compromised or retagged upstream can't change what runs here. There is no
  `dependabot.yml`, so bumping them is manual. Note that release tags
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
