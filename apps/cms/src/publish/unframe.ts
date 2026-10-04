import { copyFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// the cream frame that cover designs are delivered with (the site's own sheet color)
export const FRAME = { r: 251, g: 248, b: 241 } as const;
const PHOTO = /\.(jpe?g|png|webp)$/i;
const near = ([r, g, b]: number[]) =>
  Math.abs(r! - FRAME.r) <= 2 && Math.abs(g! - FRAME.g) <= 2 && Math.abs(b! - FRAME.b) <= 2;

// copies a file for the website; a photo framed in exactly that cream loses the frame, the original stays as it is
export async function copyPhoto(from: string, to: string): Promise<boolean> {
  if (!PHOTO.test(from)) {
    await copyFile(from, to);
    return false;
  }
  const { data, info } = await sharp(from).raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i]!, data[i + 1]!, data[i + 2]!];
  };
  const w = info.width - 1;
  const h = info.height - 1;
  if (![at(0, 0), at(w, 0), at(0, h), at(w, h)].every(near)) {
    await copyFile(from, to);
    return false;
  }
  const trimmed = sharp(from).rotate().trim({ background: FRAME, threshold: 12 });
  const out = /\.png$/i.test(from)
    ? trimmed.png()
    : /\.webp$/i.test(from)
      ? trimmed.webp({ quality: 92 })
      : trimmed.jpeg({ quality: 92, mozjpeg: true });
  const { data: result, info: size } = await out.toBuffer({ resolveWithObject: true });
  // a frame covers the edges only; if trimming would leave a sliver, keep the photo as delivered
  if (size.width * size.height < 0.2 * info.width * info.height) {
    await copyFile(from, to);
    return false;
  }
  await writeFile(to, result);
  return true;
}
