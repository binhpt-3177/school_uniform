#!/usr/bin/env sh
# Guard: reject synchronize:true in backend src — use migrations instead.
# Excludes comment lines (JSDoc /** */ or // style).
# grep -P uses Perl regex; the pattern matches file:line: then skips whitespace/comment markers.
HITS=$(grep -RInE 'synchronize:\s*true' src | grep -vE ':[0-9]+:\s*(\/\/|\*)')
if [ -n "$HITS" ]; then
  echo "$HITS"
  echo "synchronize: true is FORBIDDEN. Use migrations." >&2
  exit 1
fi
