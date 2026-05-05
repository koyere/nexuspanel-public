// nexus-panel/bot/src/commands/bundles/index.ts

import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction, MessageFlags } from 'discord.js';
import { BundleService } from '../../services/bundleService';
import { BundleEmbeds } from './embeds';
import { BundleButtons } from './buttons';
import { ERROR_MESSAGES, BUNDLE_ACTIONS, type BundleAction } from '../../constants/bundleConstants';
import { logBundleCommand, logBundleError, bundleLogger } from '../../utils/bundleLogger';

/**
 * 🎁 BUNDLE COMMAND HANDLER
 * Main handler for the /bundles Discord slash command
 */

export class BundleCommandHandler {
  private bundleService: BundleService;
  private bundleEmbeds: BundleEmbeds;
  private bundleButtons: BundleButtons;

  constructor() {
    this.bundleService = new BundleService();
    this.bundleEmbeds = new BundleEmbeds();
    this.bundleButtons = new BundleButtons();
  }

  /**
   * Create the slash command definition
   */
  createSlashCommand(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName('bundles')
      .setDescription('🛍️ Browse and purchase role bundles with exclusive discounts')
      .addStringOption(option =>
        option
          .setName('action')
          .setDescription('What would you like to do?')
          .setRequired(false)
          .addChoices(
            { name: '🛍️ Browse All Bundles', value: BUNDLE_ACTIONS.BROWSE },
            { name: '🛒 Purchase Bundle', value: BUNDLE_ACTIONS.BUY },
            { name: '📊 My Bundle History', value: BUNDLE_ACTIONS.HISTORY },
            { name: 'ℹ️ Bundle Details', value: BUNDLE_ACTIONS.DETAILS }
          )
      )
      .addStringOption(option =>
        option
          .setName('bundle')
          .setDescription('Bundle name or ID (for specific actions)')
          .setRequired(false)
          .setAutocomplete(true)
      ) as SlashCommandBuilder;
  }

  /**
   * Handle the slash command interaction
   */
  async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const guildId = interaction.guildId;
      if (!guildId) {
        await interaction.editReply({ 
          embeds: [this.bundleEmbeds.createErrorEmbed(ERROR_MESSAGES.NO_GUILD)] 
        });
        return;
      }

      const action = (interaction.options.getString('action') as BundleAction) || BUNDLE_ACTIONS.BROWSE;
      const bundleQuery = interaction.options.getString('bundle');

      logBundleCommand(action, {
        guildId,
        userId: interaction.user.id,
        action,
        data: { bundleQuery, username: interaction.user.tag }
      });

      switch (action) {
        case BUNDLE_ACTIONS.BROWSE:
          await this.handleBrowseAction(interaction, guildId);
          break;
        
        case BUNDLE_ACTIONS.BUY:
          await this.handleBuyAction(interaction, guildId, bundleQuery);
          break;
        
        case BUNDLE_ACTIONS.HISTORY:
          await this.handleHistoryAction(interaction);
          break;
        
        case BUNDLE_ACTIONS.DETAILS:
          await this.handleDetailsAction(interaction, bundleQuery);
          break;
        
        default:
          await this.handleBrowseAction(interaction, guildId);
      }

    } catch (error: any) {
      logBundleError('handleSlashCommand', {
        guildId: interaction.guildId || undefined,
        userId: interaction.user.id,
        error: error.message,
        data: { username: interaction.user.tag }
      });
      
      const errorEmbed = this.bundleEmbeds.createErrorEmbed(
        error.message || ERROR_MESSAGES.INTERNAL_ERROR
      );

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }

  /**
   * Handle button interactions
   */
  async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    try {
      const { action, bundleId, page } = this.bundleButtons.parseButtonId(interaction.customId);

      bundleLogger.logButtonInteraction(interaction.customId, {
        guildId: interaction.guildId || undefined,
        userId: interaction.user.id,
        bundleId,
        action,
        data: { username: interaction.user.tag, page }
      });

      switch (action) {
        case 'purchase':
          await this.handlePurchaseButton(interaction, bundleId!);
          break;
        
        case 'details':
          await this.handleDetailsButton(interaction, bundleId!);
          break;
        
        case 'preview':
          await this.handlePreviewButton(interaction, bundleId!);
          break;
        
        case 'nav_previous':
        case 'nav_next':
          await this.handleNavigationButton(interaction, action, page!);
          break;
        
        case 'history':
          await this.handleHistoryButton(interaction);
          break;
        
        default:
          await interaction.reply({ 
            content: 'Unknown button action.', 
            flags: MessageFlags.Ephemeral 
          });
      }

    } catch (error: any) {
      logBundleError('handleButtonInteraction', {
        guildId: interaction.guildId || undefined,
        userId: interaction.user.id,
        error: error.message,
        data: { 
          username: interaction.user.tag, 
          customId: interaction.customId 
        }
      });
      
      const errorMessage = error.message || ERROR_MESSAGES.INTERNAL_ERROR;
      
      if (interaction.deferred) {
        await interaction.editReply({ content: `❌ ${errorMessage}` });
      } else {
        await interaction.reply({ content: `❌ ${errorMessage}`, ephemeral: true });
      }
    }
  }

  /**
   * Handle browse action - shows bundle browser
   */
  private async handleBrowseAction(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
    const bundles = await this.bundleService.getGuildBundles(guildId);
    
    if (bundles.length === 0) {
      await interaction.editReply({
        embeds: [this.bundleEmbeds.createNoBundlesEmbed(interaction.guild?.name)]
      });
      return;
    }

    const currentPage = 0;
    const embed = this.bundleEmbeds.createBrowserEmbed(bundles, currentPage, interaction.guild?.name);
    
    const components = [];
    components.push(this.bundleButtons.createBundleActionRow(bundles, currentPage));
    
    const navRow = this.bundleButtons.createNavigationRow(bundles, currentPage);
    if (navRow) components.push(navRow);

    await interaction.editReply({
      embeds: [embed],
      components
    });
  }

  /**
   * Handle buy action - direct purchase of specific bundle
   */
  private async handleBuyAction(interaction: ChatInputCommandInteraction, guildId: string, bundleQuery?: string | null): Promise<void> {
    if (!bundleQuery) {
      // If no bundle specified, show browse view
      await this.handleBrowseAction(interaction, guildId);
      return;
    }

    // Find bundle by name or ID
    const bundles = await this.bundleService.getGuildBundles(guildId);
    const bundle = bundles.find(b => 
      b.id === bundleQuery || 
      b.name.toLowerCase().includes(bundleQuery.toLowerCase())
    );

    if (!bundle) {
      await interaction.editReply({
        embeds: [this.bundleEmbeds.createErrorEmbed(ERROR_MESSAGES.BUNDLE_NOT_FOUND)]
      });
      return;
    }

    await this.initiatePurchase(interaction, bundle);
  }

  /**
   * Handle purchase button click
   */
  private async handlePurchaseButton(interaction: ButtonInteraction, bundleId: string): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const bundle = await this.bundleService.getBundleDetails(bundleId);
    await this.initiatePurchase(interaction, bundle);
  }

  /**
   * Initiate purchase process
   */
  private async initiatePurchase(interaction: ChatInputCommandInteraction | ButtonInteraction, bundle: any): Promise<void> {
    try {
      bundleLogger.logCommand('initiatePurchase_start', {
        bundleId: bundle.id,
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        data: { bundleName: bundle.name }
      });

      const checkout = await this.bundleService.createBundleCheckout(
        bundle.id,
        interaction.user.id,
        interaction.guildId!
      );

      bundleLogger.logCommand('initiatePurchase_checkout_success', {
        bundleId: bundle.id,
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        data: { checkoutUrl: checkout.url, orderId: checkout.orderId }
      });

      const embed = this.bundleEmbeds.createPurchaseConfirmationEmbed(bundle, checkout.url);
      
      bundleLogger.logCommand('initiatePurchase_embed_created', {
        bundleId: bundle.id,
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        data: { embedTitle: embed.data.title }
      });

      await interaction.editReply({
        embeds: [embed],
        content: `🔗 **Click here to complete your purchase:** ${checkout.url}`
      });

      bundleLogger.logCommand('initiatePurchase_reply_sent', {
        bundleId: bundle.id,
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        data: { success: true }
      });

    } catch (error: any) {
      // Log the error for debugging
      logBundleError('initiatePurchase', {
        bundleId: bundle.id,
        userId: interaction.user.id,
        guildId: interaction.guildId!,
        error: error.message,
        data: { bundleName: bundle.name }
      });

      // Show specific error message from backend if available
      let errorMessage = ERROR_MESSAGES.CHECKOUT_ERROR;
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      const errorEmbed = this.bundleEmbeds.createErrorEmbed(errorMessage);
      
      await interaction.editReply({
        embeds: [errorEmbed]
      });
    }
  }

  /**
   * Handle details button click
   */
  private async handleDetailsButton(interaction: ButtonInteraction, bundleId: string): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const bundle = await this.bundleService.getBundleDetails(bundleId);
    
    // Create detailed info
    let detailsMessage = `📦 **${bundle.name}**\n\n`;
    detailsMessage += `💰 **Price:** $${bundle.finalPrice} (${bundle.discount}% OFF from $${bundle.individualTotal})\n`;
    detailsMessage += `💲 **You Save:** $${this.bundleService.calculateSavings(bundle).toFixed(2)}\n`;
    detailsMessage += `📅 **Valid Until:** ${bundle.validUntil ? new Date(bundle.validUntil).toLocaleDateString() : 'No expiration'}\n`;
    detailsMessage += `🛒 **Purchases:** ${bundle._count?.purchases || 0} times\n`;
    detailsMessage += `📋 **Roles Included:** ${bundle.roles.length}\n\n`;
    
    bundle.roles.forEach(r => {
      detailsMessage += `• ${r.role.name} ${r.role.price ? `($${r.role.price})` : ''}\n`;
    });

    await interaction.editReply({ content: detailsMessage });
  }

  /**
   * Handle preview button click
   */
  private async handlePreviewButton(interaction: ButtonInteraction, bundleId: string): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const bundle = await this.bundleService.getBundleDetails(bundleId);
    
    let previewMessage = `👁️ **Role Preview for "${bundle.name}"**\n\n`;
    previewMessage += `You will receive the following roles:\n\n`;
    
    bundle.roles.forEach(r => {
      previewMessage += `🎭 <@&${r.role.id}> - ${r.role.name}\n`;
    });

    await interaction.editReply({ content: previewMessage });
  }

  /**
   * Handle navigation button clicks
   */
  private async handleNavigationButton(interaction: ButtonInteraction, action: string, page: number): Promise<void> {
    await interaction.deferUpdate();
    
    const guildId = interaction.guildId!;
    const bundles = await this.bundleService.getGuildBundles(guildId);
    
    const embed = this.bundleEmbeds.createBrowserEmbed(bundles, page, interaction.guild?.name);
    
    const components = [];
    components.push(this.bundleButtons.createBundleActionRow(bundles, page));
    
    const navRow = this.bundleButtons.createNavigationRow(bundles, page);
    if (navRow) components.push(navRow);

    await interaction.editReply({
      embeds: [embed],
      components
    });
  }

  /**
   * Handle history action/button
   */
  private async handleHistoryAction(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.editReply({
      content: '📊 **Purchase History**\n\nThis feature will be implemented in the next update. You\'ll be able to see all your bundle purchases here.'
    });
  }

  private async handleHistoryButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({
      content: '📊 **Purchase History**\n\nThis feature will be implemented in the next update. You\'ll be able to see all your bundle purchases here.',
      flags: MessageFlags.Ephemeral
    });
  }

  /**
   * Handle details action
   */
  private async handleDetailsAction(interaction: ChatInputCommandInteraction, bundleQuery?: string | null): Promise<void> {
    await interaction.editReply({
      content: 'ℹ️ **Bundle Details**\n\nPlease use the browse command and click the Details button for specific bundles.'
    });
  }
}