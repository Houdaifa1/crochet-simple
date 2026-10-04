const NB = ' ';

// size chart cells may wrap, but never inside "8.5 cm" or "(3.3 in)"
export const keepMeasures = (s: string): string =>
  s
    .replace(/(\d) (?=(?:cm|mm|in|m|yd|g|oz|ch|sts?)\b)/g, `$1${NB}`)
    .replace(/\([^)]*\)/g, (m) => m.replace(/ /g, NB));

// instructions never break inside "dc 16" or "5 times"
export const keepCounts = (s: string): string =>
  s
    .replace(/\b([A-Za-z]{1,7}) (?=\d)/g, `$1${NB}`)
    .replace(/(\d) (?=(?:times|stitches|stitch|sts|st|rounds|rows|cm|mm|in)\b)/g, `$1${NB}`);
