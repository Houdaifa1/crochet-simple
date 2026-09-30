import { writeFileSync } from 'node:fs';

// Reference: assets/approved-full-sequence/01-bag-wide.png (1672 × 941).
// Coordinates stay in the photo's pixel space so the drawing can be checked
// directly over the actual product before it is fitted into the story slot.
const commands = [];
let position = [0, 0];
const add = (command, ...numbers) => {
  commands.push([command, ...numbers.map(n => +n.toFixed(1))]);
  position = numbers.slice(-2);
};
const M = (x, y) => add('M', x, y);
const L = (x, y) => add('L', x, y);
const C = (a, b, c, d, x, y) => add('C', a, b, c, d, x, y);
const Q = (a, b, x, y) => add('Q', a, b, x, y);

// The silhouette follows the blue pixels of the supplied image: tall uneven
// handles, sloping rim, rounded left side and a broad, sagging crocheted base.
M(814, 7);
C(844, -2, 884, -3, 916, 8);
C(963, 26, 1010, 101, 1067, 282);
C(1110, 287, 1159, 296, 1190, 305);
C(1207, 311, 1204, 370, 1201, 490);
C(1199, 647, 1178, 776, 1144, 829);
C(1118, 870, 1072, 894, 1015, 903);
C(927, 901, 861, 889, 837, 887);
C(743, 874, 632, 860, 565, 840);
C(510, 822, 473, 731, 467, 637);
C(458, 553, 478, 394, 500, 278);
C(530, 271, 608, 266, 666, 263);
C(706, 168, 762, 29, 814, 7);

// Opening within the handle. Its left and right sides are deliberately unequal,
// as in the photo; the open bag rim slopes behind the handles.
C(833, 14, 845, 18, 851, 27);
C(802, 57, 772, 169, 749, 300);
C(797, 309, 849, 325, 895, 321);
C(927, 319, 945, 313, 960, 306);
C(948, 208, 923, 92, 892, 43);
C(880, 27, 865, 20, 851, 27);
// Revisit the right strap as a visible crocheted rib, ending at its attachment.
C(876, 37, 896, 99, 928, 207);
C(941, 255, 951, 287, 960, 306);
C(981, 318, 1002, 323, 1030, 322);
C(1092, 316, 1160, 316, 1191, 326);

// The front lip is lower than the back rim and curves around the bag's opening.
C(1126, 329, 1062, 335, 997, 338);
C(904, 351, 826, 358, 743, 348);
C(646, 341, 557, 314, 500, 294);
C(494, 313, 489, 336, 487, 356);

// Dense, slightly irregular single crochet marks. Rows are connected by the
// same pen stroke, avoiding the oversized generic wave pattern in the draft.
for (let row = 0; row < 19; row++) {
  const y = 365 + row * 22.5;
  const left = 515 + Math.max(0, row - 12) * 2;
  const right = row < 16 ? 905 : 1135 - Math.max(0, row - 16) * 10;
  const count = row < 16 ? 23 : 36;
  const direction = row % 2 === 0 ? 1 : -1;
  const start = direction === 1 ? left : right;
  const end = direction === 1 ? right : left;
  Q((position[0] + start) / 2, y - 8, start, y);
  const step = (end - start) / count;
  for (let i = 0; i < count; i++) {
    const x = start + i * step;
    const wiggle = Math.sin(i * 2.3 + row * 1.7) * 1.4;
    C(x + step * .10, y - 6 + wiggle,
      x + step * .29, y - 7 + wiggle,
      x + step * .40, y - 2);
    C(x + step * .31, y + 2 + wiggle,
      x + step * .39, y + 7 + wiggle,
      x + step * .52, y + 7);
    C(x + step * .69, y + 6 + wiggle,
      x + step * .62, y - 3 + wiggle,
      x + step * .76, y - 5);
    C(x + step * .91, y - 6 + wiggle,
      x + step * .95, y - 1,
      x + step, y);
  }
}

// Return along the real right edge and lip to the green knot. This retracing
// keeps the SVG a genuine uninterrupted pen line instead of adding a new M.
C(1160, 721, 1184, 511, 1191, 326);
C(1114, 314, 1061, 310, 1022, 307);

// Knot and two textured olive leaves, positioned where they hang in the photo.
C(1007, 291, 986, 285, 974, 294);
C(951, 286, 946, 306, 967, 319);
C(987, 332, 1003, 328, 1017, 311);
C(1031, 299, 1041, 283, 1046, 269);
C(1046, 292, 1038, 311, 1017, 329);
C(1016, 339, 1019, 350, 1026, 360);
// Left leaf, with its curved center vein.
C(997, 358, 956, 370, 933, 393);
C(914, 413, 916, 437, 927, 450);
C(953, 453, 988, 432, 1003, 397);
C(1010, 381, 1015, 368, 1026, 360);
C(991, 389, 958, 421, 927, 450);
C(965, 450, 995, 417, 1011, 375);
// Right leaf, broad and pointed toward the bag's right side.
C(1036, 362, 1072, 363, 1090, 382);
C(1111, 399, 1124, 432, 1124, 458);
C(1092, 466, 1053, 440, 1031, 399);
C(1022, 382, 1017, 369, 1011, 375);
C(1054, 395, 1090, 431, 1124, 458);
// Back to the knot, then down the first hanging cord.
C(1085, 450, 1049, 408, 1026, 360);
C(1015, 345, 1005, 337, 1004, 330);
C(1006, 401, 1000, 470, 990, 526);

// Left cherry: its slightly flattened top and uneven rounded base follow the
// red fruit in the photograph. A small lobe and a few stitch arcs add volume.
C(958, 521, 927, 539, 918, 565);
C(909, 589, 921, 619, 945, 634);
C(965, 647, 994, 650, 1017, 635);
C(1040, 620, 1052, 589, 1040, 559);
C(1029, 538, 1013, 528, 990, 526);
// Return along the fruit's contour and its cord to reach the second cherry.
C(958, 521, 927, 539, 918, 565);
C(927, 539, 958, 521, 990, 526);
C(1000, 470, 1006, 401, 1004, 330);
C(1029, 386, 1055, 480, 1090, 584);

// Right cherry, lower and slightly wider than the left one.
C(1122, 575, 1150, 589, 1162, 617);
C(1176, 646, 1159, 679, 1134, 691);
C(1105, 707, 1072, 697, 1052, 673);
C(1036, 650, 1042, 612, 1064, 594);
C(1070, 588, 1080, 585, 1090, 584);
// End near the lower right so the next chapter's connector can leave naturally.
C(1130, 571, 1161, 600, 1162, 617);
C(1176, 646, 1159, 679, 1134, 691);

if (commands.filter(c => c[0] === 'M').length !== 1) throw new Error('Drawing must have one starting point');
const d = commands.map(c => c[0] + c.slice(1).join(',')).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="440 0 790 930" width="790" height="930" role="img" aria-label="One continuous line drawing of the blue crochet market bag with two cherry charms">
  <rect x="440" y="0" width="790" height="930" fill="#f8f5ee"/>
  <path d="${d}" fill="none" stroke="#292823" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n`;
writeFileSync(new URL('./blue-market-bag-one-line.svg', import.meta.url), svg);
writeFileSync(new URL('./blue-market-bag-commands.json', import.meta.url), JSON.stringify(commands));
console.log(`Wrote one continuous path with ${commands.length} commands`);
