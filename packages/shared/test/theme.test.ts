import { describe, expect, it } from 'vitest';
import { PICTURE_RULES, cardPrompt, isHexColour, suggestColour } from '../src/theme.ts';

describe('category card themes', () => {
  it('picks a colour that fits the name', () => {
    expect(suggestColour('Christmas crochet patterns').hex).toBe('#B3122E');
    expect(suggestColour('Halloween').hex).toBe('#E5741F');
    expect(suggestColour('Baby booties and shoes').hex).toBe('#8FD3C3');
    expect(suggestColour('Baby clothes').hex).toBe('#9CC7EE');
    // animal groups each get their own colour, not one shared orange
    const animals = ['Sea animals', 'Birds', 'Farm and pet animals', 'Wild animals'].map(
      (n) => suggestColour(n).hex,
    );
    expect(new Set(animals).size).toBe(4);
  });

  it('gives any other name the same brand colour every time', () => {
    const first = suggestColour('Zigzag things');
    expect(isHexColour(first.hex)).toBe(true);
    expect(suggestColour('Zigzag things')).toEqual(first);
  });

  it('writes a full prompt with the size, the file name and the colour', () => {
    const prompt = cardPrompt({
      name: 'Halloween crochet patterns',
      slug: 'halloween-crochet-patterns',
    });
    expect(prompt).toContain(PICTURE_RULES);
    expect(prompt).toContain('1600 x 960 px');
    expect(prompt).toContain('File name: halloween-crochet-patterns.jpg');
    expect(prompt).toContain('pumpkin orange (#E5741F)');
    expect(prompt).not.toMatch(/[—–]/);
  });

  it('uses a chosen colour when one is set', () => {
    expect(cardPrompt({ name: 'Hats', slug: 'hats', colour: '#123abc' })).toContain('(#123ABC)');
    expect(cardPrompt({ name: 'Hats', slug: 'hats', colour: 'red' })).toContain('(#C8693E)');
  });
});
