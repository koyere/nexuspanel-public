// nexus-panel/bot/src/commands/bundles/buttons.ts

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Bundle } from '../../services/bundleService';
import { BUTTON_IDS, EMOJIS, LIMITS } from '../../constants/bundleConstants';

/**
 * 🔘 BUNDLE BUTTONS
 * Creates interactive buttons for the bundle system
 */

export class BundleButtons {
  
  /**
   * Create main action buttons for bundle browsing
   */
  createBundleActionRow(bundles: Bundle[], currentPage: number): ActionRowBuilder<ButtonBuilder> {
    const bundle = bundles[currentPage];
    const isAvailable = bundle.isActive && !this.isBundleExpired(bundle) && !this.isPurchaseLimitReached(bundle);
    
    const row = new ActionRowBuilder<ButtonBuilder>();

    // Purchase Button
    const purchaseButton = new ButtonBuilder()
      .setCustomId(`${BUTTON_IDS.PURCHASE_PREFIX}${bundle.id}`)
      .setLabel(`Purchase for $${parseFloat(bundle.finalPrice).toFixed(2)}`)
      .setStyle(isAvailable ? ButtonStyle.Success : ButtonStyle.Danger)
      .setEmoji(EMOJIS.CART)
      .setDisabled(!isAvailable);

    // Details Button
    const detailsButton = new ButtonBuilder()
      .setCustomId(`${BUTTON_IDS.DETAILS_PREFIX}${bundle.id}`)
      .setLabel('Details')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJIS.INFO);

    // Preview Roles Button
    const previewButton = new ButtonBuilder()
      .setCustomId(`${BUTTON_IDS.PREVIEW_PREFIX}${bundle.id}`)
      .setLabel('Preview Roles')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJIS.EYES);

    row.addComponents(purchaseButton, detailsButton, previewButton);
    
    return row;
  }

  /**
   * Create navigation buttons for browsing multiple bundles - Discord v2 Enhanced
   */
  createNavigationRow(bundles: Bundle[], currentPage: number): ActionRowBuilder<ButtonBuilder> | null {
    // Only show navigation if there are multiple bundles
    if (bundles.length <= 1) return null;

    const row = new ActionRowBuilder<ButtonBuilder>();

    // Previous Button - Discord v2 Enhanced
    const previousButton = new ButtonBuilder()
      .setCustomId(`${BUTTON_IDS.NAV_PREVIOUS}_${currentPage - 1}`)
      .setLabel('Previous Bundle')
      .setStyle(currentPage === 0 ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setEmoji(EMOJIS.ARROW_LEFT)
      .setDisabled(currentPage === 0);

    // Page Info Button - Discord v2 Enhanced with better styling
    const infoButton = new ButtonBuilder()
      .setCustomId(BUTTON_IDS.NAV_INFO)
      .setLabel(`${currentPage + 1} of ${bundles.length}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJIS.GIFT)
      .setDisabled(true);

    // Next Button - Discord v2 Enhanced
    const nextButton = new ButtonBuilder()
      .setCustomId(`${BUTTON_IDS.NAV_NEXT}_${currentPage + 1}`)
      .setLabel('Next Bundle')
      .setStyle(currentPage === bundles.length - 1 ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setEmoji(EMOJIS.ARROW_RIGHT)
      .setDisabled(currentPage === bundles.length - 1);

    row.addComponents(previousButton, infoButton, nextButton);
    
    return row;
  }

  /**
   * Create utility buttons (history, etc.)
   */
  createUtilityRow(): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    // Purchase History Button
    const historyButton = new ButtonBuilder()
      .setCustomId(BUTTON_IDS.HISTORY)
      .setLabel('My Purchase History')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJIS.CLOCK);

    row.addComponents(historyButton);
    
    return row;
  }

  /**
   * Parse button custom ID to extract action and data
   */
  parseButtonId(customId: string): { action: string; bundleId?: string; page?: number } {
    // Handle navigation buttons
    if (customId.startsWith(BUTTON_IDS.NAV_PREVIOUS)) {
      const page = parseInt(customId.split('_').pop() || '0');
      return { action: 'nav_previous', page };
    }
    
    if (customId.startsWith(BUTTON_IDS.NAV_NEXT)) {
      const page = parseInt(customId.split('_').pop() || '0');
      return { action: 'nav_next', page };
    }

    // Handle bundle-specific buttons
    if (customId.startsWith(BUTTON_IDS.PURCHASE_PREFIX)) {
      const bundleId = customId.replace(BUTTON_IDS.PURCHASE_PREFIX, '');
      return { action: 'purchase', bundleId };
    }

    if (customId.startsWith(BUTTON_IDS.DETAILS_PREFIX)) {
      const bundleId = customId.replace(BUTTON_IDS.DETAILS_PREFIX, '');
      return { action: 'details', bundleId };
    }

    if (customId.startsWith(BUTTON_IDS.PREVIEW_PREFIX)) {
      const bundleId = customId.replace(BUTTON_IDS.PREVIEW_PREFIX, '');
      return { action: 'preview', bundleId };
    }

    // Handle utility buttons
    if (customId === BUTTON_IDS.HISTORY) {
      return { action: 'history' };
    }

    return { action: 'unknown' };
  }

  /**
   * Helper: Check if bundle is expired
   */
  private isBundleExpired(bundle: Bundle): boolean {
    if (!bundle.validUntil) return false;
    return new Date(bundle.validUntil) < new Date();
  }

  /**
   * Helper: Check if purchase limit is reached
   */
  private isPurchaseLimitReached(bundle: Bundle): boolean {
    if (!bundle.maxPurchases) return false;
    return (bundle._count?.purchases || 0) >= bundle.maxPurchases;
  }
}