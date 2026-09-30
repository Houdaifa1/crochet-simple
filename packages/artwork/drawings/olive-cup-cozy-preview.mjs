import { writeFileSync } from 'node:fs';

// Reference: assets/approved-full-sequence/16-olive-cup-reveal.png, with the
// familiar lipped, tapered hot takeaway cup silhouette checked against a
// Starbucks hot-cup reference. One open stroke runs from lid to lower left.
const commands = [];
let position = [0, 0];
const add = (letter, ...values) => {
  commands.push([letter, ...values.map(n => +n.toFixed(1))]);
  position = values.slice(-2);
};
const M = (x, y) => add('M', x, y);
const L = (x, y) => add('L', x, y);
const C = (a, b, c, d, x, y) => add('C', a, b, c, d, x, y);
const Q = (a, b, x, y) => add('Q', a, b, x, y);

// The photo crops the very top of its lid. Complete that shallow raised top,
// add the unmistakable rolled hot-cup rim, then taper the bare cup inward.
M(777, -25);
C(861, -43, 992, -39, 1056, -24);
C(1103, -14, 1139, 1, 1148, 22);
C(1168, 26, 1179, 37, 1179, 52);
L(1179, 74);
C(1178, 87, 1165, 94, 1144, 94);
C(1029, 90, 767, 90, 654, 94);
C(639, 93, 632, 86, 632, 74);
L(632, 50);
C(632, 35, 646, 26, 669, 22);
C(687, 1, 722, -15, 777, -25);
// Retrace the lid's left contour before drawing its lower lip. This keeps the
// lid rounded without a diagonal cutting through its upper surface.
C(722, -15, 687, 1, 669, 22);
C(646, 26, 632, 35, 632, 50);
C(637, 52, 643, 53, 649, 53);
C(764, 58, 1025, 59, 1167, 54);
C(1154, 68, 1149, 79, 1144, 94);
C(1137, 146, 1139, 204, 1136, 258);
C(1146, 259, 1158, 260, 1171, 263);

// The thick crochet edge wraps around the tapered paper cup. It protrudes a
// little beyond the smooth cup walls, as the real product does.
const rimStart = 1171, rimEnd = 627, rimY = 263, rimLoops = 29;
for (let i = 0; i < rimLoops; i++) {
  const x0 = rimStart + (rimEnd - rimStart) * i / rimLoops;
  const x1 = rimStart + (rimEnd - rimStart) * (i + 1) / rimLoops;
  const mid = (x0 + x1) / 2;
  const wobble = Math.sin(i * 2.1) * 2;
  C(x0 - 2, rimY - 11 + wobble, mid + 3, rimY - 14 + wobble, mid, rimY - 2);
  C(mid - 3, rimY + 9 + wobble, x1 + 3, rimY + 8 + wobble, x1, rimY + 1);
}
// Draw the other visible paper wall, then the shorter, strongly tapered cozy.
C(648, 259, 661, 257, 675, 258);
C(668, 206, 661, 144, 654, 94);
C(662, 147, 669, 204, 675, 258);
C(657, 258, 642, 259, 627, 263);
C(629, 420, 648, 640, 682, 747);
C(687, 773, 717, 782, 749, 785);
C(866, 799, 1018, 795, 1087, 783);
C(1112, 778, 1120, 765, 1125, 742);
C(1156, 610, 1170, 423, 1171, 263);
// Retrace the outside to the base of the cozy, then reveal the exposed paper
// bottom. The cozy remains long, matching the supplied product photo.
C(1156, 610, 1125, 742, 1087, 783);
C(1104, 806, 1103, 826, 1091, 841);
C(1068, 853, 751, 856, 725, 838);
C(707, 819, 702, 785, 682, 747);
C(717, 782, 866, 799, 1087, 783);

// Raised vertical crochet ribs are the product's defining feature. Each rib
// is a continuous chain of small interlocking turns. We alternate up and down
// so the same pen can travel through all columns without lifting.
const ribCount = 17;
function ribPosition(index, fraction) {
  const t = (index + 0.5) / ribCount;
  const xTop = 632 + 534 * t;
  const xBottom = 683 + 441 * t;
  const top = 284 + 4 * Math.sin(index * .7);
  const bottom = 761 + 17 * Math.sin(t * Math.PI) - 5 * t;
  return [xTop + (xBottom - xTop) * fraction, top + (bottom - top) * fraction];
}
for (let index = ribCount - 1; index >= 0; index--) {
  const upwards = (ribCount - 1 - index) % 2 === 0;
  const stitches = 22;
  const first = ribPosition(index, upwards ? 1 : 0);
  Q((position[0] + first[0]) / 2, first[1] + (upwards ? 6 : -6), first[0], first[1]);
  for (let step = 0; step < stitches; step++) {
    const a = ribPosition(index, upwards ? 1 - step / stitches : step / stitches);
    const b = ribPosition(index, upwards ? 1 - (step + 1) / stitches : (step + 1) / stitches);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const roughness = Math.sin(index * 2.3 + step * 1.7) * 1.3;
    const mx = a[0] + dx*.48, my = a[1] + dy*.54;
    // Each visible stitch is a small closed yarn loop. The third curve threads
    // through it to the next loop, so the pen never jumps between stitches.
    C(a[0] - 8 + roughness, a[1] + dy*.10,
      mx - 8 + roughness, my - dy*.14,
      mx, my);
    C(mx + 8 + roughness, my + dy*.14,
      a[0] + 8 + roughness, a[1] + dy*.10,
      a[0], a[1]);
    C(a[0] - 2, a[1] + dy*.63,
      b[0] + 2, b[1] - dy*.22,
      b[0], b[1]);
  }
}
// Leave along the left side of the sleeve, where the next story connector can
// continue without lifting the pen.
C(645, 452, 664, 670, 682, 747);

if (commands.filter(([letter]) => letter === 'M').length !== 1) throw new Error('The line must not lift');
const d = commands.map(c => c[0] + c.slice(1).join(',')).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="590 -50 620 930" width="620" height="930" role="img" aria-label="One continuous line drawing of a tapered hot takeaway cup with an olive ribbed crochet cozy">
  <rect x="590" y="-50" width="620" height="930" fill="#f8f5ee"/>
  <path d="${d}" fill="none" stroke="#292823" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n`;
writeFileSync(new URL('./olive-cup-cozy-one-line.svg', import.meta.url), svg);
writeFileSync(new URL('./olive-cup-cozy-commands.json', import.meta.url), JSON.stringify(commands));
console.log(`Wrote ${commands.length} connected commands; entry 777,-25; exit ${position.join(',')}`);
