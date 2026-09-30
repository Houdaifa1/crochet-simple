import { writeFileSync } from 'node:fs';

// Reference: assets/cinematic-frame-04-panda-hero.jpeg.
// One open pen route, in photo-space coordinates, follows the panda's big
// crocheted head, black ears and patches, raised muzzle, short arms and paws.
const commands=[];
let position=[0,0];
const add=(letter,...values)=>{
  commands.push([letter,...values.map(n=>+n.toFixed(1))]);
  position=values.slice(-2);
};
const M=(x,y)=>add('M',x,y);
const L=(x,y)=>add('L',x,y);
const C=(a,b,c,d,x,y)=>add('C',a,b,c,d,x,y);

function ovalFromTop(cx,cy,rx,ry) {
  const k=.552285;
  C(cx+k*rx,cy-ry,cx+rx,cy-k*ry,cx+rx,cy);
  C(cx+rx,cy+k*ry,cx+k*rx,cy+ry,cx,cy+ry);
  C(cx-k*rx,cy+ry,cx-rx,cy+k*ry,cx-rx,cy);
  C(cx-rx,cy-k*ry,cx-k*rx,cy-ry,cx,cy-ry);
}

function stitchRow(left,right,y,count,bow,index,depth=5) {
  const forward=index%2===0;
  const from=forward?left:right,to=forward?right:left;
  const point=t=>{
    const x=from+(to-from)*t;
    const u=(x-left)/(right-left);
    return [x,y+bow*Math.sin(Math.PI*u)];
  };
  const first=point(0);
  C(position[0]+(first[0]-position[0])*.45,position[1]+(first[1]-position[1])*.42,
    first[0],first[1]-2,first[0],first[1]);
  for(let i=0;i<count;i++) {
    const p=point(i/count),q=point((i+1)/count);
    const dx=q[0]-p[0],wobble=Math.sin(i*2.4+index)*1.3;
    C(p[0]+dx*.13,p[1]-depth+wobble,
      p[0]+dx*.35,p[1]-depth*1.7+wobble,
      p[0]+dx*.52,p[1]-depth*.7);
    C(p[0]+dx*.73,p[1]+depth*.55,
      p[0]+dx*.81,p[1]+depth*.8,
      q[0],q[1]);
  }
}

// The ears are attached to the upper sides of a very large round head.
M(1062,230);
C(1005,211,958,270,958,349);
C(953,421,994,461,1058,464);
C(1015,531,1009,620,1034,703);
C(1074,811,1189,860,1362,878);
C(1537,891,1675,843,1727,746);
C(1767,671,1758,558,1715,467);
C(1774,474,1818,421,1811,344);
C(1805,269,1758,223,1688,223);
C(1626,220,1585,254,1576,295);
C(1516,239,1444,204,1370,203);
C(1272,200,1186,244,1129,319);
C(1111,268,1092,238,1062,230);

// Curved horizontal rows preserve the head's handmade yarn texture.
const headRows=[
  [1220,1510,282,18,8],
  [1163,1577,322,25,10],
  [1127,1627,362,31,11],
  [1092,1657,404,34,12],
  [1071,1681,446,35,12],
];
headRows.forEach((row,i)=>stitchRow(...row,i,6));

// Right black eye patch with a raised, glossy bead eye.
C(1702,470,1696,500,1682,532);
C(1654,477,1609,453,1558,471);
C(1509,491,1490,545,1510,611);
C(1526,668,1572,703,1626,704);
C(1674,695,1691,639,1682,532);
C(1654,518,1625,525,1586,531);
ovalFromTop(1586,562,29,31);
L(1586,546);
ovalFromTop(1586,562,16,16);
L(1586,531);

// Pronounced white snout and the small triangular embroidered nose.
C(1545,522,1518,542,1492,579);
C(1534,611,1544,676,1513,735);
C(1480,789,1393,807,1320,787);
C(1255,772,1224,718,1243,647);
C(1253,589,1306,556,1368,555);
C(1424,551,1470,558,1492,579);
C(1479,612,1466,653,1454,687);
C(1415,671,1363,668,1329,681);
C(1318,692,1351,719,1388,726);
C(1427,723,1446,702,1454,687);
C(1436,707,1409,723,1388,726);
L(1388,787);

// Left black eye patch, angled slightly toward the muzzle.
C(1336,785,1268,744,1218,708);
C(1159,710,1105,674,1097,612);
C(1089,552,1140,487,1200,468);
C(1250,452,1299,502,1291,566);
C(1282,640,1262,693,1218,708);
C(1159,710,1105,674,1097,612);
C(1089,552,1140,487,1200,468);
C(1190,490,1182,514,1187,535);
ovalFromTop(1187,566,29,31);
L(1187,550);
ovalFromTop(1187,566,16,16);
L(1187,535);

// A few stitches below the muzzle mark the white chin without crossing it.
C(1094,667,1110,777,1190,812);
stitchRow(1177,1599,814,26,16,0,6);
stitchRow(1200,1571,842,23,10,1,5);

// Left arm: low, round, and separate from the cream belly.
C(1107,849,1020,916,984,976);
C(955,1024,956,1072,993,1099);
C(1034,1137,1096,1099,1142,1019);
C(1190,947,1207,890,1200,842);

// Narrow black shoulder band, then the matching right arm.
C(1276,862,1433,873,1575,850);
C(1652,847,1775,929,1808,1002);
C(1840,1076,1784,1124,1723,1108);
C(1655,1092,1604,998,1575,921);
C(1562,889,1571,864,1575,850);

// White torso, slightly smaller than the head and partly behind the limbs.
C(1535,869,1547,928,1575,981);
C(1622,1067,1629,1142,1586,1228);
C(1544,1303,1453,1345,1382,1349);
C(1289,1353,1191,1307,1154,1227);
C(1110,1136,1149,1028,1210,950);
C(1238,911,1247,875,1319,870);

// The black collar has little pointed crochet stitches where it meets belly.
C(1283,890,1238,920,1210,950);
for(let i=0;i<16;i++) {
  const x=1210+i*23;
  C(x+5,938,x+9,939,x+12,962);
  C(x+16,944,x+20,943,x+23,951);
}

// Cream belly texture follows the belly's rounded shape.
const bellyRows=[
  [1238,1552,1022,20,12],
  [1207,1578,1064,23,15],
  [1187,1592,1106,25,17],
  [1194,1580,1149,25,18],
  [1214,1560,1192,23,15],
  [1240,1530,1235,20,13],
  [1281,1495,1277,15,9],
];
bellyRows.forEach((row,i)=>stitchRow(...row,i+1,7));

// Big splayed feet at the front, distinct from the rounded cream torso.
C(1255,1240,1230,1180,1209,1152);
C(1156,1115,1072,1134,1027,1192);
C(979,1256,985,1330,1040,1382);
C(1100,1430,1193,1420,1252,1362);
C(1302,1307,1288,1200,1209,1152);
const leftPawRows=[
  [1080,1210,1195,9,0],
  [1040,1235,1232,12,0],
  [1025,1240,1272,13,0],
  [1060,1228,1320,10,0],
];
leftPawRows.forEach((row,i)=>stitchRow(...row,i+1,8));
C(1243,1338,1251,1353,1252,1362);
C(1335,1358,1446,1354,1530,1378);
C(1491,1332,1494,1240,1545,1175);
C(1592,1116,1685,1109,1750,1170);
C(1810,1225,1818,1326,1752,1385);
C(1698,1434,1588,1431,1530,1378);
const rightPawRows=[
  [1560,1748,1350,13,0],
  [1540,1770,1315,15,0],
  [1540,1760,1275,15,0],
  [1570,1740,1233,12,0],
];
rightPawRows.forEach((row,i)=>stitchRow(...row,i,8));

if(commands.filter(([letter])=>letter==='M').length!==1) throw new Error('The line must not lift');
const d=commands.map(c=>c[0]+c.slice(1).join(',')).join(' ');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="925 180 930 1270" width="930" height="1270" role="img" aria-label="One continuous line drawing of a crochet panda with round black ears, dark eye patches, a raised muzzle, little arms and splayed feet">
  <rect x="925" y="180" width="930" height="1270" fill="#f8f5ee"/>
  <path d="${d}" fill="none" stroke="#292823" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n`;
writeFileSync(new URL('./crochet-panda-one-line.svg',import.meta.url),svg);
writeFileSync(new URL('./crochet-panda-commands.json',import.meta.url),JSON.stringify(commands));
console.log(`Wrote ${commands.length} connected commands; entry 1062,230; exit ${position.join(',')}`);
