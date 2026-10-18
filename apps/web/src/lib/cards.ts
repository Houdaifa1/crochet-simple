import { suggestColour } from '@crochet-simple/shared';
import sharp from 'sharp';
import all from '../assets/cards/all.jpg';
import type { Category, Pattern } from './content';

export interface CardLook {
  readonly picture: ImageMetadata;
  readonly colour: string;
  // a made scene has the subject on the right and one calm colour on the left
  readonly scene: boolean;
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const picked = new Map<string, Promise<string>>();

// the colour of the picture's left side, where the name sits
function leftColour(img: ImageMetadata): Promise<string> {
  const path = (img as ImageMetadata & { fsPath?: string }).fsPath;
  if (!path) return Promise.resolve(suggestColour('').hex);
  let colour = picked.get(path);
  if (!colour) {
    colour = sharp(path)
      .extract({
        left: 0,
        top: 0,
        width: Math.max(1, Math.round(img.width * 0.3)),
        height: img.height,
      })
      .resize(1, 1)
      .raw()
      .toBuffer()
      .then(([r, g, b]) => `#${hex(r!)}${hex(g!)}${hex(b!)}`.toUpperCase());
    picked.set(path, colour);
  }
  return colour;
}

export const allCard: CardLook = { picture: all, colour: '#1F4C9C', scene: true };

// its own picture when the admin has one, otherwise a photo from its patterns, so no card is ever empty
export async function cardLook(category: Category, list: Pattern[]): Promise<CardLook> {
  const { cardPicture, cardColour, name } = category.data;
  if (cardPicture)
    return {
      picture: cardPicture,
      colour: cardColour ?? (await leftColour(cardPicture)),
      scene: true,
    };
  return {
    picture: list[0]!.data.cover,
    colour: cardColour ?? suggestColour(name).hex,
    scene: false,
  };
}
