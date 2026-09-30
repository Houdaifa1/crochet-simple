// the content folder the admin exports and the site builds from; layout in the README
export const CONTENT_VERSION = 1;

export interface Inline {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly href?: string;
}

export interface Price {
  readonly amount: number;
  readonly currency: string;
}

export interface Rating {
  readonly value: number;
  readonly count: number;
}

export type CardKind = 'pinterest' | 'etsy' | 'link';

// a pasted link, resolved at publish time; the image is saved next to the content
export interface LinkCard<Image = string> {
  readonly kind: CardKind;
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly image?: Image;
  readonly siteName?: string;
  readonly price?: Price;
  readonly rating?: Rating;
}

export type Block<Image = string> =
  | { readonly type: 'paragraph'; readonly content: readonly Inline[] }
  | { readonly type: 'heading'; readonly level: 2 | 3; readonly text: string }
  | {
      readonly type: 'list';
      readonly ordered: boolean;
      readonly items: readonly (readonly Inline[])[];
    }
  | {
      readonly type: 'image';
      readonly image: Image;
      readonly alt: string;
      readonly caption?: string;
    }
  | { readonly type: 'tip'; readonly title?: string; readonly content: readonly Inline[] }
  | {
      readonly type: 'rounds';
      readonly title?: string;
      readonly items: readonly {
        readonly label: string;
        readonly text: string;
        readonly count?: string;
      }[];
    }
  | { readonly type: 'table'; readonly rows: readonly (readonly [string, string])[] }
  | { readonly type: 'quote'; readonly text: string }
  | { readonly type: 'cards'; readonly cards: readonly LinkCard<Image>[] };

export interface PatternDetails {
  readonly hook?: string;
  readonly yarn?: string;
  readonly size?: string;
}
