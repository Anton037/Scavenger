export const STEP = 1 / 60;

export const HOUR_SECONDS = 55;
export const NIGHT_HOURS = 6;
export const TOTAL_NIGHT_SECONDS = HOUR_SECONDS * NIGHT_HOURS;

// Authentic FNaF 1 battery curve: 1 bar ~49% over a full night; double-doors drain out by ~3:50 AM
export const BASE_IDLE_DRAIN = 0.148;
export const EXTRA_BAR_DRAIN = 0.162;

export const FUSE_RESET_COST = 3;
export const KITCHEN_BELL_COST = 0;
export const KITCHEN_BELL_COOLDOWN = 22;

export const IR_FLASH_COST = 1;
export const IR_FLASH_COOLDOWN = 14;
export const IR_STUN_SECONDS = 6.0;

export const STEAM_BURST_MIN_HEAT = 45;
export const STEAM_BURST_DROP = 42;
export const STEAM_BURST_COOLDOWN = 18;
export const VENT_STEAM_MIN_HEAT = 10;
export const VENT_STEAM_DURATION = 2.4;
export const VENT_COOL_RATE = 21.0; // ~50% cooled over 2.4s

export const BON_EXPRESS_WINDOW = 5.5;
export const BON_EXPRESS_POWER = 5;
export const BON_EXPRESS_RUSTY_POWER = 7;
export const BON_REWARD_POWER = 3;
export const BON_RUSTY_REWARD_POWER = 5;
export const BON_WINDOW_SECONDS = 17;

export const SPEZI_CHARGES = 2;
export const SPEZI_BOOST_SECONDS = 8.0;

export const VIDEO_WARNING_SECONDS = 3.8;

export const SAVE_KEYS = {
  night: 'fnat_unlocked_night_v1',
  stars: 'fnat_stars_v1',
  achievements: 'fnat_achievements_v1',
  records: 'fnat_records_v1',
  settings: 'fnat_settings_v1',
};

export const DEFAULT_SETTINGS = {
  graphics: 'hd', // 'hd' | 'balanced' | 'retro'
  crt: 'subtle', // 'subtle' | 'strong' | 'off'
  volume: 0.85, // 0.0 .. 1.0
  mouseSens: 1.0, // 0.5 .. 2.0
  reducedMotion: false,
  audioSubtitles: false,
};
