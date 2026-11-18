export const ICONS = {
  crown: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 12h12v2H2v-2zm0-7l3.2 3L8 3.5 10.8 8 14 5v6H2V5z"/></svg>`,
  bolt: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.5 1L3 9h4.5L6.5 15 13 7H8.5L9.5 1z"/></svg>`,
  skull: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.5C4.7 1.5 2.5 3.8 2.5 6.8c0 1.8.8 3.2 2 4V13h2v-1.2h1V13h1v-1.2h1V13h2v-2.2c1.2-.8 2-2.2 2-4C13.5 3.8 11.3 1.5 8 1.5zM5.8 7.8a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2zm4.4 0a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2z"/></svg>`,
  lamp: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 6h5l4-3v10l-4-3H2V6zm10.5-1.5L15 3v2l-2.5-.5zm0 3.5H15v1.5h-2.5V8zm0 3.5L15 13v-2l-2.5.5z"/></svg>`,
  can: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 2h6v1.5l.8 1v8l-.8 1V14H5v-.5l-.8-1v-8l.8-1V2zm1 4v4h4V6H6z"/></svg>`,
  pan: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.5 2a4.5 4.5 0 103.3 7.6l1.7 1.7-1.1 1.1-1.7-1.7A4.5 4.5 0 009.5 2zm0 2a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM1.8 12.6l3-3 1.1 1.1-3 3-1.1-1.1z"/></svg>`,
  dash: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 4l5 4-5 4V4zm6 0l5 4-5 4V4z"/></svg>`,
  spezi: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2h7l.5 2v9l-1 1H5l-1-1V4l.5-2zm1 4v2h5V6h-5zm0 3.5v2h5v-2h-5z"/></svg>`,
  doner: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 6.5C3 3.8 5.2 2 8 2s5 1.8 5 4.5L9.5 14h-3L3 6.5zm2.5-.5h5a2.5 2.5 0 00-5 0z"/></svg>`,
  skewer: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M7.2 1h1.6v14H7.2V1zM5 3.5h6l-.6 2.2H5.6L5 3.5zm.3 3.5h5.4l-.6 2.2H5.9L5.3 7zm.4 3.5h4.6l-.5 2H6.2l-.5-2z"/></svg>`,
  fire: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8.5 1.5c1.5 2 3.8 3.8 3.8 6.8a4.3 4.3 0 01-8.6 0c0-1.9 1-3.5 2.1-4.6.2 1.2 1 2 1 2S6.5 3.2 8.5 1.5zm-.5 9.8a1.5 1.5 0 001.5-1.5c0-1-.8-1.8-1.5-2.5-.7.7-1.5 1.5-1.5 2.5a1.5 1.5 0 001.5 1.5z"/></svg>`,
  shield: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.5L2.5 3.8v4.1c0 3.2 2.3 5.7 5.5 6.6 3.2-.9 5.5-3.4 5.5-6.6V3.8L8 1.5z"/></svg>`,
  link: `<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.8 11.4a3.3 3.3 0 010-4.7l1.8-1.8a3.3 3.3 0 014.7 4.7l-.9.9-1.1-1.1.9-.9a1.8 1.8 0 00-2.5-2.5L7.9 7.8a1.8 1.8 0 000 2.5l-1.1 1.1zm2.4-6.8a3.3 3.3 0 010 4.7l-1.8 1.8a3.3 3.3 0 01-4.7-4.7l.9-.9 1.1 1.1-.9.9a1.8 1.8 0 002.5 2.5l1.8-1.8a1.8 1.8 0 000-2.5l1.1-1.1z"/></svg>`,
};

export function relicIcon(id) {
  if (id === 'log') return ICONS.crown;
  if (id === 'cylinder') return ICONS.spezi;
  if (id === 'spool') return ICONS.doner;
  return ICONS.skewer;
}

export function modIcon(id) {
  if (id === 'fire_pan') return ICONS.fire;
  if (id === 'twin_dash') return ICONS.dash;
  if (id === 'shock_pan') return ICONS.pan;
  if (id === 'searchlight') return ICONS.lamp;
  if (id === 'pfand_magnet') return ICONS.can;
  if (id === 'espresso') return ICONS.bolt;
  return ICONS.crown;
}
