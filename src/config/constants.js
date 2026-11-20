export const STEP = 1 / 60;

export const HOUR_SECONDS = 55;
export const NIGHT_HOURS = 6;
export const TOTAL_NIGHT_SECONDS = HOUR_SECONDS * NIGHT_HOURS;

// Balanced booth battery curve: 1 bar ~49% over a full shift; double-shutters drain out mid-shift
export const BASE_IDLE_DRAIN = 0.148;
export const EXTRA_BAR_DRAIN = 0.162;

// 2-Station Navigation & Under-Desk Hide
export const TURN_DURATION = 0.28;
export const DUCK_DURATION = 0.22;
export const BREATH_MAX = 100;
export const BREATH_DRAIN_RATE = 15.5; // ~6.45s max continuous hold
export const BREATH_RECOVER_RATE = 24.0;

// Tactical Flashlight Capacitor
export const FLASHLIGHT_DRAIN_RATE = 7.2;
export const FLASHLIGHT_RECHARGE_RATE = 4.6;

// Back-Station Multi-Step Order Prep
export const PREP_DONER_SECONDS = 2.2;
export const PREP_FRYER_SECONDS = 4.0;
export const PREP_BAG_SECONDS = 1.0;

export const FUSE_RESET_COST = 3;
export const KITCHEN_BELL_COST = 0;
export const KITCHEN_BELL_COOLDOWN = 20;

export const IR_FLASH_COST = 1;
export const IR_FLASH_COOLDOWN = 13;
export const IR_STUN_SECONDS = 6.0;

export const STEAM_BURST_MIN_HEAT = 45;
export const STEAM_BURST_DROP = 42;
export const STEAM_BURST_COOLDOWN = 18;
export const VENT_STEAM_MIN_HEAT = 10;
export const VENT_STEAM_DURATION = 2.4;
export const VENT_COOL_RATE = 21.0;

export const BON_EXPRESS_WINDOW = 14.0;
export const BON_EXPRESS_POWER = 5;
export const BON_EXPRESS_RUSTY_POWER = 7;
export const BON_REWARD_POWER = 3;
export const BON_RUSTY_REWARD_POWER = 5;
export const BON_WINDOW_SECONDS = 42;

export const SPEZI_CHARGES = 2;
export const SPEZI_BOOST_SECONDS = 8.0;

export const VIDEO_WARNING_SECONDS = 3.8;

export const SAVE_KEYS = {
  night: 'fnat_unlocked_night_v1',
  stars: 'fnat_stars_v1',
  achievements: 'fnat_achievements_v1',
  records: 'fnat_records_v1',
  settings: 'fnat_settings_v1',
  wallet: 'fnat_wallet_v2',
  cosmetics: 'fnat_cosmetics_v2',
  tapes: 'fnat_tapes_v2',
  presets: 'fnat_presets_v2',
};

export const DEFAULT_SETTINGS = {
  crt: 'subtle', // 'subtle' | 'strong' | 'off' — VHS-Post-Intensität (ein Grafikstil für alle Geräte)
  volume: 0.85, // 0.0 .. 1.0
  mouseSens: 1.0, // 0.5 .. 2.0
  reducedMotion: false,
  audioSubtitles: false,
  lookArrows: false, // touch look-hold arrows; drag-to-look always works regardless
};
