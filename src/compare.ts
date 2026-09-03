/**
 * Ordering utilities for the release tags this repo produces.
 *
 * Tags sort by major, then minor, then patch. A prerelease sorts *before* the
 * stable release of the same number (`v1.2.0-rc.1` < `v1.2.0`), matching semver.
 */

import { parseTag, type ParsedTag } from './version.js';

/**
 * Returns a negative number if `a` orders before `b`, positive if after, and 0
 * if they are the same version.
 *
 * @throws {InvalidTagError} If either tag is not a valid release tag.
 */
export function compareTags(a: string, b: string): number {
  return compareParsed(parseTag(a), parseTag(b));
}

function compareParsed(a: ParsedTag, b: ParsedTag): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // Stable outranks any prerelease of the same x.y.z.
  if (!a.prerelease && !b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;

  if (a.prerelease.type !== b.prerelease.type) {
    return a.prerelease.type < b.prerelease.type ? -1 : 1;
  }
  return a.prerelease.counter - b.prerelease.counter;
}

/** Ascending sort. Does not mutate the input. */
export function sortTags(tags: readonly string[]): string[] {
  return [...tags].sort(compareTags);
}

/** The highest tag, or undefined for an empty list. */
export function latestTag(tags: readonly string[]): string | undefined {
  return sortTags(tags).at(-1);
}
