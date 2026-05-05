// nexus-panel/bot/src/commands/bundles/embeds.ts

import { EmbedBuilder } from 'discord.js';
import { Bundle, BundleService } from '../../services/bundleService';
import { COLORS, EMOJIS } from '../../constants/bundleConstants';

/**
 * 🎨 BUNDLE EMBEDS
 * Creates modern Discord embeds for the bundle system
 */

export class BundleEmbeds {
  private bundleService: BundleService;

  constructor() {
    this.bundleService = new BundleService();
  }

  /**
   * Create main bundle browser embed (shows one bundle at a time) - Discord v2 Enhanced
   */
  createBrowserEmbed(bundles: Bundle[], currentPage: number, guildName?: string): EmbedBuilder {
    const bundle = bundles[currentPage];
    const bundleService = this.bundleService;
    
    // Calculate values
    const savings = bundleService.calculateSavings(bundle);
    const status = bundleService.getBundleStatus(bundle);
    const isAvailable = status === 'available';

    // Discord v2 Enhanced - Rich title with server context
    const serverContext = guildName ? ` | ${guildName}` : '';
    
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.SHOP} **BUNDLE STORE** - Premium Role Packages${serverContext}`)
      .setDescription(`${EMOJIS.DIAMOND} **Exclusive discounts on multiple roles!**\n${EMOJIS.GIFT} Showing bundle **${currentPage + 1}** of **${bundles.length}**\n\n${EMOJIS.SPARKLES} **Limited time offers - Don't miss out!**`)
      .setColor(isAvailable ? COLORS.PRIMARY : COLORS.WARNING);

    // Featured Bundle Section - Discord v2 Enhanced
    const bundleStatus = isAvailable ? `${EMOJIS.CHECK} **Available Now**` : `${EMOJIS.WARNING} **Limited/Expired**`;
    embed.addFields({
      name: `${EMOJIS.STAR} **${bundle.name}** ${bundleStatus}`,
      value: `${bundle.description || 'Premium role package with exclusive benefits'}\n\n${EMOJIS.FIRE} **Popular choice** - Join ${bundle._count?.purchases || 0} satisfied customers!`,
      inline: false
    });

    // Pricing Section - Discord v2 Enhanced with visual appeal
    let pricingValue = `~~${bundleService.formatPrice(bundle.individualTotal)}~~ ${EMOJIS.ARROW_RIGHT} **${bundleService.formatPrice(bundle.finalPrice)}**\n`;
    pricingValue += `${EMOJIS.TAG} **${bundle.discount}% OFF** - Save ${bundleService.formatPrice(savings)}\n`;
    pricingValue += `${EMOJIS.SPARKLES} **Best Value Package**`;
    
    embed.addFields({
      name: `${EMOJIS.MONEY} **Pricing & Savings**`,
      value: pricingValue,
      inline: true
    });

    // Includes Section - Discord v2 Enhanced
    const rolesList = bundle.roles.map(r => `• <@&${r.role.id}>`).join('\n');
    const includesValue = `${EMOJIS.USERS} **${bundle.roles.length} Premium Roles**\n${rolesList}\n\n${EMOJIS.DIAMOND} **Instant Access** - No waiting!`;
    
    embed.addFields({
      name: `${EMOJIS.GIFT} **What's Included**`,
      value: includesValue,
      inline: true
    });

    // Popularity Section - Discord v2 Enhanced with social proof
    const purchaseCount = bundle._count?.purchases || 0;
    const popularityEmoji = purchaseCount >= 10 ? EMOJIS.FIRE : purchaseCount >= 5 ? EMOJIS.STAR : EMOJIS.CHART;
    const popularityStatus = purchaseCount >= 10 ? '**Bestseller**' : purchaseCount >= 5 ? '**Popular**' : '**New**';
    
    let popularityValue = `${EMOJIS.USERS} **${purchaseCount}** purchases\n`;
    popularityValue += `${popularityEmoji} ${popularityStatus} in this server\n`;
    popularityValue += `${EMOJIS.TROPHY} **Community Approved**`;

    embed.addFields({
      name: `${EMOJIS.CHART} **Community Stats**`,
      value: popularityValue,
      inline: true
    });

    // Status warnings if needed
    if (status !== 'available') {
      let statusMessage = '';
      switch (status) {
        case 'expired':
          statusMessage = `${EMOJIS.CLOCK} **Bundle has expired**`;
          break;
        case 'limit_reached':
          statusMessage = `${EMOJIS.ERROR} **Purchase limit reached** (${bundle.maxPurchases} max)`;
          break;
        case 'inactive':
          statusMessage = `${EMOJIS.ERROR} **Bundle is currently inactive**`;
          break;
      }
      
      embed.addFields({
        name: `${EMOJIS.ERROR} **Status**`,
        value: statusMessage,
        inline: false
      });
    }

    // Footer with navigation info
    let footerText = `${EMOJIS.INFO} Use buttons below to navigate`;
    
    if (bundle.validUntil && status === 'available') {
      const expiryDate = new Date(bundle.validUntil).toLocaleDateString();
      footerText += ` • Bundle expires: ${expiryDate}`;
    } else if (status === 'available') {
      footerText += ` • Bundle expires: Never`;
    }

    embed.setFooter({
      text: footerText,
      iconURL: 'https://app.nexus-panel.com/logo.png'
    });

    // Add guild icon as thumbnail if available
    if (bundle.guild?.icon) {
      embed.setThumbnail(bundle.guild.icon);
    }

    embed.setTimestamp();

    return embed;
  }

  /**
   * Create purchase confirmation embed
   */
  createPurchaseConfirmationEmbed(bundle: Bundle, checkoutUrl: string): EmbedBuilder {
    const bundleService = this.bundleService;
    const savings = bundleService.calculateSavings(bundle);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.CART} **BUNDLE PURCHASE** - Secure Checkout`)
      .setDescription(`**Ready to purchase "${bundle.name}"?**\n\n${EMOJIS.LOCK} **Secure PayPal checkout** - Your payment is protected`)
      .setColor(COLORS.SUCCESS);

    // Payment Summary
    let summaryValue = `**Bundle:** ${bundle.name}\n`;
    summaryValue += `**Regular Price:** ~~${bundleService.formatPrice(bundle.individualTotal)}~~\n`;
    summaryValue += `**Your Price:** **${bundleService.formatPrice(bundle.finalPrice)}**\n`;
    summaryValue += `**Discount:** ${bundle.discount}% OFF\n`;
    summaryValue += `**You Save:** ${bundleService.formatPrice(savings)}`;

    embed.addFields({
      name: `${EMOJIS.MONEY} **Payment Summary**`,
      value: summaryValue,
      inline: false
    });

    // What You Get
    const rolesValue = bundle.roles.map(r => `• <@&${r.role.id}> role`).join('\n');
    embed.addFields({
      name: `${EMOJIS.USERS} **What You Get**`,
      value: rolesValue,
      inline: true
    });

    // Instant Access
    const accessValue = `${EMOJIS.CHECK} Roles assigned automatically\n${EMOJIS.CHECK} Access granted immediately\n${EMOJIS.CHECK} No waiting period`;
    embed.addFields({
      name: `${EMOJIS.DIAMOND} **Instant Access**`,
      value: accessValue,
      inline: true
    });

    embed.setFooter({
      text: `${EMOJIS.LOCK} Powered by PayPal • Click the link below to complete your purchase`,
      iconURL: 'https://app.nexus-panel.com/logo.png'
    });

    embed.setTimestamp();

    return embed;
  }

  /**
   * Create purchase success embed
   */
  createPurchaseSuccessEmbed(bundle: Bundle, purchaseId: string): EmbedBuilder {
    const bundleService = this.bundleService;
    const savings = bundleService.calculateSavings(bundle);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.CELEBRATION} **PURCHASE SUCCESSFUL!** - Welcome to Premium`)
      .setDescription(`**Congratulations!** Your "${bundle.name}" bundle has been activated.`)
      .setColor(COLORS.SUCCESS);

    // Roles Activated
    const rolesValue = bundle.roles.map(r => `${EMOJIS.USERS} <@&${r.role.id}>`).join('\n');
    embed.addFields({
      name: `${EMOJIS.CHECK} **Roles Activated**`,
      value: rolesValue,
      inline: true
    });

    // Purchase Details
    let detailsValue = `**Bundle:** ${bundle.name}\n`;
    detailsValue += `**Paid:** ${bundleService.formatPrice(bundle.finalPrice)}\n`;
    detailsValue += `**Saved:** ${bundleService.formatPrice(savings)}\n`;
    detailsValue += `**ID:** \`${purchaseId}\``;

    embed.addFields({
      name: `${EMOJIS.INFO} **Purchase Details**`,
      value: detailsValue,
      inline: true
    });

    // Next Steps
    let nextStepsValue = `• Check your new roles above\n`;
    nextStepsValue += `• Explore premium channels\n`;
    nextStepsValue += `• Enjoy exclusive benefits\n`;
    nextStepsValue += `• Use \`/bundles history\` to see purchases`;

    embed.addFields({
      name: `${EMOJIS.STAR} **Next Steps**`,
      value: nextStepsValue,
      inline: false
    });

    embed.setFooter({
      text: `${EMOJIS.DIAMOND} Thank you for supporting our community! • Need help? Contact server staff`,
      iconURL: 'https://app.nexus-panel.com/logo.png'
    });

    embed.setTimestamp();

    return embed;
  }

  /**
   * Create detailed bundle information embed - Discord v2 Enhanced
   */
  createBundleDetailsEmbed(bundle: Bundle): EmbedBuilder {
    const bundleService = this.bundleService;
    const savings = bundleService.calculateSavings(bundle);
    const status = bundleService.getBundleStatus(bundle);
    const isAvailable = status === 'available';

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.INFO} **Bundle Details** - ${bundle.name}`)
      .setDescription(`${EMOJIS.DIAMOND} **Complete information about this bundle**`)
      .setColor(isAvailable ? COLORS.PRIMARY : COLORS.WARNING);

    // Bundle Information
    let bundleInfo = `**Name:** ${bundle.name}\n`;
    bundleInfo += `**Description:** ${bundle.description || 'Premium role package'}\n`;
    bundleInfo += `**Status:** ${isAvailable ? `${EMOJIS.CHECK} Available` : `${EMOJIS.WARNING} Unavailable`}\n`;
    bundleInfo += `**Created:** ${new Date(bundle.createdAt).toLocaleDateString()}`;

    embed.addFields({
      name: `${EMOJIS.INFO} **Bundle Information**`,
      value: bundleInfo,
      inline: false
    });

    // Pricing Breakdown
    let pricingInfo = `**Individual Total:** ${bundleService.formatPrice(bundle.individualTotal)}\n`;
    pricingInfo += `**Discount:** ${bundle.discount}%\n`;
    pricingInfo += `**Final Price:** ${bundleService.formatPrice(bundle.finalPrice)}\n`;
    pricingInfo += `**You Save:** ${bundleService.formatPrice(savings)} ${EMOJIS.SPARKLES}`;

    embed.addFields({
      name: `${EMOJIS.MONEY} **Pricing Breakdown**`,
      value: pricingInfo,
      inline: true
    });

    // Availability Details
    let availabilityInfo = `**Purchases:** ${bundle._count?.purchases || 0}\n`;
    
    if (bundle.maxPurchases) {
      availabilityInfo += `**Max Purchases:** ${bundle.maxPurchases}\n`;
    }
    
    if (bundle.validUntil) {
      const expiryDate = new Date(bundle.validUntil).toLocaleDateString();
      availabilityInfo += `**Expires:** ${expiryDate}\n`;
    } else {
      availabilityInfo += `**Expires:** Never\n`;
    }
    
    availabilityInfo += `**Active:** ${bundle.isActive ? `${EMOJIS.CHECK} Yes` : `${EMOJIS.WARNING} No`}`;

    embed.addFields({
      name: `${EMOJIS.CHART} **Availability**`,
      value: availabilityInfo,
      inline: true
    });

    // Roles Included - Detailed
    const rolesValue = bundle.roles.map(r => {
      const rolePrice = bundleService.formatPrice(r.role.price || '0');
      return `• <@&${r.role.id}> - ${rolePrice}`;
    }).join('\n');

    embed.addFields({
      name: `${EMOJIS.USERS} **Roles Included (${bundle.roles.length})**`,
      value: rolesValue,
      inline: false
    });

    // Purchase Instructions
    let instructions = `${EMOJIS.STAR} Use the **Purchase** button to buy this bundle\n`;
    instructions += `${EMOJIS.LOCK} Secure PayPal checkout process\n`;
    instructions += `${EMOJIS.DIAMOND} Instant role assignment after payment\n`;
    instructions += `${EMOJIS.TROPHY} Join ${bundle._count?.purchases || 0} satisfied customers`;

    embed.addFields({
      name: `${EMOJIS.GIFT} **How to Purchase**`,
      value: instructions,
      inline: false
    });

    embed.setFooter({
      text: `${EMOJIS.INFO} Bundle ID: ${bundle.id} • Powered by Nexus Panel`,
      iconURL: 'https://app.nexus-panel.com/logo.png'
    });

    embed.setTimestamp();

    return embed;
  }

  /**
   * Create bundle preview embed - Shows roles with colors and permissions
   */
  createBundlePreviewEmbed(bundle: Bundle): EmbedBuilder {
    const bundleService = this.bundleService;
    const savings = bundleService.calculateSavings(bundle);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.EYES} **Bundle Preview** - ${bundle.name}`)
      .setDescription(`${EMOJIS.DIAMOND} **Preview all roles and benefits in this bundle**`)
      .setColor(COLORS.PRIMARY);

    // Bundle Summary
    let summaryValue = `**Bundle Price:** ${bundleService.formatPrice(bundle.finalPrice)}\n`;
    summaryValue += `**You Save:** ${bundleService.formatPrice(savings)} (${bundle.discount}% OFF)\n`;
    summaryValue += `**Total Roles:** ${bundle.roles.length}`;

    embed.addFields({
      name: `${EMOJIS.INFO} **Bundle Summary**`,
      value: summaryValue,
      inline: false
    });

    // Roles Preview - Detailed with colors
    const rolesValue = bundle.roles.map(r => {
      const rolePrice = bundleService.formatPrice(r.role.price || '0');
      const roleColor = r.role.color ? `\`#${r.role.color.toString(16).padStart(6, '0')}\`` : '`Default`';
      return `${EMOJIS.USERS} <@&${r.role.id}>\n   ${EMOJIS.MONEY} ${rolePrice} • ${EMOJIS.SPARKLES} Color: ${roleColor}`;
    }).join('\n\n');

    embed.addFields({
      name: `${EMOJIS.GIFT} **Roles You'll Get**`,
      value: rolesValue,
      inline: false
    });

    // Benefits Preview
    let benefitsValue = `${EMOJIS.CHECK} **Instant Access** - Roles assigned immediately\n`;
    benefitsValue += `${EMOJIS.LOCK} **Secure Payment** - PayPal protected checkout\n`;
    benefitsValue += `${EMOJIS.DIAMOND} **Exclusive Perks** - Access to premium channels\n`;
    benefitsValue += `${EMOJIS.TROPHY} **Community Status** - Stand out with premium roles\n`;
    benefitsValue += `${EMOJIS.STAR} **Support Server** - Help maintain our community`;

    embed.addFields({
      name: `${EMOJIS.SPARKLES} **Benefits & Perks**`,
      value: benefitsValue,
      inline: false
    });

    // Call to Action
    let ctaValue = `${EMOJIS.FIRE} **Ready to upgrade?**\n`;
    ctaValue += `Use the **Purchase** button to get all these roles at a discounted price!\n\n`;
    ctaValue += `${EMOJIS.CLOCK} Limited time offer - Don't miss out!`;

    embed.addFields({
      name: `${EMOJIS.STAR} **Get Started**`,
      value: ctaValue,
      inline: false
    });

    embed.setFooter({
      text: `${EMOJIS.INFO} Preview • Use Purchase button to buy • Powered by Nexus Panel`,
      iconURL: 'https://app.nexus-panel.com/logo.png'
    });

    embed.setTimestamp();

    return embed;
  }

  /**
   * Create no bundles available embed
   */
  createNoBundlesEmbed(guildName?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.SHOP} **Bundle Store**`)
      .setDescription(`${EMOJIS.INFO} **No bundles available for purchase**`)
      .setColor(COLORS.INFO);

    embed.addFields({
      name: `${EMOJIS.GIFT} **No Bundles Found**`,
      value: `There are currently no role bundles available in ${guildName || 'this server'}.\n\nContact server administrators to set up bundle offers.`,
      inline: false
    });

    embed.setFooter({
      text: `${EMOJIS.INFO} Bundle system powered by Nexus Panel`,
      iconURL: 'https://app.nexus-panel.com/logo.png'
    });

    embed.setTimestamp();

    return embed;
  }

  /**
   * Create error embed
   */
  createErrorEmbed(message: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.ERROR} **Error**`)
      .setDescription(message)
      .setColor(COLORS.ERROR);

    embed.setFooter({
      text: `${EMOJIS.INFO} If this problem persists, contact server staff`,
      iconURL: 'https://app.nexus-panel.com/logo.png'
    });

    embed.setTimestamp();

    return embed;
  }
}