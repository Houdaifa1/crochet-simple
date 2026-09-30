import type { ImageMetadata } from 'astro';
import type { DrawingId } from '@crochet-simple/artwork';
import hero from '../assets/story/00-yarn-hero.png';
import bag from '../assets/story/01-blue-market-bag.png';
import daisy from '../assets/story/02-daisy-clip.png';
import cozy from '../assets/story/03-olive-cup-cozy.png';
import pouch from '../assets/story/04-airpods-pouch.png';
import laptop from '../assets/story/05-laptop-sleeve.png';
import hat from '../assets/story/06-bucket-hat.png';
import panda from '../assets/story/07-crochet-panda.jpeg';
import bagA from '../assets/details/01a-bag-stitches.png';
import bagB from '../assets/details/01b-bag-cherries.png';
import daisyA from '../assets/details/02a-daisy-centre.png';
import daisyB from '../assets/details/02b-daisy-leaf.png';
import cozyA from '../assets/details/03a-cozy-ribbing.png';
import cozyB from '../assets/details/03b-cozy-rim.png';
import pouchA from '../assets/details/04a-pouch-button.png';
import pouchB from '../assets/details/04b-pouch-strap.png';
import laptopA from '../assets/details/05a-laptop-tab.png';
import laptopB from '../assets/details/05b-laptop-stitches.png';
import hatA from '../assets/details/06a-hat-stitches.png';
import hatB from '../assets/details/06b-hat-brim.png';
import pandaA from '../assets/details/07a-panda-face.png';
import pandaB from '../assets/details/07b-panda-ear.png';

export interface StoryProduct {
  readonly id: DrawingId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly photo: ImageMetadata;
  readonly alt: string;
  readonly details: readonly [ImageMetadata, ImageMetadata];
}

export const HERO = {
  photo: hero,
  alt: 'Indigo, sage and clay cotton yarn on linen with a metal crochet hook and one loose blue strand',
  // where the loose strand ends, in photo pixels
  yarnEnd: { x: 1164, y: 1017 },
  yarnDirection: { x: 0.45, y: 0.89 },
};

export const PRODUCTS: readonly StoryProduct[] = [
  {
    id: 'bag',
    name: 'Blue market bag',
    description: 'A structured tote in cobalt blue, finished with a pair of cherry charms.',
    tags: ['cobalt blue', 'cherry charms'],
    photo: bag,
    alt: 'Cobalt blue crochet market bag with two red cherry charms on a wooden chair',
    details: [bagA, bagB],
  },
  {
    id: 'daisy',
    name: 'Daisy clip',
    description: 'White petals around a golden centre, with a small olive leaf.',
    tags: ['cream petals', 'golden centre', 'olive leaf'],
    photo: daisy,
    alt: 'White crochet daisy hair clip with a golden centre and an olive leaf on a blue plate',
    details: [daisyA, daisyB],
  },
  {
    id: 'cozy',
    name: 'Olive cup cozy',
    description: 'Deep olive ribbing that turns a takeaway cup into something you want to hold.',
    tags: ['olive ribbing', 'takeaway cup'],
    photo: cozy,
    alt: 'Olive ribbed crochet cozy on a takeaway coffee cup by a sunny window',
    details: [cozyA, cozyB],
  },
  {
    id: 'pouch',
    name: 'AirPods pouch',
    description: 'A compact buttoned pouch with a soft crochet wrist strap.',
    tags: ['brass snaps', 'wrist strap'],
    photo: pouch,
    alt: 'Taupe crochet AirPods pouch with an open flap, brass buttons and a wrist strap on a desk',
    details: [pouchA, pouchB],
  },
  {
    id: 'laptop',
    name: 'Laptop sleeve',
    description: 'Dense charcoal stitches closed with a simple tan leather tab.',
    tags: ['charcoal stitches', 'leather tab'],
    photo: laptop,
    alt: 'Charcoal crochet laptop sleeve with a tan leather closure tab on a wooden desk',
    details: [laptopA, laptopB],
  },
  {
    id: 'hat',
    name: 'Bucket hat',
    description: 'Open stitches in warm pink and orange, shaped into a bright brim.',
    tags: ['pink and orange', 'open stitches'],
    photo: hat,
    alt: 'Pink and orange open stitch crochet bucket hat on a wooden stand',
    details: [hatA, hatB],
  },
  {
    id: 'panda',
    name: 'Crochet panda',
    description: 'A small black and white companion, shaped one round at a time.',
    tags: ['black and cream', 'amigurumi'],
    photo: panda,
    alt: 'Small black and cream crochet panda sitting on a wooden table',
    details: [pandaA, pandaB],
  },
];
