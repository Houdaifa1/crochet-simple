import { writeFileSync } from 'node:fs';

// Reference: assets/approved-full-sequence/20-airpods-pouch-reveal.png.
// Photo-space coordinates preserve the pouch's open flap, white AirPods case,
// brass snaps and long braided wrist loop. This entire drawing is one open pen
// route. It enters at the right tip of the wrist loop and leaves at the pouch.
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

function circleFromLeft(cx, cy, r) {
  const k = .552285;
  C(cx-r,cy-k*r,cx-k*r,cy-r,cx,cy-r);
  C(cx+k*r,cy-r,cx+r,cy-k*r,cx+r,cy);
  C(cx+r,cy+k*r,cx+k*r,cy+r,cx,cy+r);
  C(cx-k*r,cy+r,cx-r,cy+k*r,cx-r,cy);
}
function circleFromRight(cx, cy, r) {
  const k = .552285;
  C(cx+r,cy-k*r,cx+k*r,cy-r,cx,cy-r);
  C(cx-k*r,cy-r,cx-r,cy-k*r,cx-r,cy);
  C(cx-r,cy+k*r,cx-k*r,cy+r,cx,cy+r);
  C(cx+k*r,cy+r,cx+r,cy+k*r,cx+r,cy);
}
function braidedC(a, b, c, d, x, y, units = 24, depth = 5) {
  const [sx, sy] = position;
  const sample = t => {
    const k = 1 - t;
    return [k*k*k*sx + 3*k*k*t*a + 3*k*t*t*c + t*t*t*x,
      k*k*k*sy + 3*k*k*t*b + 3*k*t*t*d + t*t*t*y];
  };
  for (let i = 0; i < units; i++) {
    const p = sample(i/units), q = sample((i+1)/units);
    const dx = q[0]-p[0], dy = q[1]-p[1];
    const length = Math.hypot(dx,dy) || 1;
    const nx = -dy/length*depth, ny = dx/length*depth;
    const mx = p[0]+dx*.52, my = p[1]+dy*.52;
    C(p[0]+dx*.17+nx,p[1]+dy*.17+ny,
      p[0]+dx*.37+nx,p[1]+dy*.37+ny,mx,my);
    C(mx+dx*.10-nx,my+dy*.10-ny,
      q[0]-dx*.17-nx,q[1]-dy*.17-ny,q[0],q[1]);
  }
}
function stitchRow(start, end, y, count) {
  Q((position[0]+start)/2,y-8,start,y);
  const step = (end-start)/count;
  for (let i=0;i<count;i++) {
    const x=start+i*step;
    const wobble=Math.sin(i*2.4+y*.08)*1.5;
    C(x+step*.10,y-6+wobble,x+step*.34,y-8+wobble,x+step*.48,y-1);
    C(x+step*.40,y+5+wobble,x+step*.64,y+7+wobble,x+step*.75,y+2);
    C(x+step*.86,y-4+wobble,x+step*.94,y-2,x+step,y);
  }
}

// Wrist strap: outer loop, gold attachment ring, inner loop, then a crocheted
// strand back to the ring. It is a broad, braided wrist loop in the photograph,
// rather than a simple string coming out of the pouch.
M(1511,724);
C(1542,743,1551,777,1544,807);
C(1536,853,1495,875,1436,878);
C(1315,884,1174,845,1114,782);
C(1068,735,1046,645,1024,559);
C(1015,534,1006,513,1015,493);
C(1027,470,1047,468,1062,486);
C(1075,503,1068,531,1051,544);
C(1036,554,1016,546,1015,526);
C(1011,514,1012,503,1015,493);
C(1040,475,1069,479,1098,493);
C(1209,542,1401,638,1511,724);
// Inner negative space inside the wrist loop.
C(1483,714,1304,632,1179,572);
C(1128,546,1087,524,1058,523);
C(1085,611,1124,730,1198,770);
C(1290,822,1418,846,1486,821);
C(1512,807,1522,771,1511,724);
braidedC(1380,632,1150,540,1058,523,32,5.5);

// Rounded pouch body with its visibly open mouth. The flap rises behind it.
C(1036,519,1021,519,1006,526);
C(1013,616,1014,714,989,752);
C(971,789,910,804,833,800);
C(715,795,590,785,535,758);
C(495,739,485,700,492,625);
C(493,555,496,476,513,433);
C(530,397,582,387,642,390);
C(738,385,863,392,951,402);
C(997,406,1023,462,1006,526);
// The thick front rim curves around, in front of the white charging case.
C(909,527,797,527,705,511);
C(607,499,553,483,513,433);
C(533,452,563,467,584,474);

// White AirPods charging case inside the opening, not a generic empty pouch.
C(579,435,605,404,650,400);
C(737,398,858,408,917,421);
C(944,430,957,451,952,478);
C(951,492,935,501,915,502);
C(807,506,681,501,584,474);
// Reach the flap's hinge along the visible inner opening.
C(613,443,628,417,649,398);

// Upright rectangular flap, wider at its rounded crocheted top.
C(652,325,654,221,663,143);
C(669,112,696,105,727,106);
C(802,103,893,109,930,124);
C(955,135,958,163,956,205);
C(959,274,956,356,950,411);
C(855,402,738,399,649,398);
// Return up its left stitched border to the upper brass snap.
C(653,320,656,221,663,143);
C(688,125,725,130,755,173);
C(754,188,754,199,756,205);
circleFromLeft(799,205,43);
L(785,205);
circleFromLeft(799,205,14);
C(785,226,786,250,785,270);

// A few chunky rows keep the button legible while giving the flap its texture.
stitchRow(785,930,270,7);
stitchRow(930,675,301,13);
stitchRow(675,930,332,13);
stitchRow(930,675,363,13);
stitchRow(675,930,392,13);

// Front basket, second brass snap, and stitches around that snap.
C(980,425,1014,473,1006,526);
stitchRow(974,530,551,22);
stitchRow(530,970,585,22);
stitchRow(970,746,650,11);
circleFromRight(700,650,46);
L(714,650);
circleFromRight(700,650,14);
L(654,650);
stitchRow(654,530,650,6);
stitchRow(530,968,714,22);
stitchRow(968,541,746,21);
stitchRow(541,940,775,20);

if (commands.filter(([letter]) => letter === 'M').length !== 1) throw new Error('The line must not lift');
const d = commands.map(c => c[0]+c.slice(1).join(',')).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="455 95 1120 800" width="1120" height="800" role="img" aria-label="One continuous line drawing of an open crochet AirPods pouch holding a white charging case, with brass snaps and a braided wrist strap">
  <rect x="455" y="95" width="1120" height="800" fill="#f8f5ee"/>
  <path d="${d}" fill="none" stroke="#292823" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n`;
writeFileSync(new URL('./airpods-pouch-one-line.svg',import.meta.url),svg);
writeFileSync(new URL('./airpods-pouch-commands.json',import.meta.url),JSON.stringify(commands));
console.log(`Wrote ${commands.length} connected commands; entry 1511,724; exit ${position.join(',')}`);
