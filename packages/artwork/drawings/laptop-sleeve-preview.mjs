import { writeFileSync } from 'node:fs';

// Reference: assets/approved-full-sequence/29-laptop-sleeve-approved.png.
// A single open pen route follows the sleeve's photographed perspective,
// visible laptop edge, dense crochet rows and central leather snap closure.
const commands = [];
let position = [0, 0];
const add = (letter, ...values) => {
  commands.push([letter, ...values.map(n => +n.toFixed(1))]);
  position = values.slice(-2);
};
const M = (x, y) => add('M', x, y);
const L = (x, y) => add('L', x, y);
const C = (a, b, c, d, x, y) => add('C', a, b, c, d, x, y);

function circleFromTop(cx, cy, rx, ry) {
  const k = 0.552285;
  C(cx + k*rx,cy-ry,cx+rx,cy-k*ry,cx+rx,cy);
  C(cx+rx,cy+k*ry,cx+k*rx,cy+ry,cx,cy+ry);
  C(cx-k*rx,cy+ry,cx-rx,cy+k*ry,cx-rx,cy);
  C(cx-rx,cy-k*ry,cx-k*rx,cy-ry,cx,cy-ry);
}

function stitchSpan(from, to, y, count, index) {
  const step = (to-from)/count;
  for (let n=0; n<count; n++) {
    const x = from+n*step;
    const next = x+step;
    const wobble = 1.3*Math.sin(n*2.18+index*1.61);
    // Each rounded upper hook and lower dip approximates one coarse stitch.
    C(x+step*.10,y-5+wobble,x+step*.22,y-9+wobble,x+step*.47,y-7);
    C(x+step*.67,y-5,x+step*.30,y+7+wobble,next,y);
  }
}

function stitchRow(index) {
  const y = 260 + index*18.1;
  const left = 331 - index*5.75;
  const right = 1325 + index*6.65;
  const forward = index % 2 === 0;
  const from = forward ? left : right;
  const to = forward ? right : left;
  C(position[0]+(from-position[0])*.42,position[1]+(y-position[1])*.38,
    from-(forward ? 1 : -1)*3,y-3,from,y);
  if (y < 456) {
    stitchSpan(from,to,y,49+Math.floor(index/4),index);
    return;
  }
  // The rows route along the leather edges and top to cross the tab without
  // drawing crochet stitches over its plain face.
  const firstEdge = forward ? 783 : 882;
  const secondEdge = forward ? 882 : 783;
  stitchSpan(from,firstEdge,y,Math.round(Math.abs(firstEdge-from)/21),index);
  L(firstEdge,456);
  L(secondEdge,456);
  L(secondEdge,y);
  stitchSpan(secondEdge,to,y,Math.round(Math.abs(to-secondEdge)/21),index);
}

// One continuous perimeter: the top plane is broad and shallow, with the
// front edge slightly wider from the photograph's perspective.
M(334,247);
C(486,233,1118,231,1303,239);
C(1335,239,1351,253,1361,281);
C(1393,368,1431,503,1451,582);
C(1463,613,1462,632,1443,650);
C(1418,667,1386,670,1348,669);
C(1116,669,562,668,297,663);
C(255,663,225,654,214,630);
C(203,608,210,587,216,565);
C(247,445,291,321,315,264);
C(320,252,326,248,334,247);

// Dense charcoal stitches turn at the side edges, so no separate row begins.
for (let row=0; row<18; row++) stitchRow(row);

// The front rim has a clear dark laptop opening. The leather tab interrupts
// that horizontal seam instead of being obscured by a line across its face.
C(211,575,213,587,218,596);
C(332,603,625,601,783,601);
C(783,557,783,502,788,456);
C(800,455,816,455,833,456);

// Brass stud near the top of the tan leather strip.
L(833,466);
circleFromTop(833,483,18,13);
L(833,477);
circleFromTop(833,483,7,6);
L(833,466);
L(833,456);
C(850,456,868,456,880,457);
C(880,510,881,557,882,601);
C(1045,602,1306,600,1440,598);

// Rolled front edge and the slim laptop body visible inside the sleeve.
C(1451,607,1451,620,1444,628);
C(1301,630,1051,628,882,627);
L(882,660);
C(852,661,813,662,784,661);
L(784,628);
C(597,628,358,628,232,628);
C(222,620,220,608,218,596);
C(221,612,230,621,246,624);
C(392,622,621,621,784,621);
L(784,635);
C(618,638,387,639,245,640);
C(229,637,222,630,217,619);

if (commands.filter(([letter]) => letter === 'M').length !== 1) throw new Error('The line must not lift');
const d = commands.map(c => c[0]+c.slice(1).join(',')).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="185 215 1310 480" width="1310" height="480" role="img" aria-label="One continuous line drawing of a charcoal crochet laptop sleeve with a central leather snap and visible laptop edge">
  <rect x="185" y="215" width="1310" height="480" fill="#f8f5ee"/>
  <path d="${d}" fill="none" stroke="#292823" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n`;
writeFileSync(new URL('./laptop-sleeve-one-line.svg',import.meta.url),svg);
writeFileSync(new URL('./laptop-sleeve-commands.json',import.meta.url),JSON.stringify(commands));
console.log(`Wrote ${commands.length} connected commands; entry 334,247; exit ${position.join(',')}`);
