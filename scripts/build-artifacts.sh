#!/usr/bin/env bash
# Build the playground's fake release artifacts into dist/.
# Usage: scripts/build-artifacts.sh <tag>
set -euo pipefail

TAG="${1:?usage: build-artifacts.sh <tag>}"
DIST="dist"

rm -rf "$DIST"
mkdir -p "$DIST"

cat > "$DIST/hello-$TAG.txt" <<TXT
free-shrimp $TAG
built: $(date -u +%Y-%m-%dT%H:%M:%SZ)
commit: $(git rev-parse HEAD 2>/dev/null || echo unknown)
TXT

tar -czf "$DIST/free-shrimp-$TAG.tar.gz" -C "$DIST" "hello-$TAG.txt"

# shasum on macOS, sha256sum on Linux runners. Written outside $DIST first so the
# glob cannot pick up the checksum file itself.
SUMS="$(mktemp)"
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$DIST" && sha256sum -- *) > "$SUMS"
else
  (cd "$DIST" && shasum -a 256 -- *) > "$SUMS"
fi
mv "$SUMS" "$DIST/SHA256SUMS"

echo "artifacts in $DIST/:"
ls -1 "$DIST"
