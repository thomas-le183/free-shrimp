/**
 * Parsing for the release tags this repo produces.
 *
 * `main` cuts stable tags (`v1.2.3`); `dev` cuts release candidates
 * (`v1.2.3-rc`, then `v1.2.3-rc.1`, `v1.2.3-rc.2`, ...). The first rc
 * carries no counter, which is the case most naive parsers get wrong.
 */

export interface ParsedTag {
  major: number;
  minor: number;
  patch: number;
  /** Undefined for a stable release. */
  prerelease?: { type: string; counter: number };
}

const TAG = /^v(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)(?:\.(\d+))?)?$/;

/** Thrown by {@link parseTag} when a string is not a valid release tag. */
export class InvalidTagError extends Error {
  constructor(public readonly tag: string) {
    super(`not a valid release tag: ${JSON.stringify(tag)}`);
    this.name = 'InvalidTagError';
  }
}

/**
 * Parses a release tag.
 *
 * @throws {InvalidTagError} If the tag is malformed. Use {@link tryParseTag}
 * when a non-tag is an expected input rather than a bug.
 */
export function parseTag(tag: string): ParsedTag {
  const m = TAG.exec(tag);
  if (!m) throw new InvalidTagError(tag);

  const [, major, minor, patch, preType, preCounter] = m;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    // A bare `-rc` is counter 0; `-rc.1` is counter 1.
    prerelease: preType
      ? { type: preType, counter: preCounter ? Number(preCounter) : 0 }
      : undefined,
  };
}

/** Like {@link parseTag}, but returns `null` instead of throwing. */
export function tryParseTag(tag: string): ParsedTag | null {
  try {
    return parseTag(tag);
  } catch (err) {
    if (err instanceof InvalidTagError) return null;
    throw err;
  }
}

export function isPrerelease(tag: string): boolean {
  return tryParseTag(tag)?.prerelease !== undefined;
}

export function formatTag(v: ParsedTag): string {
  const base = `v${v.major}.${v.minor}.${v.patch}`;
  if (!v.prerelease) return base;
  const { type, counter } = v.prerelease;
  return counter === 0 ? `${base}-${type}` : `${base}-${type}.${counter}`;
}
