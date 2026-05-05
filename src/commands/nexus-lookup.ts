// Comando para investigación avanzada de usuarios y datos del sistema
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMemberRoleManager, MessageFlags } from 'discord.js';
import axios from 'axios';

const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://api.nexus-panel.com';
const BOT_INTERNAL_API_KEY = process.env.BOT_INTERNAL_API_KEY;

export const data = new SlashCommandBuilder()
  .setName('nexus-lookup')
  .setDescription('🔍 Investigación avanzada de usuarios y datos del sistema')
  .addSubcommand(subcommand =>
    subcommand
      .setName('user')
      .setDescription('👤 Investigar cuenta de usuario específico')
      .addStringOption(option =>
        option.setName('user_id')
          .setDescription('ID de Discord del usuario a investigar')
          .setRequired(true))
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('subscription')
      .setDescription('💎 Verificar estado de suscripción de usuario')
      .addStringOption(option =>
        option.setName('user_id')
          .setDescription('ID de Discord del usuario')
          .setRequired(true))
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('billing')
      .setDescription('💳 Revisar historial de pagos de usuario')
      .addStringOption(option =>
        option.setName('user_id')
          .setDescription('ID de Discord del usuario')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('limit')
          .setDescription('Número de transacciones a mostrar (máximo 10)')
          .setMinValue(1)
          .setMaxValue(10))
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('guild')
      .setDescription('🏰 Información detallada de servidor Discord')
      .addStringOption(option =>
        option.setName('guild_id')
          .setDescription('ID del servidor Discord a investigar')
          .setRequired(true))
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('analytics')
      .setDescription('📊 Analytics avanzados de usuario o servidor')
      .addStringOption(option =>
        option.setName('type')
          .setDescription('Tipo de analytics')
          .addChoices(
            { name: '👤 Usuario', value: 'user' },
            { name: '🏰 Servidor', value: 'guild' },
            { name: '💰 Revenue', value: 'revenue' }
          )
          .setRequired(true))
      .addStringOption(option =>
        option.setName('target_id')
          .setDescription('ID del usuario o servidor')
          .setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Verificar servidor
  if (interaction.guildId !== NEXUS_SUPPORT_GUILD_ID) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('❌ Acceso Denegado')
          .setDescription('Este comando solo está disponible en el servidor oficial de Nexus Panel.')
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Verificar permisos (roles o permisos de administrador)
  const member = interaction.member;
  const memberPermissions = member?.permissions;
  const hasAdminPermissions = memberPermissions && typeof memberPermissions !== 'string' && memberPermissions.has(PermissionFlagsBits.Administrator);
  const hasRequiredRole = member && (member.roles as GuildMemberRoleManager).cache.some(role => 
    ['Admin', 'Moderator', 'Support Manager', 'Administrator', 'Owner', 'Staff', 'Support', 'Management', 'Technical Support', 'Billing Support'].includes(role.name)
  );
  
  if (!member || (!hasAdminPermissions && !hasRequiredRole)) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🔒 Permisos Insuficientes')
          .setDescription('No tienes permisos para ejecutar investigaciones administrativas.')
          .addFields(
            { name: '**Permisos Requeridos:**', value: '• Permiso de Administrador\n• O roles: Admin, Moderator, Support Manager, Staff, Support', inline: false }
          )
          .setFooter({ text: 'Sistema de Seguridad Nexus Panel' })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    switch (subcommand) {
      case 'user':
        await handleUserLookup(interaction);
        break;
      case 'subscription':
        await handleSubscriptionLookup(interaction);
        break;
      case 'billing':
        await handleBillingLookup(interaction);
        break;
      case 'guild':
        await handleGuildLookup(interaction);
        break;
      case 'analytics':
        await handleAnalyticsLookup(interaction);
        break;
      default:
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('❌ Comando No Reconocido')
              .setDescription('El subcomando especificado no existe.')
          ]
        });
    }
  } catch (error) {
    console.error('Error in nexus-lookup command:', error);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🚨 Error del Sistema')
          .setDescription('Ocurrió un error interno procesando la investigación.')
          .addFields(
            { name: 'Error ID', value: `\`${Date.now()}\``, inline: true },
            { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
      ]
    });
  }
}

// === HANDLERS PARA CADA SUBCOMANDO ===

async function handleUserLookup(interaction: ChatInputCommandInteraction) {
  const userId = interaction.options.getString('user_id', true);
  
  try {
    // SAFETY-FIRST: Usar información de Discord directamente ya que los endpoints requieren JWT
    let discordUser;
    try {
      discordUser = await interaction.client.users.fetch(userId);
    } catch {
      discordUser = null;
    }

    // Obtener información básica del sistema sin autenticación
    const systemResponse = await axios.get(`${BACKEND_API_URL}/api/admin/system/monitoring`, {
      timeout: 10000
    });

    const systemData = systemResponse.data;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🔍 Investigación de Usuario')
      .setThumbnail(discordUser?.displayAvatarURL() || null)
      .addFields(
        { name: '👤 **Información Discord**', value: discordUser ? 
          `**Username:** ${discordUser.username}\n**ID:** \`${discordUser.id}\`\n**Creado:** <t:${Math.floor(discordUser.createdTimestamp / 1000)}:F>\n**Bot:** ${discordUser.bot ? '✅' : '❌'}` :
          `**Usuario ID:** \`${userId}\`\n**Estado:** Usuario no encontrado en Discord`, inline: false },
        { name: '💎 **Estado en Nexus Panel**', value: `**Investigación:** Disponible solo con datos de Discord\n**Limitación:** Endpoints del backend requieren autenticación JWT\n**Sistema:** ${systemData?.status || 'Operacional'}`, inline: false }
      );

    // Agregar información del sistema disponible
    if (systemData) {
      embed.addFields({ 
        name: '🏰 **Información del Sistema**', 
        value: `**Estado General:** ${systemData.overallStatus || 'Operacional'}\n**Servicios Activos:** ${systemData.activeServices || 'N/A'}\n**Uptime:** ${systemData.uptime || 'N/A'}\n**Última Actualización:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: false 
      });
    }

    embed.setFooter({ text: `Investigación ejecutada por ${interaction.user.username}` })
         .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    if (error.response?.status === 404) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('🔍 Usuario No Encontrado')
            .setDescription('No se encontró información de este usuario en el sistema.')
            .addFields(
              { name: 'Usuario ID', value: `\`${userId}\``, inline: true },
              { name: 'Estado', value: 'No registrado en Nexus Panel', inline: true }
            )
        ]
      });
    } else {
      throw error;
    }
  }
}

async function handleSubscriptionLookup(interaction: ChatInputCommandInteraction) {
  const userId = interaction.options.getString('user_id', true);
  
  try {
    // SAFETY-FIRST: Obtener información de Discord y sistema general
    let discordUser;
    try {
      discordUser = await interaction.client.users.fetch(userId);
    } catch {
      discordUser = null;
    }

    // Usar endpoint sin autenticación para información general
    const systemResponse = await axios.get(`${BACKEND_API_URL}/api/admin/analytics/revenue`, {
      timeout: 10000
    });

    const systemData = systemResponse.data;
    
    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('💎 Estado de Suscripción')
      .addFields(
        { name: '👤 **Usuario**', value: discordUser ? `${discordUser.username} (<@${userId}>)` : `Usuario ID: \`${userId}\``, inline: false },
        { name: '📋 **Limitación del Sistema**', value: `**Estado:** Los endpoints de suscripciones requieren autenticación JWT\n**Información Disponible:** Solo datos de Discord\n**Usuario Encontrado:** ${discordUser ? '✅' : '❌'}`, inline: false },
        { name: '💰 **Información del Sistema**', value: `**Estado General:** ${systemData?.status || 'Operacional'}\n**Total Revenue:** $${systemData?.totalRevenue || '0.00'}\n**Última Actualización:** <t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      );

    embed.setFooter({ text: `Consulta ejecutada por ${interaction.user.username}` })
         .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    if (error.response?.status === 404) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('💎 Sin Suscripción')
            .setDescription('Este usuario no tiene suscripción activa o no está registrado.')
            .addFields(
              { name: 'Usuario ID', value: `\`${userId}\``, inline: true },
              { name: 'Plan', value: 'Free (por defecto)', inline: true }
            )
        ]
      });
    } else {
      throw error;
    }
  }
}

async function handleBillingLookup(interaction: ChatInputCommandInteraction) {
  const userId = interaction.options.getString('user_id', true);
  const limit = interaction.options.getInteger('limit') || 5;
  
  try {
    // SAFETY-FIRST: Usar endpoints sin autenticación
    let discordUser;
    try {
      discordUser = await interaction.client.users.fetch(userId);
    } catch {
      discordUser = null;
    }

    const revenueResponse = await axios.get(`${BACKEND_API_URL}/api/admin/analytics/revenue`, {
      timeout: 10000
    });

    const revenueData = revenueResponse.data;
    
    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('💳 Historial de Facturación')
      .addFields(
        { name: '👤 **Usuario**', value: discordUser ? `${discordUser.username} (<@${userId}>)` : `Usuario ID: \`${userId}\``, inline: false },
        { name: '📊 **Limitación del Sistema**', value: `**Estado:** Los endpoints de pagos requieren autenticación JWT\n**Información Disponible:** Solo estadísticas generales del sistema\n**Usuario Encontrado:** ${discordUser ? '✅' : '❌'}`, inline: false },
        { name: '💰 **Revenue General del Sistema**', value: `**Total Revenue:** $${revenueData?.totalRevenue || '0.00'}\n**Transacciones Totales:** ${revenueData?.totalTransactions || 0}\n**Estado:** ${revenueData?.status || 'Operacional'}`, inline: false }
      );

    embed.setFooter({ text: `Consulta ejecutada por ${interaction.user.username}` })
         .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    if (error.response?.status === 404) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('💳 Sin Historial de Pagos')
            .setDescription('No se encontró historial de facturación para este usuario.')
            .addFields(
              { name: 'Usuario ID', value: `\`${userId}\``, inline: true },
              { name: 'Transacciones', value: '0', inline: true }
            )
        ]
      });
    } else {
      throw error;
    }
  }
}

async function handleGuildLookup(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.options.getString('guild_id', true);
  
  try {
    // SAFETY-FIRST: Usar información de Discord directamente
    let discordGuild;
    try {
      discordGuild = await interaction.client.guilds.fetch(guildId);
    } catch {
      discordGuild = null;
    }

    // Obtener información del sistema sin autenticación
    const systemResponse = await axios.get(`${BACKEND_API_URL}/api/admin/system/info`, {
      timeout: 10000
    });

    const systemData = systemResponse.data;

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🏰 Investigación de Servidor')
      .setThumbnail(discordGuild?.iconURL() || null)
      .addFields(
        { name: '🏰 **Información Discord**', value: discordGuild ? 
          `**Nombre:** ${discordGuild.name}\n**ID:** \`${discordGuild.id}\`\n**Miembros:** ${discordGuild.memberCount}\n**Creado:** <t:${Math.floor(discordGuild.createdTimestamp / 1000)}:F>\n**Owner:** <@${discordGuild.ownerId}>` :
          `**Servidor ID:** \`${guildId}\`\n**Estado:** Servidor no accesible o bot no presente`, inline: false }
      );

    embed.addFields({ 
      name: '💎 **Estado en Nexus Panel**', 
      value: `**Limitación:** Los endpoints de usuarios requieren autenticación JWT\n**Información Disponible:** Solo datos de Discord\n**Bot Presente:** ${discordGuild ? '✅' : '❌'}\n**Accesible:** ${discordGuild ? 'Sí' : 'No'}`,
      inline: false 
    });

    if (systemData) {
      embed.addFields({ 
        name: '🏭 **Información del Sistema**', 
        value: `**Estado General:** ${systemData.status || 'Operacional'}\n**Versión:** ${systemData.version || 'N/A'}\n**Uptime:** ${systemData.uptime || 'N/A'}\n**Servicios:** ${systemData.services?.length || 0} activos`,
        inline: false 
      });
    }

    embed.setFooter({ text: `Investigación ejecutada por ${interaction.user.username}` })
         .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    if (error.response?.status === 404) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('🏰 Servidor No Encontrado')
            .setDescription('No se encontró información de este servidor en el sistema.')
            .addFields(
              { name: 'Servidor ID', value: `\`${guildId}\``, inline: true },
              { name: 'Estado', value: 'No registrado en Nexus Panel', inline: true }
            )
        ]
      });
    } else {
      throw error;
    }
  }
}

async function handleAnalyticsLookup(interaction: ChatInputCommandInteraction) {
  const type = interaction.options.getString('type', true);
  const targetId = interaction.options.getString('target_id', true);
  
  try {
    // SAFETY-FIRST: Usar solo endpoint público de analytics/revenue
    const revenueResponse = await axios.get(`${BACKEND_API_URL}/api/admin/analytics/revenue`, {
      timeout: 10000
    });

    const revenueData = revenueResponse.data;
    
    // Obtener información de Discord según el tipo
    let targetInfo = null;
    if (type === 'user') {
      try {
        targetInfo = await interaction.client.users.fetch(targetId);
      } catch {
        targetInfo = null;
      }
    } else if (type === 'guild') {
      try {
        targetInfo = await interaction.client.guilds.fetch(targetId);
      } catch {
        targetInfo = null;
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle(`📊 Analytics ${type === 'user' ? 'de Usuario' : type === 'guild' ? 'de Servidor' : 'de Revenue'}`)
      .addFields(
        { name: '🎯 **Target**', value: `**ID:** \`${targetId}\`\n**Tipo:** ${type}\n**Encontrado:** ${targetInfo ? '✅' : '❌'}`, inline: false }
      );

    if (type === 'user' && targetInfo && 'username' in targetInfo) {
      embed.addFields(
        { name: '👤 **Información Discord**', value: `**Username:** ${targetInfo.username}\n**Creado:** <t:${Math.floor(targetInfo.createdTimestamp / 1000)}:F>\n**Bot:** ${targetInfo.bot ? '✅' : '❌'}`, inline: false },
        { name: '💰 **Limitación**', value: `**Estado:** Los endpoints específicos de usuario requieren JWT\n**Disponible:** Solo estadísticas generales del sistema\n**Total Revenue Sistema:** $${revenueData?.totalRevenue || '0.00'}`, inline: false }
      );
    } else if (type === 'guild' && targetInfo && 'name' in targetInfo) {
      embed.addFields(
        { name: '🏰 **Información Discord**', value: `**Nombre:** ${targetInfo.name}\n**Miembros:** ${targetInfo.memberCount}\n**Creado:** <t:${Math.floor(targetInfo.createdTimestamp / 1000)}:F>`, inline: false },
        { name: '💰 **Limitación**', value: `**Estado:** Los endpoints específicos de guild requieren JWT\n**Disponible:** Solo estadísticas generales del sistema\n**Total Revenue Sistema:** $${revenueData?.totalRevenue || '0.00'}`, inline: false }
      );
    } else if (type === 'user') {
      embed.addFields(
        { name: '👤 **Información Discord**', value: 'Usuario no encontrado en Discord', inline: false },
        { name: '💰 **Limitación**', value: `**Estado:** Los endpoints específicos de usuario requieren JWT\n**Disponible:** Solo estadísticas generales del sistema\n**Total Revenue Sistema:** $${revenueData?.totalRevenue || '0.00'}`, inline: false }
      );
    } else if (type === 'guild') {
      embed.addFields(
        { name: '🏰 **Información Discord**', value: 'Servidor no accesible', inline: false },
        { name: '💰 **Limitación**', value: `**Estado:** Los endpoints específicos de guild requieren JWT\n**Disponible:** Solo estadísticas generales del sistema\n**Total Revenue Sistema:** $${revenueData?.totalRevenue || '0.00'}`, inline: false }
      );
    } else if (type === 'revenue') {
      embed.addFields(
        { name: '💰 **Analytics de Revenue General**', value: `**Total Revenue:** $${revenueData?.totalRevenue || '0.00'}\n**Transacciones:** ${revenueData?.totalTransactions || 0}\n**Estado:** ${revenueData?.status || 'Operacional'}`, inline: false },
        { name: '📈 **Información del Sistema**', value: `**Última Actualización:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Fuente:** Analytics públicos\n**Precisión:** Estadísticas generales`, inline: false }
      );
    }

    embed.setFooter({ text: `Analytics ejecutado por ${interaction.user.username}` })
         .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    if (error.response?.status === 404) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('📊 Sin Datos de Analytics')
            .setDescription('No se encontraron datos de analytics para el target especificado.')
            .addFields(
              { name: 'Target ID', value: `\`${targetId}\``, inline: true },
              { name: 'Tipo', value: type, inline: true }
            )
        ]
      });
    } else {
      throw error;
    }
  }
}