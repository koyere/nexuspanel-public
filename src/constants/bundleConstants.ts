// nexus-panel/bot/src/constants/bundleConstants.ts

/**
 * 🎁 BUNDLE SYSTEM CONSTANTS
 * Constants for the Discord /bundles command system
 */

// Discord Colors (using Discord Blurple theme)
export const COLORS = {
  PRIMARY: 0x5865F2,     // Discord Blurple
  SUCCESS: 0x57F287,     // Green
  ERROR: 0xED4245,       // Red  
  WARNING: 0xFEE75C,     // Yellow
  INFO: 0x3498DB,        // Blue
  PREMIUM: 0x9B59B6,     // Purple
} as const;

// Emojis for bundle system
export const EMOJIS = {
  SHOP: '🛍️',
  CART: '🛒',
  STAR: '⭐',
  USERS: '👥',
  CLOCK: '🕒',
  MONEY: '💰',
  TAG: '🏷️',
  GIFT: '🎁',
  CHECK: '✅',
  ERROR: '❌',
  LOCK: '🔒',
  DIAMOND: '💎',
  ARROW_LEFT: '⬅️',
  ARROW_RIGHT: '➡️',
  INFO: 'ℹ️',
  EYES: '👁️',
  CELEBRATION: '🎉',
  SPARKLES: '✨',
  FIRE: '🔥',
  WARNING: '⚠️',
  CHART: '📊',
  TROPHY: '🏆',
} as const;

// Bundle system limits
export const LIMITS = {
  MAX_BUNDLES_PER_PAGE: 1,          // Show 1 bundle per page for detailed view
  MAX_EMBED_FIELDS: 25,             // Discord limit
  MAX_EMBED_DESCRIPTION: 4096,      // Discord limit
  MAX_EMBED_TITLE: 256,             // Discord limit
  MAX_BUTTON_LABEL: 80,             // Discord limit
  CACHE_TTL_SECONDS: 300,           // 5 minutes cache
} as const;

// Button custom IDs (must be unique and < 100 chars)
export const BUTTON_IDS = {
  PURCHASE_PREFIX: 'purchase_bundle_',
  DETAILS_PREFIX: 'details_bundle_',
  PREVIEW_PREFIX: 'preview_bundle_',
  NAV_PREVIOUS: 'nav_bundle_prev',
  NAV_NEXT: 'nav_bundle_next',
  NAV_INFO: 'nav_info',
  HISTORY: 'bundle_history',
} as const;

// Modal custom IDs
export const MODAL_IDS = {
  BUNDLE_DETAILS_PREFIX: 'bundle_details_',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  GET_GUILD_BUNDLES: (guildId: string) => `/api/bundles/public/guild/${guildId}`,
  GET_BUNDLE_DETAILS: (bundleId: string) => `/api/bundles/public/${bundleId}`,
  CREATE_CHECKOUT: (bundleId: string) => `/api/checkout/bundle/${bundleId}`,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NO_GUILD: 'This command can only be used in a server.',
  NO_BUNDLES: 'No bundles available for purchase in this server.',
  API_ERROR: 'An error occurred while fetching bundles. Please try again later.',
  CHECKOUT_ERROR: 'Failed to create checkout session. Please try again later.',
  BUNDLE_NOT_FOUND: 'Bundle not found or no longer available.',
  INTERNAL_ERROR: 'Internal bot error. Please contact server administrators.',
  ALREADY_PURCHASED: 'You already have an active purchase for this bundle.',
  BUNDLE_INACTIVE: 'This bundle is no longer available for purchase.',
  PURCHASE_LIMIT_REACHED: 'Purchase limit reached for this bundle.',
  CONFIG_ERROR: 'Bot configuration error. Please contact server administrators.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CHECKOUT_CREATED: 'Checkout session created successfully!',
  BUNDLE_DETAILS_SHOWN: 'Bundle details displayed.',
} as const;

// Bundle action types for the /bundles command
export const BUNDLE_ACTIONS = {
  BROWSE: 'browse',
  BUY: 'buy', 
  HISTORY: 'history',
  DETAILS: 'details',
} as const;

export type BundleAction = typeof BUNDLE_ACTIONS[keyof typeof BUNDLE_ACTIONS];
export type Color = typeof COLORS[keyof typeof COLORS];
export type Emoji = typeof EMOJIS[keyof typeof EMOJIS];