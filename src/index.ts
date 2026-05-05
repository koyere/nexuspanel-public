// nexus-panel/bot/src/index.ts

import { Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';
import axios from 'axios';
import express from 'express';
import { BundleCommandHandler } from './commands/bundles/index';
import * as nexusTestCommand from './commands/nexus-test';
import * as nexusTicketPanelCommand from './commands/nexus-ticket-panel';
import * as nexusMetricsCommand from './commands/nexus-metrics';
import * as nexusLookupCommand from './commands/nexus-lookup';
import * as nexusAutoCloseTestCommand from './commands/nexus-autoclose-test';
import { handleTicketCreation } from './handlers/ticketHandler';
import { handleTicketButton } from './handlers/ticketButtonHandler';
import { initializeTicketAutoClose } from './services/ticketAutoClose';
import { channelProtection } from './services/channelProtection.service';
import { ChannelRecoveryService } from './utils/channelRecovery';

// Load environment variables from the root .env file
dotenv.config({ path: '../.env' });

console.log('🤖 Starting Nexus Panel Bot...');

// --- Queue Setup ---
// This queue instance is a "producer" that adds jobs.
const QUEUE_NAME = 'workflow-jobs';
const workflowQueue = new Queue(QUEUE_NAME, {
  connection: {
    // This connects to the 'redis' service defined in docker-compose.yml
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});

// --- Discord Client Setup ---
// We need specific intents to receive events like a member joining and messages.
// Auto-sharding configuration based on environment
const clientOptions: any = {
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessageReactions,
  ],
};

// Configure sharding if enabled
if (process.env.SHARDING_ENABLED === 'true') {
  console.log('🔀 Sharding mode enabled');
  clientOptions.shards = process.env.SHARD_ID ? [parseInt(process.env.SHARD_ID)] : 'auto';
  clientOptions.shardCount = process.env.SHARD_COUNT ? parseInt(process.env.SHARD_COUNT) : 'auto';
  console.log(`📊 Shard Config: ID=${clientOptions.shards}, Count=${clientOptions.shardCount}`);
} else {
  console.log('⚡ Single instance mode');
}

const client = new Client(clientOptions);

// --- Slash Commands Setup ---
// Initialize bundle command handler
const bundleHandler = new BundleCommandHandler();

const commands = [
  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View and purchase available roles in this server'),
  
  // Add bundles command
  bundleHandler.createSlashCommand(),
  
  // Admin commands
  nexusTestCommand.data,
  nexusTicketPanelCommand.data,
  nexusMetricsCommand.data,
  nexusLookupCommand.data,
  nexusAutoCloseTestCommand.data];

// --- PayPal Checkout Helper Function ---
async function generatePayPalCheckoutLink(roleId: string, guildId: string, userId: string, apiKey: string, backendUrl: string): Promise<string> {
  try {
    const response = await axios.post(
      `${backendUrl}/api/checkout/${roleId}`,
      {
        userId: userId,
        guildId: guildId,
        provider: 'paypal'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Internal-Request': 'true',
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.url || `https://app.nexus-panel.com/shop/error`;
  } catch (error) {
    console.error('Error generating PayPal checkout link:', error);
    return `https://app.nexus-panel.com/shop/unavailable`;
  }
}

// --- Event Handlers ---

// This event fires once when the bot is ready and logged in.
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Bot is ready! Logged in as ${readyClient.user.tag}`);
  
  // Register slash commands
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
  
  try {
    console.log('🔄 Started refreshing application (/) commands.');
    
    // Register commands for Nexus Support Guild (immediate propagation)
    const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';
    
    // Clear existing guild commands first to prevent conflicts
    await rest.put(
      Routes.applicationGuildCommands(readyClient.user.id, NEXUS_SUPPORT_GUILD_ID),
      { body: [] }
    );
    console.log('🧹 Cleared existing guild commands');
    
    // Register new commands
    await rest.put(
      Routes.applicationGuildCommands(readyClient.user.id, NEXUS_SUPPORT_GUILD_ID),
      { body: commands.map(command => command.toJSON()) }
    );
    
    console.log('✅ Successfully reloaded application (/) commands.');
    console.log(`📊 Registered ${commands.length} commands: ${commands.map(c => c.name).join(', ')}`);
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
  
  // ✅ SAFETY FIRST: Activar protección de emergencia al inicio
  try {
    console.log('🛡️ ACTIVANDO PROTECCIONES DE SEGURIDAD CRÍTICAS...');
    channelProtection.activateEmergencyProtection();
    console.log('🛡️ Protecciones de emergencia activadas - TODAS las eliminaciones de canales están BLOQUEADAS');
  } catch (error) {
    console.error('❌ Error activando protecciones de seguridad:', error);
  }

  // ❌ RECOVERY: Servicio de recuperación de canales DESACTIVADO
  // MOTIVO: Causa recreación automática no deseada de canales
  // FECHA: 02 Agosto 2025 - Desactivado por solicitud del usuario
  let recoveryService: ChannelRecoveryService;
  try {
    recoveryService = new ChannelRecoveryService(readyClient);
    console.log('🔄 Servicio de recuperación de canales inicializado (INACTIVO)');
    
    // DESACTIVADO: Recuperación automática comentada para evitar recreación no deseada
    /*
    setTimeout(async () => {
      console.log('🔄 INICIANDO RECUPERACIÓN AUTOMÁTICA DE CANALES...');
      await recoveryService.recoverNexusSupportChannels();
    }, 5000); // Esperar 5 segundos después del login
    */
    console.log('⚠️ RECOVERY SERVICE DESACTIVADO - No se ejecutará recuperación automática');
    
  } catch (error) {
    console.error('❌ Error inicializando servicio de recuperación:', error);
  }

  // Initialize Ticket Auto-Close Service (CON PROTECCIONES)
  try {
    const autoCloseService = initializeTicketAutoClose(readyClient);
    // NO INICIAR AUTOMÁTICAMENTE - Requiere configuración manual
    console.log('⚠️ Ticket Auto-Close Service inicializado pero NO iniciado (protecciones activas)');
    console.log('💡 Para activarlo, usa el comando /nexus-autoclose-test después de configurar protecciones');
  } catch (error) {
    console.error('❌ Error initializing Ticket Auto-Close Service:', error);
  }
});

// This event fires every time a new member joins a guild the bot is in.
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    console.log(`New member joined: ${member.user.tag} in guild ${member.guild.name}`);

    // This is the data that will be passed to our worker.
    const jobData = {
      triggerType: 'ON_MEMBER_JOIN',
      guildId: member.guild.id,
      memberId: member.id,
      // We can pass along any other relevant data
      userDetails: {
        id: member.user.id,
        username: member.user.username,
        isBot: member.user.bot,
        createdAt: member.user.createdAt.toISOString(),
      },
    };

    // Add a job to the queue.
    // The first argument is a descriptive name for the job.
    await workflowQueue.add('process-member-join-event', jobData);

    console.log(`📥 Added job to queue for ${member.user.tag} joining.`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// This event fires every time a message is sent in a guild the bot is in.
client.on(Events.MessageCreate, async (message) => {
  try {
    // Skip bot messages unless specifically configured to include them
    if (message.author.bot) return;
    
    // Skip DM messages for auto-moderation
    if (!message.guild) return;
    
    console.log(`New message from ${message.author.tag} in guild ${message.guild.name}: ${message.content}`);

    const jobData = {
      triggerType: 'ON_MESSAGE_SENT',
      guildId: message.guild.id,
      memberId: message.author.id,
      channelId: message.channel.id,
      messageId: message.id,
      messageContent: message.content,
      userDetails: {
        id: message.author.id,
        username: message.author.username,
        isBot: message.author.bot,
        createdAt: message.author.createdAt.toISOString(),
      },
    };

    // Add job for workflow processing
    await workflowQueue.add('process-message-event', jobData);
    
    // Add separate job for auto-moderation processing
    const autoModerationData = {
      messageId: message.id,
      channelId: message.channel.id,
      guildId: message.guild.id,
      userId: message.author.id,
      content: message.content,
      timestamp: new Date().toISOString()
    };
    
    await workflowQueue.add('process-auto-moderation', autoModerationData);

    console.log(`📥 Added jobs to queue for message from ${message.author.tag}.`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// This event fires when a member leaves a guild
client.on(Events.GuildMemberRemove, async (member) => {
  try {
    console.log(`Member left: ${member.user.tag} from guild ${member.guild.name}`);

    const jobData = {
      triggerType: 'ON_MEMBER_LEAVE',
      guildId: member.guild.id,
      memberId: member.id,
      userDetails: {
        id: member.user.id,
        username: member.user.username,
        isBot: member.user.bot,
        createdAt: member.user.createdAt.toISOString(),
      },
    };

    await workflowQueue.add('process-member-leave-event', jobData);
    console.log(`📥 Added job to queue for ${member.user.tag} leaving.`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// This event fires when a member's roles are updated
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    // Check if roles changed
    const oldRoles = oldMember.roles.cache.map(role => role.id);
    const newRoles = newMember.roles.cache.map(role => role.id);
    
    if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
      console.log(`Member roles updated: ${newMember.user.tag} in guild ${newMember.guild.name}`);

      const addedRoles = newRoles.filter(roleId => !oldRoles.includes(roleId));
      const removedRoles = oldRoles.filter(roleId => !newRoles.includes(roleId));

      const jobData = {
        triggerType: 'ON_ROLE_UPDATE',
        guildId: newMember.guild.id,
        memberId: newMember.id,
        roleChanges: {
          added: addedRoles,
          removed: removedRoles,
          before: oldRoles,
          after: newRoles,
        },
        userDetails: {
          id: newMember.user.id,
          username: newMember.user.username,
          isBot: newMember.user.bot,
        },
      };

      await workflowQueue.add('process-role-update-event', jobData);
      console.log(`📥 Added job to queue for ${newMember.user.tag} role update.`);
    }
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// This event fires when a channel is created
client.on(Events.ChannelCreate, async (channel) => {
  try {
    if (!('guild' in channel) || !channel.guild) return; // Skip DM channels

    console.log(`Channel created: ${channel.name} in guild ${channel.guild.name}`);

    const jobData = {
      triggerType: 'ON_CHANNEL_CREATE',
      guildId: channel.guild.id,
      channelId: channel.id,
      channelDetails: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        createdAt: channel.createdAt?.toISOString(),
      },
    };

    await workflowQueue.add('process-channel-create-event', jobData);
    console.log(`📥 Added job to queue for channel ${channel.name} creation.`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// This event fires when a channel is deleted
client.on(Events.ChannelDelete, async (channel) => {
  try {
    if (!('guild' in channel) || !channel.guild) return; // Skip DM channels

    console.log(`Channel deleted: ${channel.name} in guild ${channel.guild.name}`);

    const jobData = {
      triggerType: 'ON_CHANNEL_DELETE',
      guildId: channel.guild.id,
      channelId: channel.id,
      channelDetails: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
      },
    };

    await workflowQueue.add('process-channel-delete-event', jobData);
    console.log(`📥 Added job to queue for channel ${channel.name} deletion.`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// This event fires when a member joins a voice channel
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    // Member joined voice channel
    if (!oldState.channel && newState.channel) {
      console.log(`${newState.member?.user.tag} joined voice channel ${newState.channel.name}`);

      const jobData = {
        triggerType: 'ON_VOICE_JOIN',
        guildId: newState.guild.id,
        memberId: newState.member?.id,
        channelId: newState.channel.id,
        channelName: newState.channel.name,
        userDetails: {
          id: newState.member?.user.id,
          username: newState.member?.user.username,
        },
      };

      await workflowQueue.add('process-voice-join-event', jobData);
    }
    
    // Member left voice channel
    if (oldState.channel && !newState.channel) {
      console.log(`${oldState.member?.user.tag} left voice channel ${oldState.channel.name}`);

      const jobData = {
        triggerType: 'ON_VOICE_LEAVE',
        guildId: oldState.guild.id,
        memberId: oldState.member?.id,
        channelId: oldState.channel.id,
        channelName: oldState.channel.name,
        userDetails: {
          id: oldState.member?.user.id,
          username: oldState.member?.user.username,
        },
      };

      await workflowQueue.add('process-voice-leave-event', jobData);
    }
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// This event fires when a member is banned
client.on(Events.GuildBanAdd, async (ban) => {
  try {
    console.log(`Member banned: ${ban.user.tag} from guild ${ban.guild.name}`);

    const jobData = {
      triggerType: 'ON_MEMBER_BAN',
      guildId: ban.guild.id,
      memberId: ban.user.id,
      reason: ban.reason,
      userDetails: {
        id: ban.user.id,
        username: ban.user.username,
        isBot: ban.user.bot,
      },
    };

    await workflowQueue.add('process-member-ban-event', jobData);
    console.log(`📥 Added job to queue for ${ban.user.tag} ban.`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// This event fires when a member is unbanned
client.on(Events.GuildBanRemove, async (ban) => {
  try {
    console.log(`Member unbanned: ${ban.user.tag} from guild ${ban.guild.name}`);

    const jobData = {
      triggerType: 'ON_MEMBER_UNBAN',
      guildId: ban.guild.id,
      memberId: ban.user.id,
      userDetails: {
        id: ban.user.id,
        username: ban.user.username,
        isBot: ban.user.bot,
      },
    };

    await workflowQueue.add('process-member-unban-event', jobData);
    console.log(`📥 Added job to queue for ${ban.user.tag} unban.`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// This event fires when a reaction is added to a message
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (user.bot) return; // Skip bot reactions
    if (!reaction.message.guild) return; // Skip DM reactions

    console.log(`Reaction added: ${reaction.emoji.name} by ${user.tag} in guild ${reaction.message.guild.name}`);

    const jobData = {
      triggerType: 'ON_REACTION_ADD',
      guildId: reaction.message.guild.id,
      memberId: user.id,
      channelId: reaction.message.channel.id,
      messageId: reaction.message.id,
      emoji: {
        name: reaction.emoji.name,
        id: reaction.emoji.id,
        animated: reaction.emoji.animated,
      },
      userDetails: {
        id: user.id,
        username: user.username,
        isBot: user.bot,
      },
    };

    await workflowQueue.add('process-reaction-add-event', jobData);
    console.log(`📥 Added job to queue for reaction from ${user.tag}.`);
  } catch (error) {
    console.error('Error adding job to queue:', error);
  }
});

// --- Slash Command Interaction Handler ---
client.on(Events.InteractionCreate, async (interaction) => {
  // Handle button interactions
  if (interaction.isButton()) {
    // Check if it's a bundle-related button
    if (interaction.customId.includes('bundle') || interaction.customId.includes('nav_bundle') || interaction.customId.includes('purchase_') || interaction.customId.includes('details_') || interaction.customId.includes('preview_')) {
      await bundleHandler.handleButtonInteraction(interaction);
      return;
    }
    
    // Handle ticket creation buttons
    if (interaction.customId.startsWith('create_ticket_')) {
      await handleTicketCreation(interaction);
      return;
    }
    
    // Handle ticket control buttons (close, claim, priority, transcript)
    if (interaction.customId.includes('_ticket_')) {
      await handleTicketButton(interaction);
      return;
    }
  }

  if (!interaction.isChatInputCommand()) return;

  // Handle /bundles command
  if (interaction.commandName === 'bundles') {
    await bundleHandler.handleSlashCommand(interaction);
    return;
  }

  if (interaction.commandName === 'shop') {
    try {
      // Respond immediately to prevent timeout
      await interaction.reply({ 
        content: '🔄 **Loading role shop...** This may take a moment.',
        flags: MessageFlags.Ephemeral
      });

      const guildId = interaction.guildId;
      if (!guildId) {
        await interaction.editReply({
          content: '',
          embeds: [{
            title: '❌ Server Required',
            description: 'This command can only be used within a Discord server.',
            color: 0xff4757
          }]
        });
        return;
      }

      // Fetch monetized roles from backend API
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3001';
      const apiKey = process.env.BOT_INTERNAL_API_KEY;
      
      if (!apiKey) {
        await interaction.editReply({
          content: '',
          embeds: [{
            title: '⚙️ Configuration Error',
            description: 'Bot configuration incomplete. Please contact server administrators.',
            color: 0xff4757
          }]
        });
        return;
      }
      
      const response = await axios.get(`${backendUrl}/api/guilds/${guildId}/roles`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Internal-Request': 'true'
        },
        timeout: 8000 // 8 second timeout
      });

      const allRoles = response.data;
      const monetizedRoles = allRoles.filter((role: any) => role.price && role.paypalProductId);

      if (monetizedRoles.length === 0) {
        await interaction.editReply({
          content: '',
          embeds: [{
            title: '🛒 Role Shop',
            description: '**No premium roles available**\n\nThis server hasn\'t set up any roles for purchase yet.\n\n💡 *Server admins can monetize roles through the [Nexus Panel](https://app.nexus-panel.com)*',
            color: 0x74b9ff,
            thumbnail: interaction.guild?.iconURL() ? { url: interaction.guild.iconURL()! } : undefined,
            timestamp: new Date().toISOString()
          }]
        });
        return;
      }

      // Create modern Discord v2 embed with professional design
      const fields = [];
      let totalValue = 0;

      for (const role of monetizedRoles.slice(0, 8)) { // Limit to 8 roles for better visual spacing
        const price = Number(role.price);
        totalValue += price;
        
        // Generate dynamic PayPal checkout link
        const paymentUrl = await generatePayPalCheckoutLink(role.id, guildId, interaction.user.id, apiKey, backendUrl);
        
        // Enhanced role field with professional formatting
        fields.push({
          name: `✨ ${role.name}`,
          value: `> **$${price.toFixed(2)} USD**\n> 🎯 [**Instant Purchase**](${paymentUrl})\n> ─────────────────────`,
          inline: true // Use inline for grid layout
        });
      }

      // Professional embed with enhanced branding
      const embed = {
        title: '🏪 Premium Role Marketplace',
        description: [
          `### Welcome to **${interaction.guild?.name}**'s Role Shop! 🌟`,
          '',
          '🎭 **Unlock Exclusive Access** • Get special perks, channels, and privileges',
          '⚡ **Instant Activation** • Roles applied immediately after purchase',
          '🛡️ **Secure Payment** • Powered by PayPal with buyer protection',
          '💎 **Premium Experience** • Join our VIP community today',
          '',
          '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬'
        ].join('\n'),
        color: 0x5865F2, // Discord brand color for professionalism
        fields: fields,
        thumbnail: interaction.guild?.iconURL() ? { 
          url: interaction.guild.iconURL()! 
        } : { url: 'https://cdn.discordapp.com/embed/avatars/0.png' },
        footer: { 
          text: `🛒 ${monetizedRoles.length} Premium Roles Available • $${totalValue.toFixed(2)} Total Value • Secured by Nexus Panel`,
          icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png' // Nexus branding
        },
        timestamp: new Date().toISOString(),
        author: {
          name: `${interaction.guild?.name} • Premium Store`,
          icon_url: interaction.guild?.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png'
        }
      };

      // Add promotional field if more than 8 roles
      if (monetizedRoles.length > 8) {
        embed.fields.push({
          name: '🎪 Additional Premium Roles',
          value: `> **${monetizedRoles.length - 8} more** exclusive roles available!\n> 🌐 [**View Complete Catalog**](https://app.nexus-panel.com/shop/${guildId})\n> ✨ *Discover all premium options on our web store*`,
          inline: false
        });
      }

      await interaction.editReply({ 
        content: '', 
        embeds: [embed] 
      });

    } catch (error) {
      console.error('Error in /shop command:', error);
      
      // Enhanced error handling with proper embed
      const errorEmbed = {
        title: '❌ Shop Unavailable',
        description: 'The role shop is temporarily unavailable. Please try again in a few moments.',
        color: 0xff4757,
        footer: {
          text: 'If this issue persists, contact server administrators',
          icon_url: interaction.client.user.displayAvatarURL()
        },
        timestamp: new Date().toISOString()
      };

      try {
        await interaction.editReply({ content: '', embeds: [errorEmbed] });
      } catch (editError) {
        console.error('Failed to edit reply with error message:', editError);
        // If edit fails, try to send a followup
        try {
          await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } catch (followupError) {
          console.error('Failed to send followup error message:', followupError);
        }
      }
    }
  }
  
  // Handle admin commands
  if (interaction.commandName === 'nexus-test') {
    await nexusTestCommand.execute(interaction);
    return;
  }
  
  if (interaction.commandName === 'nexus-ticket-panel') {
    await nexusTicketPanelCommand.execute(interaction);
    return;
  }
  
  if (interaction.commandName === 'nexus-metrics') {
    await nexusMetricsCommand.execute(interaction);
    return;
  }
  
  if (interaction.commandName === 'nexus-lookup') {
    await nexusLookupCommand.execute(interaction);
    return;
  }
  
  if (interaction.commandName === 'nexus-autoclose-test') {
    await nexusAutoCloseTestCommand.execute(interaction);
    return;
  }
});

// --- Guild Create Handler (Bot joins new guild) ---
client.on(Events.GuildCreate, async (guild) => {
  try {
    console.log(`🎯 Bot joined new guild: ${guild.name} (${guild.id})`);
    
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3001';
    const apiKey = process.env.BOT_INTERNAL_API_KEY;
    
    if (!apiKey) {
      console.error('❌ BOT_INTERNAL_API_KEY not configured for guildCreate handler');
      return;
    }

    // Notify backend that bot joined a new guild
    // Backend will check server limits and set appropriate status
    try {
      const response = await axios.post(
        `${backendUrl}/api/bot/guild-joined`,
        {
          guildId: guild.id,
          guildName: guild.name,
          memberCount: guild.memberCount,
          ownerId: guild.ownerId
        },
        {
          headers: {
            'X-Bot-API-Key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      console.log(`✅ Guild join processed: ${guild.name} - Status: ${data.status}`);
      
      if (data.status === 'degraded') {
        console.log(`⚠️  Guild ${guild.name} set to DEGRADED mode - plan limits exceeded`);
        
        // Send welcome message explaining limitations
        const systemChannel = guild.systemChannel;
        if (systemChannel) {
          const embed = new EmbedBuilder()
            .setColor(0xFF6B35)
            .setTitle('🎯 Nexus Panel Bot Joined!')
            .setDescription('Welcome! Your server has been added but requires a plan upgrade to activate all features.')
            .addFields(
              {
                name: '⚠️ Limited Access',
                value: 'Your current plan allows limited servers. Upgrade your plan to unlock full functionality.',
                inline: false
              },
              {
                name: '🚀 Get Started',
                value: 'Visit your [Nexus Panel Dashboard](https://app.nexus-panel.com) to upgrade your plan.',
                inline: false
              }
            )
            .setTimestamp();

          await systemChannel.send({ embeds: [embed] });
        }
      } else {
        console.log(`✅ Guild ${guild.name} activated successfully`);
      }
      
    } catch (error: any) {
      console.error('❌ Error notifying backend of guild join:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Error in guildCreate handler:', error);
  }
});

// --- HTTP Server for Role Management ---
const app = express();
const HTTP_PORT = parseInt(process.env.BOT_HTTP_PORT || '3002');

// Middleware
app.use(express.json());

// Authentication middleware
function authenticateBot(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-bot-api-key'];
  if (!apiKey || apiKey !== process.env.BOT_INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'ok', 
    bot: client.user ? 'ready' : 'not ready',
    timestamp: new Date().toISOString()
  });
});

// 🎯 NEW: Bot presence check endpoint for server prioritization
app.get('/guild/:guildId/presence', (req: express.Request, res: express.Response) => {
  try {
    const { guildId } = req.params;
    
    if (!guildId) {
      return res.status(400).json({ 
        present: false, 
        error: 'Guild ID is required' 
      });
    }

    // Check if bot is present in the guild
    const guild = client.guilds.cache.get(guildId);
    const isPresent = !!guild;
    
    res.json({ 
      present: isPresent,
      guildId: guildId,
      memberCount: guild?.memberCount || 0,
      guildName: guild?.name || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error(`Error checking bot presence for guild ${req.params.guildId}:`, error);
    res.status(500).json({ 
      present: false, 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Update role position endpoint
app.put('/api/roles/:guildId/:roleId/position', authenticateBot, async (req: express.Request, res: express.Response) => {
  try {
    const { guildId, roleId } = req.params;
    const { position } = req.body;

    if (typeof position !== 'number' || position < 0) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Position must be a non-negative number'
      });
    }

    // Get guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ 
        error: 'Guild not found',
        message: 'Bot is not in this guild or guild does not exist'
      });
    }

    // Get role
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return res.status(404).json({ 
        error: 'Role not found',
        message: 'Role does not exist in this guild'
      });
    }

    // Update position
    await role.setPosition(position);

    console.log(`✅ Updated role position: ${role.name} (${roleId}) to position ${position} in guild ${guild.name}`);

    res.json({
      success: true,
      message: 'Role position updated successfully',
      role: {
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.color
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating role position:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to update role position'
    });
  }
});

// Get role information endpoint
app.get('/api/roles/:guildId/:roleId', authenticateBot, async (req: express.Request, res: express.Response) => {
  try {
    const { guildId, roleId } = req.params;

    // Get guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ 
        error: 'Guild not found',
        message: 'Bot is not in this guild or guild does not exist'
      });
    }

    // Get role
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return res.status(404).json({ 
        error: 'Role not found',
        message: 'Role does not exist in this guild'
      });
    }

    // Get role members (up to 100 for performance)
    const members = role.members.map(member => ({
      id: member.id,
      username: member.user.username,
      nickname: member.nickname,
      avatar: member.user.displayAvatarURL()
    })).slice(0, 100);

    res.json({
      role: {
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions.toArray(),
        memberCount: role.members.size,
        members
      }
    });

  } catch (error: any) {
    console.error('❌ Error getting role info:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to get role information'
    });
  }
});

// 🎯 SPRINT 1 TASK 3.1: Role revocation endpoints for backend integration

// Remove role from user endpoint
app.post('/role/remove', authenticateBot, async (req: express.Request, res: express.Response) => {
  try {
    const { guildId, userId, roleId, reason } = req.body;

    if (!guildId || !userId || !roleId) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'guildId, userId, and roleId are required'
      });
    }

    // Get guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ 
        error: 'Guild not found',
        message: 'Bot is not in this guild or guild does not exist'
      });
    }

    // Get member
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return res.status(404).json({ 
        error: 'Member not found',
        message: 'User is not a member of this guild'
      });
    }

    // Get role
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return res.status(404).json({ 
        error: 'Role not found',
        message: 'Role does not exist in this guild'
      });
    }

    // Check if member has the role
    if (!member.roles.cache.has(roleId)) {
      return res.json({
        success: true,
        alreadyRemoved: true,
        message: 'User does not have this role (already removed)'
      });
    }

    // Remove role from member
    await member.roles.remove(role, reason || 'Auto-revocation: Role access expired');

    console.log(`✅ Role ${role.name} removed from ${member.user.username} in guild ${guild.name}`);

    res.json({
      success: true,
      message: `Role ${role.name} removed successfully`,
      role: {
        id: role.id,
        name: role.name
      },
      member: {
        id: member.id,
        username: member.user.username,
        nickname: member.nickname
      }
    });

  } catch (error: any) {
    console.error('❌ Error removing role:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to remove role from user',
      details: error.message
    });
  }
});

// Check if user has specific role endpoint
app.post('/role/check', authenticateBot, async (req: express.Request, res: express.Response) => {
  try {
    const { guildId, userId, roleId } = req.body;

    if (!guildId || !userId || !roleId) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'guildId, userId, and roleId are required'
      });
    }

    // Get guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ 
        error: 'Guild not found',
        message: 'Bot is not in this guild or guild does not exist'
      });
    }

    // Get member
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return res.json({
        hasRole: false,
        memberExists: false,
        message: 'User is not a member of this guild'
      });
    }

    // Check if member has the role
    const hasRole = member.roles.cache.has(roleId);

    // Get role info for context
    const role = guild.roles.cache.get(roleId);

    res.json({
      hasRole,
      memberExists: true,
      role: role ? {
        id: role.id,
        name: role.name
      } : null,
      member: {
        id: member.id,
        username: member.user.username,
        nickname: member.nickname
      }
    });

  } catch (error: any) {
    console.error('❌ Error checking role:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to check user role',
      details: error.message
    });
  }
});

// Deliver digital content via DM endpoint
app.post('/api/deliver-digital-content', authenticateBot, async (req: express.Request, res: express.Response) => {
  try {
    const { userId, bundleName, digitalContent } = req.body;

    if (!userId || !bundleName || !digitalContent) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Missing required fields: userId, bundleName, digitalContent'
      });
    }

    // Get user
    const user = await client.users.fetch(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `Discord user ${userId} not found`
      });
    }

    // Create embed with digital content
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎁 Your Digital Content')
      .setDescription(`Thank you for purchasing **${bundleName}**! Here is your digital content:`)
      .setTimestamp();

    // Add each digital content item as a field
    for (const content of digitalContent) {
      const emoji = getContentTypeEmoji(content.type);
      let fieldValue = content.description || content.value;
      
      // Add expiration info if applicable
      if (content.expiresAt) {
        const expirationDate = new Date(content.expiresAt).toLocaleDateString();
        fieldValue += `\n⏰ Expires: ${expirationDate}`;
      }
      
      // Add usage limit if applicable
      if (content.maxUses) {
        fieldValue += `\n🔢 Max uses: ${content.maxUses}`;
      }

      embed.addFields({
        name: `${emoji} ${content.title}`,
        value: fieldValue,
        inline: false
      });

      // For external links, add clickable link
      if (content.type === 'external_link') {
        embed.addFields({
          name: '🔗 Link',
          value: content.value,
          inline: false
        });
      }
    }

    // Add footer
    embed.setFooter({ 
      text: 'Keep this information safe. Digital content is non-refundable.' 
    });

    // Send DM
    await user.send({ embeds: [embed] });
    
    console.log(`✅ Digital content delivered to user ${userId} for bundle: ${bundleName}`);

    res.json({ 
      success: true,
      message: 'Digital content delivered successfully',
      userId: userId,
      bundleName: bundleName,
      contentCount: digitalContent.length
    });

  } catch (error: any) {
    console.error('❌ Error delivering digital content:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to deliver digital content',
      details: error.message
    });
  }
});

// Helper function to get emoji for content type
function getContentTypeEmoji(type: string): string {
  switch (type) {
    case 'external_link': return '🔗';
    case 'discount_code': return '🎫';
    case 'access_key': return '🔑';
    case 'instructions': return '📋';
    default: return '📦';
  }
}

// Start HTTP server
app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`🌐 Bot HTTP server listening on port ${HTTP_PORT}`);
  console.log(`🎯 Available endpoints:`);
  console.log(`  - POST /role/remove (remove role from user)`);
  console.log(`  - POST /role/check (check if user has role)`);
  console.log(`  - POST /api/deliver-digital-content (deliver bundle content via DM)`);
});

// --- Login ---
// Log the bot in to Discord using the token from our .env file.
client.login(process.env.DISCORD_BOT_TOKEN);