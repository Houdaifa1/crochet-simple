#!/bin/sh
# Rebuilds apps/web/src/assets/fonts from @fontsource-variable/fraunces (needs: pip install fonttools brotli)
set -e
SRC=apps/web/node_modules/@fontsource-variable/fraunces/files
OUT=apps/web/src/assets/fonts
TMP=$(mktemp -d)
CHARS="U+0020-007E,U+00A0,U+00A9,U+00AE,U+00B0,U+00B7,U+00D7,U+00E0-00E4,U+00E7-00EF,U+00F1-00F4,U+00F6,U+00F9-00FC,U+2013,U+2014,U+2018-201D,U+2022,U+2026"
fonttools varLib.instancer "$SRC/fraunces-latin-full-normal.woff2" SOFT=60 WONK=1 opsz=24:144 wght=400:600 -o "$TMP/n.ttf" -q
fonttools varLib.instancer "$SRC/fraunces-latin-full-italic.woff2" SOFT=60 WONK=1 opsz=144 wght=400:500 -o "$TMP/i.ttf" -q
pyftsubset "$TMP/n.ttf" --unicodes="$CHARS" --layout-features=kern,liga,lnum --flavor=woff2 --output-file="$OUT/fraunces.woff2"
pyftsubset "$TMP/i.ttf" --unicodes="$CHARS" --layout-features=kern,liga,lnum --flavor=woff2 --output-file="$OUT/fraunces-italic.woff2"
cp "$SRC/../LICENSE" "$OUT/OFL.txt"
