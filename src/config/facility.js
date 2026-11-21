export const CAMERAS = [
  { id: '1A', name: 'Ausgabe & Spieß-Theke', compactName: 'Ausgabe', short: '1A', x: 39, y: 12 },
  { id: '1B', name: 'Gastraum Nord', compactName: 'Gastraum', short: '1B', x: 34, y: 31 },
  { id: '1C', name: 'Vorhang-Nische', compactName: 'Vorhang', short: '1C', x: 18, y: 47 },
  { id: '2A', name: 'West-Flur', short: '2A', x: 31, y: 69 },
  { id: '2B', name: 'West-Ecke', short: '2B', x: 31, y: 84, steamSide: 'left' },
  { id: '3', name: 'Pfand- & Putzkammer', compactName: 'Pfandlager', short: '3', x: 15, y: 69 },
  { id: '4A', name: 'Ost-Flur', short: '4A', x: 56, y: 69 },
  { id: '4B', name: 'Ost-Ecke', short: '4B', x: 56, y: 84, steamSide: 'right' },
  { id: '5', name: 'Hinterzimmer / Spinde', compactName: 'Spinde', short: '5', x: 10, y: 27 },
  { id: '6', name: 'Küchen-Audio', compactName: 'Küche', short: '6', x: 80, y: 60, audioOnly: true },
];

export const CAMERA_MAP = Object.fromEntries(CAMERAS.map((c) => [c.id, c]));

export const ANTON_GRAPH = {
  '1A': ['1B', '5'],
  '1B': ['5', '2A'],
  '5': ['1B', '2A'],
  '2A': ['3', '2B'],
  '3': ['2A', 'left_door'],
  '2B': ['3', 'left_door'],
};

export const TOM_GRAPH = {
  '1A': ['1B'],
  '1B': ['6', '4A'],
  '6': ['4A', 'back_hatch'],
  '4A': ['4B', 'back_hatch'],
  '4B': ['4A', 'right_door'],
};

// Chef Torge advances from 1A -> 1B -> 6 -> 3 visible depth stages in the doorless Center Pass-Through!
export const TORGE_PATH = ['1A', '1B', '6', 'center_far', 'center_mid', 'center_near'];
