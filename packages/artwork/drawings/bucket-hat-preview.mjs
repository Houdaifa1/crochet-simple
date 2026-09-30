import { writeFileSync } from 'node:fs';

// Reference: assets/approved-full-sequence/43-colored-hat-hero.png.
// One uninterrupted open pen route traces the hat's low dome, open crochet
// bands, flared brim, thick rolled edge, and the wooden display stand below.
const commands = [];
let position = [0, 0];
const add = (letter, ...values) => {
  commands.push([letter, ...values.map(n => +n.toFixed(1))]);
  position = values.slice(-2);
};
const M = (x, y) => add('M', x, y);
const L = (x, y) => add('L', x, y);
const C = (a, b, c, d, x, y) => add('C', a, b, c, d, x, y);

const bands = [
  { l:687,r:954,y:128,bow:8,type:'ridge',n:17 },
  { l:638,r:1001,y:157,bow:10,type:'ridge',n:23 },
  { l:605,r:1034,y:188,bow:11,type:'ridge',n:27 },
  { l:582,r:1055,y:216,bow:13,type:'open',n:29 },
  { l:570,r:1067,y:250,bow:12,type:'ridge',n:30 },
  { l:558,r:1076,y:283,bow:15,type:'open',n:31 },
  { l:558,r:1078,y:318,bow:14,type:'ridge',n:32 },
  { l:550,r:1088,y:351,bow:17,type:'open',n:34 },
  { l:535,r:1100,y:386,bow:17,type:'ridge',n:36 },
  { l:518,r:1122,y:421,bow:18,type:'open',n:38 },
  { l:477,r:1164,y:454,bow:19,type:'ridge',n:41 },
  { l:430,r:1208,y:485,bow:20,type:'open',n:44 },
  { l:421,r:1216,y:517,bow:24,type:'ridge',n:46 },
  { l:465,r:1175,y:547,bow:22,type:'open',n:40 },
  { l:556,r:1083,y:575,bow:17,type:'ridge',n:32 },
];

function band(spec, index) {
  const forward = index % 2 === 0;
  const from = forward ? spec.l : spec.r;
  const to = forward ? spec.r : spec.l;
  const point = t => {
    const x=from+(to-from)*t;
    const u=(x-spec.l)/(spec.r-spec.l);
    return [x,spec.y+spec.bow*Math.sin(Math.PI*u)];
  };
  const first=point(0);
  C(position[0]+(first[0]-position[0])*.45,position[1]+(first[1]-position[1])*.45,
    first[0],first[1]-3,first[0],first[1]);
  for (let j=0;j<spec.n;j++) {
    const p=point(j/spec.n),q=point((j+1)/spec.n);
    const dx=q[0]-p[0],dy=q[1]-p[1];
    const wiggle=Math.sin(j*2.3+index*.7)*1.2;
    if (spec.type==='open') {
      // A tall, rounded chain rises above the stitch line, leaving an
      // actual open space against the denser round immediately above it.
      C(p[0]+dx*.04,p[1]-9+wiggle,
        p[0]+dx*.15,p[1]-18+wiggle,
        p[0]+dx*.48,p[1]-18);
      C(p[0]+dx*.82,p[1]-18,
        p[0]+dx*.93,p[1]-8,
        q[0],q[1]);
    } else {
      // Compact rounds create the raised pink and orange ridges in the photo.
      C(p[0]+dx*.13,p[1]-5+wiggle,
        p[0]+dx*.31,p[1]-9+wiggle,
        p[0]+dx*.51,p[1]-4);
      C(p[0]+dx*.68,p[1]+4,
        p[0]+dx*.74,p[1]+6,
        q[0],q[1]);
    }
  }
}

// The photographed brim is broad and subtly uneven, with a gently rounded
// crown rather than a tall cylinder or a straight-sided cone.
M(682,121);
C(724,99,775,90,818,92);
C(906,90,992,119,1035,166);
C(1057,194,1065,247,1073,300);
C(1083,360,1108,409,1148,443);
C(1187,477,1233,498,1234,520);
C(1235,538,1203,544,1168,558);
C(1071,595,952,614,820,618);
C(674,614,547,588,456,549);
C(426,537,398,521,408,501);
C(431,477,472,453,511,417);
C(545,384,551,332,562,279);
C(568,221,580,183,609,154);
C(631,136,655,129,682,121);

for (let i=0;i<bands.length;i++) band(bands[i],i);

// A second braided line follows the orange hem just above the silhouette.
C(1141,563,1192,547,1219,536);
const count=57;
const hem=t=>[1219-797*t,536+77*Math.sin(Math.PI*t)-15*t];
for(let i=0;i<count;i++) {
  const p=hem(i/count),q=hem((i+1)/count);
  const dx=q[0]-p[0],dy=q[1]-p[1];
  C(p[0]+dx*.13,p[1]-4,p[0]+dx*.43,p[1]-6,p[0]+dx*.54,p[1]-2);
  C(p[0]+dx*.68,p[1]+4,p[0]+dx*.82,p[1]+4,q[0],q[1]);
}

// Follow the rolled brim back to its center, then continue down the visible
// wooden post. The broad oval foot has a shallow top and a thick rounded rim.
C(519,574,647,608,781,618);
L(781,768);
C(742,758,681,759,663,779);
C(653,791,653,813,661,829);
C(674,852,716,861,784,862);
C(857,868,933,860,961,841);
C(980,827,978,795,965,778);
C(944,755,884,748,850,767);
L(850,618);
L(850,767);
C(900,754,950,767,965,778);
C(946,798,892,813,819,813);
C(747,813,685,803,663,779);
C(697,762,749,758,781,768);

if (commands.filter(([letter]) => letter === 'M').length !== 1) throw new Error('The line must not lift');
const d=commands.map(c=>c[0]+c.slice(1).join(',')).join(' ');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="385 75 870 805" width="870" height="805" role="img" aria-label="One continuous line drawing of a pink and orange crochet bucket hat with a flared brim on a wooden stand with a round base">
  <rect x="385" y="75" width="870" height="805" fill="#f8f5ee"/>
  <path d="${d}" fill="none" stroke="#292823" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n`;
writeFileSync(new URL('./bucket-hat-one-line.svg',import.meta.url),svg);
writeFileSync(new URL('./bucket-hat-commands.json',import.meta.url),JSON.stringify(commands));
console.log(`Wrote ${commands.length} connected commands; entry 682,121; exit ${position.join(',')}`);
