// category card themes: a colour that fits the name, and the picture prompt in the shared house style

export interface ThemeColour {
  readonly label: string;
  readonly hex: string;
}

// first match wins, so the more specific words come first
const BY_WORD: readonly [RegExp, ThemeColour][] = [
  [/christmas|xmas|noel|santa/i, { label: 'deep festive red', hex: '#B3122E' }],
  [/halloween|pumpkin|spooky/i, { label: 'pumpkin orange', hex: '#E5741F' }],
  [/easter|bunny/i, { label: 'soft lilac', hex: '#B9A1E0' }],
  [/valentine|heart|love/i, { label: 'rose red', hex: '#D6375E' }],
  [/wedding|bridal/i, { label: 'warm ivory gold', hex: '#D9B66A' }],
  [/baby.*(shoe|bootie|sock)|booties/i, { label: 'fresh mint green', hex: '#8FD3C3' }],
  [/baby|newborn|toddler/i, { label: 'soft sky blue', hex: '#9CC7EE' }],
  [/flower|bouquet|rose|floral|daisy/i, { label: 'blush pink', hex: '#F2A7C3' }],
  [/beret|hat|beanie|cap/i, { label: 'warm terracotta', hex: '#C8693E' }],
  [/sea|ocean|fish|marine|beach animal/i, { label: 'ocean blue', hex: '#2A8BC4' }],
  [/bird|owl|chick|duck/i, { label: 'soft sunrise peach', hex: '#F2A97E' }],
  [/farm|pet|dog|cat|bunnies/i, { label: 'meadow green', hex: '#7DB46C' }],
  [/wild|jungle|safari|forest animal/i, { label: 'warm savanna gold', hex: '#D99A3C' }],
  [/amigurumi|toy|keychain|animal/i, { label: 'sunny orange', hex: '#F6A23C' }],
  [/collar|lace|jewel|accessor/i, { label: 'warm honey gold', hex: '#D2A54A' }],
  [
    /women|cardigan|sweater|top|dress|clothing|wear/i,
    { label: 'rich plum purple', hex: '#7A4FB5' },
  ],
  [/stitch|guide|learn|beginner|tutorial/i, { label: 'soft forest green', hex: '#4E9A68' }],
  [/bag|tote|purse|pouch/i, { label: 'deep teal', hex: '#1F7A7A' }],
  [/home|decor|blanket|pillow|cushion|kitchen/i, { label: 'soft sage green', hex: '#8AAE8C' }],
  [/summer|beach/i, { label: 'sunny yellow', hex: '#F2C744' }],
  [/winter|snow/i, { label: 'icy blue', hex: '#7FB2D9' }],
  [/autumn|fall/i, { label: 'warm rust', hex: '#B8501F' }],
  [/spring/i, { label: 'fresh spring green', hex: '#7CC47F' }],
];
// any other name still gets a calm colour from the brand family, the same one every time
const SPARE: readonly ThemeColour[] = [
  { label: 'deep royal blue', hex: '#1F4C9C' },
  { label: 'deep teal', hex: '#1F7A7A' },
  { label: 'rich plum purple', hex: '#7A4FB5' },
  { label: 'warm terracotta', hex: '#C8693E' },
  { label: 'soft forest green', hex: '#4E9A68' },
  { label: 'blush pink', hex: '#F2A7C3' },
];

export const isHexColour = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value);

export function suggestColour(name: string): ThemeColour {
  const found = BY_WORD.find(([word]) => word.test(name));
  if (found) return found[1];
  let n = 0;
  for (const ch of name.toLowerCase()) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return SPARE[n % SPARE.length]!;
}

export const PICTURE_RULES = `RULES FOR THIS PICTURE (apply all of them)
- Final file: exactly 1600 x 960 px (landscape 5:3), JPG, quality about 85, under 300 KB. If the generator gives another size, crop and resize it to exactly 1600 x 960 without stretching, keeping the main subject in the right half.
- Style: realistic lifestyle product photograph, as if shot on a full frame camera with a 50 mm lens at f/2.8, shallow depth of field, soft natural light. Never an illustration, cartoon, 3D render or painting.
- Layout: the main crochet subject sits in the RIGHT half of the frame, its centre at about 70 percent of the width, fully inside the frame with space around it.
- Text space: the LEFT 45 percent of the frame is calm and simple: one soft background colour (given below), slightly out of focus, with no objects, no small details and no bright spots. A category name is written on top of this area.
- Crochet must look handmade and real: clearly visible stitches, cotton or wool yarn texture, small natural irregularities. No knitting, no plastic, no felt.
- Colour: rich and vibrant but believable. The left side background colour is the main colour of the whole picture.
- Light: no harsh shadows, no blown out highlights, nothing pure black or pure white in the left area.
- Never include: text, letters, numbers, logos, brand names, watermarks, signatures, frames, borders, people, faces, hands, pets, screens or phones.
- Match the other category pictures: a clean studio set on a seamless coloured backdrop, same camera feel, same light, same distance to the subject.`;

export function cardPrompt(input: { name: string; slug: string; colour?: string }): string {
  const picked =
    input.colour && isHexColour(input.colour)
      ? { label: 'the chosen colour', hex: input.colour.toUpperCase() }
      : suggestColour(input.name);
  const subject = input.name.toLowerCase();
  return `Make one picture for the "${input.name}" category of a crochet pattern website.

${PICTURE_RULES}

File name: ${input.slug}.jpg
Left side background colour: ${picked.label} (${picked.hex}).
Scene: one beautiful handmade crochet piece that clearly shows "${subject}", made of real yarn, as the single main subject, with two or three small props that set the mood of this category, resting on a simple surface that suits it. Soft light that fits the theme.

Before you finish, check: exactly 1600 x 960 px, under 300 KB, subject in the right half, left side calm and one colour, no text, no people, stitches clearly visible.`;
}
