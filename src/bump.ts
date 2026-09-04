/**
 * Bumping utilities for the release tags this repo produces.
 *
 * `main` cuts stable tags; `dev` cuts release candidates off the *next*
 * version, so bumping has two independent axes: which number moves
 * (major/minor/patch), and whether the result is stable or an rc.
 */

import { formatTag, parseTag, type ParsedTag } from './version.js';

/** Which number a bump moves. */
export type ReleaseType = 'major' | 'minor' | 'patch';

export interface BumpOptions {
  /**
   * When set, the result is a prerelease of this type (`'rc'` produces
   * `v1.2.0-rc`). Omit for a stable release.
   */
  prerelease?: string;
}

/**
 * Bumps a tag and returns the new tag.
 *
 * Bumping from a prerelease to the same release type does not move the
 * numbers again — `v1.2.0-rc` is already the candidate for `v1.2.0`, so a
 * stable `minor` bump of it is `v1.2.0`, not `v1.3.0`.
 *
 * @throws {InvalidTagError} If `tag` is not a valid release tag.
 */
export function bumpTag(
  tag: string,
  type: ReleaseType,
  options: BumpOptions = {},
): string {
  return formatTag(bumpParsed(parseTag(tag), type, options));
}

function bumpParsed(
  current: ParsedTag,
  type: ReleaseType,
  { prerelease }: BumpOptions,
): ParsedTag {
  // A prerelease already sits on the target numbers, so only advance the
  // counter when we stay on the same prerelease line.
  if (current.prerelease && prerelease === current.prerelease.type) {
    return {
      ...current,
      prerelease: { type: prerelease, counter: current.prerelease.counter + 1 },
    };
  }

  const base = current.prerelease
    ? { major: current.major, minor: current.minor, patch: current.patch }
    : nextNumbers(current, type);

  return prerelease
    ? { ...base, prerelease: { type: prerelease, counter: 0 } }
    : base;
}

function nextNumbers(v: ParsedTag, type: ReleaseType) {
  switch (type) {
    case 'major':
      return { major: v.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: v.major, minor: v.minor + 1, patch: 0 };
    case 'patch':
      return { major: v.major, minor: v.minor, patch: v.patch + 1 };
  }
}

/** The next release candidate on the same line: `v1.2.0-rc` -> `v1.2.0-rc.1`. */
export function nextPrerelease(tag: string, type: string = 'rc'): string {
  const current = parseTag(tag);
  if (!current.prerelease) {
    throw new Error(`not a prerelease tag: ${JSON.stringify(tag)}`);
  }
  return bumpTag(tag, 'patch', { prerelease: type });
}
