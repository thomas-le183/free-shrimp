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

export function parseTag(tag: string): ParsedTag | null {
  const m = TAG.exec(tag);
  if (!m) return null;

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

export function isPrerelease(tag: string): boolean {
  return parseTag(tag)?.prerelease !== undefined;
}

export function formatTag(v: ParsedTag): string {
  const base = `v${v.major}.${v.minor}.${v.patch}`;
  if (!v.prerelease) return base;
  const { type, counter } = v.prerelease;
  return counter === 0 ? `${base}-${type}` : `${base}-${type}.${counter}`;
}
