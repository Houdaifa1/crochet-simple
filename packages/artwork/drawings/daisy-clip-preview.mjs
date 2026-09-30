import { writeFileSync } from 'node:fs';

// Reference: assets/approved-full-sequence/12-daisy-discovery.png (1672 × 941).
// One open pen route, in the original photo's coordinate system. It enters at
// the olive leaf and exits at the right petal, ready for the next story link.
const commands = [];
let point = [0, 0];
const put = (letter, ...values) => {
  commands.push([letter, ...values.map(n => +n.toFixed(1))]);
  point = values.slice(-2);
};
const M = (x, y) => put('M', x, y);
const L = (x, y) => put('L', x, y);
const C = (a, b, c, d, x, y) => put('C', a, b, c, d, x, y);
function braidedC(a, b, c, d, x, y, units = 12, depth = 6) {
  const [sx, sy] = point;
  const sample = t => {
    const k = 1 - t;
    return [
      k*k*k*sx + 3*k*k*t*a + 3*k*t*t*c + t*t*t*x,
      k*k*k*sy + 3*k*k*t*b + 3*k*t*t*d + t*t*t*y
    ];
  };
  for (let i = 0; i < units; i++) {
    const p = sample(i / units), q = sample((i + 1) / units);
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * depth, ny = dx / length * depth;
    const mx = p[0] + dx * .52, my = p[1] + dy * .52;
    C(p[0] + dx*.18 + nx, p[1] + dy*.18 + ny,
      p[0] + dx*.38 + nx, p[1] + dy*.38 + ny, mx, my);
    C(mx + dx*.10 - nx, my + dy*.10 - ny,
      q[0] - dx*.18 - nx, q[1] - dy*.18 - ny, q[0], q[1]);
  }
}

// Olive leaf behind the bloom. Its broad, folded outline is asymmetric in the
// photo, so it is drawn as that leaf rather than a generic pointed oval.
M(1247, 337);
C(1228, 301, 1162, 288, 1112, 298);
C(1013, 300, 948, 329, 901, 382);
C(922, 465, 969, 533, 1035, 555);
C(1116, 552, 1201, 466, 1247, 337);
braidedC(1140, 362, 1022, 389, 901, 382, 20, 5); // crochet vein
C(945, 428, 989, 506, 1035, 555);  // return on the folded lower edge

// Brass clip visible behind the flower: upper blade, lower jaw and hinge.
C(1106, 531, 1180, 507, 1229, 498);
C(1251, 493, 1266, 503, 1272, 521);
C(1277, 536, 1260, 547, 1243, 552);
L(1038, 612);
C(1005, 622, 978, 613, 978, 590);
C(1034, 616, 1130, 637, 1212, 643);
C(1234, 643, 1251, 650, 1260, 662);
C(1257, 677, 1232, 678, 1202, 672);
C(1124, 655, 1047, 637, 984, 617);
C(1044, 626, 1114, 635, 1164, 635);
C(1160, 621, 1167, 612, 1176, 612);
C(1194, 615, 1198, 638, 1181, 647);
C(1168, 649, 1161, 646, 1164, 635);
C(1114, 635, 1044, 626, 984, 617); // back under the petal

// Lower-right petal. The reference flower has six unequal crochet petals.
C(999, 646, 971, 719, 924, 745);
C(876, 775, 822, 719, 780, 642);
C(751, 592, 756, 561, 811, 554);
C(869, 552, 939, 573, 984, 617);
braidedC(928, 603, 857, 574, 811, 554, 12, 5); // inner ridge

// Bottom petal, large and hanging slightly toward the left.
C(774, 582, 729, 596, 690, 559);
C(643, 561, 586, 607, 550, 652);
C(514, 700, 521, 763, 560, 787);
C(606, 808, 653, 778, 686, 725);
C(720, 670, 728, 611, 690, 559);
braidedC(669, 625, 628, 716, 580, 756, 12, 6);
C(625, 738, 659, 655, 690, 559);

// Left petal, lying almost horizontally on the plate.
C(654, 553, 635, 537, 620, 522);
C(560, 471, 495, 448, 452, 462);
C(405, 473, 370, 510, 372, 558);
C(371, 610, 416, 650, 471, 653);
C(534, 650, 600, 607, 620, 522);
braidedC(557, 519, 475, 512, 428, 546, 12, 6);
C(475, 555, 565, 546, 620, 522);

// Upper-left petal is shorter and tilted outward.
C(611, 482, 624, 444, 651, 415);
C(626, 333, 582, 264, 528, 257);
C(481, 252, 469, 317, 495, 370);
C(521, 421, 581, 455, 651, 415);
braidedC(600, 384, 555, 335, 528, 303, 10, 6);
C(570, 320, 623, 383, 651, 415);

// Tall top petal, distinct from the wider side petals.
C(672, 391, 695, 380, 723, 384);
C(718, 304, 753, 191, 815, 171);
C(881, 162, 927, 221, 932, 273);
C(927, 335, 848, 406, 723, 384);
braidedC(774, 320, 799, 239, 832, 204, 11, 6);
C(832, 272, 780, 356, 723, 384);

// Rounded raised center. The inward-and-back spiral is a retraced portion of
// this same pen route, keeping the full artwork one continuous line.
C(728, 379, 733, 376, 739, 376);
C(789, 368, 830, 399, 846, 451);
C(867, 507, 831, 559, 777, 582);
C(716, 610, 650, 582, 620, 531);
C(591, 483, 614, 415, 662, 390);
C(690, 377, 720, 373, 739, 376);
const cx = 734, cy = 484, spiral = [];
for (let i = 0; i <= 180; i++) {
  const t = i / 180;
  const angle = -Math.PI / 2 + t * Math.PI * 6;
  const ripple = Math.sin(i * 1.8) * (1 - t) * 2.4;
  const x = cx + (110 * (1 - t) + ripple) * Math.cos(angle);
  const y = cy + (108 * (1 - t) + ripple) * Math.sin(angle);
  spiral.push([x, y]);
}
C(739, 375, 736, 375, spiral[0][0], spiral[0][1]);
for (const [x, y] of spiral.slice(1)) L(x, y);
for (const [x, y] of spiral.slice(0, -1).reverse()) L(x, y);

// Right petal finishes the flower and the open route. The last point sits at
// its outer edge, where the single scrolling line can head toward cup cozy.
C(784, 379, 820, 408, 838, 438);
C(875, 392, 925, 355, 982, 355);
C(1033, 351, 1068, 386, 1069, 440);
C(1064, 498, 1011, 541, 958, 546);
C(907, 546, 864, 512, 838, 438);
braidedC(896, 422, 953, 410, 997, 419, 12, 6);
C(1030, 424, 1053, 438, 1069, 440);

if (commands.filter(([letter]) => letter === 'M').length !== 1) throw new Error('The pen lifted');
const d = commands.map(c => c[0] + c.slice(1).join(',')).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="330 130 1000 700" width="1000" height="700" role="img" aria-label="One continuous line drawing of the crochet daisy clip with six petals, an olive leaf and a brass clip">
  <rect x="330" y="130" width="1000" height="700" fill="#f8f5ee"/>
  <path d="${d}" fill="none" stroke="#292823" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n`;
writeFileSync(new URL('./daisy-clip-one-line.svg', import.meta.url), svg);
writeFileSync(new URL('./daisy-clip-commands.json', import.meta.url), JSON.stringify(commands));
console.log(`Wrote ${commands.length} connected commands; entry 1247,337; exit 1069,440`);
