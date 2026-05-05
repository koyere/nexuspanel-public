// Handler para botones de creación de tickets multiidioma
import { 
  ButtonInteraction, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  PermissionFlagsBits, 
  TextChannel, 
  MessageFlags, 
  CategoryChannel 
} from 'discord.js';
import { getTranslation, getPriorityText, getResponseTime, type Language } from '../utils/translations';
import { logTicketCreated } from '../services/ticketLogger';

const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';

// Configuración de categorías con prioridades
const TICKET_CATEGORIES = {
  tech_support: { color: 0x3498db, staffRole: 'Tech Support', priority: 'high' },
  billing_support: { color: 0xe74c3c, staffRole: 'Billing Support', priority: 'high' },
  general_support: { color: 0x2ecc71, staffRole: 'Support Team', priority: 'normal' },
  bug_report: { color: 0xf39c12, staffRole: 'Development Team', priority: 'high' },
  partnership: { color: 0x9b59b6, staffRole: 'Management', priority: 'low' }
};

export async function handleTicketCreation(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith('create_ticket_')) return;

  // Extraer categoría e idioma del customId
  const customIdParts = interaction.customId.split('_');
  if (customIdParts.length < 4) return;
  
  const categoryId = customIdParts.slice(2, -1).join('_'); // tech_support, billing_support, etc.
  const language = customIdParts[customIdParts.length - 1] as Language; // es o en
  
  const category = TICKET_CATEGORIES[categoryId as keyof typeof TICKET_CATEGORIES];
  
  if (!category) {
    await interaction.reply({
      content: language === 'es' 
        ? '❌ Categoría de ticket no válida.'
        : '❌ Invalid ticket category.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Verificar si usuario ya tiene ticket abierto
    const existingTicket = interaction.guild?.channels.cache.find(ch => 
      ch.name.includes(`ticket-${interaction.user.username.toLowerCase()}`) ||
      (ch.type === ChannelType.GuildText && (ch as TextChannel).topic?.includes(interaction.user.id))
    );

    if (existingTicket) {
      const warningEmbed = new EmbedBuilder()
        .setTitle(getTranslation(language, 'messages.ticketExists'))
        .setDescription(
          `**${getTranslation(language, 'errors.alreadyExists')}**\n\n` +
          `📍 **${language === 'es' ? 'Tu ticket actual:' : 'Your current ticket:'}** ${existingTicket}\n\n` +
          `**${language === 'es' ? 'Opciones:' : 'Options:'}**\n` +
          `• ${language === 'es' ? 'Utiliza tu ticket existente para consultas adicionales' : 'Use your existing ticket for additional inquiries'}\n` +
          `• ${language === 'es' ? 'Cierra tu ticket actual si el problema fue resuelto' : 'Close your current ticket if the issue was resolved'}\n` +
          `• ${language === 'es' ? 'Contacta a un staff si necesitas asistencia urgente' : 'Contact staff if you need urgent assistance'}`
        )
        .setColor(0xffa500)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({
        embeds: [warningEmbed]
      });
      return;
    }

    // Crear canal de ticket
    const ticketChannel = await createTicketChannel(interaction, category, categoryId, language);
    
    // 📊 LOGGING: Registrar creación de ticket en base de datos
    try {
      const ticketId = await logTicketCreated({
        channelId: ticketChannel.id,
        guildId: interaction.guildId!,
        userId: interaction.user.id,
        category: categoryId,
        language: language,
        subject: getTranslation(language, `categories.${categoryId}.name`)
      });
      
      if (ticketId) {
        console.log(`✅ Ticket ${ticketId} logged successfully for channel ${ticketChannel.id}`);
      }
    } catch (logError) {
      console.error('❌ Error logging ticket creation:', logError);
      // No break the flow - logging should not affect user experience
    }
    
    // Crear embed inicial del ticket con diseño moderno
    const ticketEmbed = new EmbedBuilder()
      .setTitle(getTranslation(language, `categories.${categoryId}.name`))
      .setDescription(
        `**${getTranslation(language, 'messages.ticketInfo')}**\n` +
        `**${getTranslation(language, 'messages.user')}** ${interaction.user} (\`${interaction.user.id}\`)\n` +
        `**${getTranslation(language, 'messages.category')}** ${getTranslation(language, `categories.${categoryId}.description`)}\n` +
        `**${getTranslation(language, 'messages.priority')}** ${getPriorityText(category.priority, language)}\n` +
        `**${getTranslation(language, 'messages.status')}** ${getTranslation(language, 'messages.pending')}\n` +
        `**${getTranslation(language, 'messages.created')}** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
        `**${getTranslation(language, 'messages.instructions')}**\n` +
        `${getTranslation(language, 'instructions.describe')}\n` +
        `${getTranslation(language, 'instructions.screenshots')}\n` +
        `${getTranslation(language, 'instructions.professional')}\n` +
        `${getTranslation(language, 'instructions.patient')}\n\n` +
        `**⏰ ${language === 'es' ? 'Tiempo estimado de respuesta:' : 'Estimated response time:'}** ${getResponseTime(category.priority, language)}`
      )
      .setColor(category.color)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setImage('https://via.placeholder.com/800x200/36393f/ffffff?text=Nexus+Panel+Ticket+System')
      .setFooter({
        text: `Ticket ID: ${ticketChannel.id} • Nexus Panel Support`,
        iconURL: interaction.guild?.iconURL() || undefined
      })
      .setTimestamp();

    // Crear botones de control en el idioma seleccionado con tamaño uniforme
    const controlButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`close_ticket_${ticketChannel.id}`)
          .setLabel(language === 'es' ? '🔒 Cerrar Ticket' : '🔒 Close Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`claim_ticket_${ticketChannel.id}`)
          .setLabel(language === 'es' ? '👋 Reclamar' : '👋 Claim Ticket')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`priority_ticket_${ticketChannel.id}`)
          .setLabel(language === 'es' ? '⚡ Prioridad' : '⚡ High Priority')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`transcript_ticket_${ticketChannel.id}`)
          .setLabel(language === 'es' ? '📄 Transcript' : '📄 Transcript')
          .setStyle(ButtonStyle.Secondary)
      );

    // Mensaje de bienvenida del staff
    const staffRoleId = getStaffRoleId(interaction, category.staffRole);
    const staffMention = staffRoleId === '@everyone' ? '@everyone' : `<@&${staffRoleId}>`;
    const welcomeContent = `${interaction.user} **${getTranslation(language, 'messages.welcome')}**\n\n` +
                          `🏷️ **${getTranslation(language, 'messages.teamAssigned')}** ${staffMention}\n` +
                          `📊 **${getTranslation(language, 'messages.category')}** ${getTranslation(language, `categories.${categoryId}.name`)}\n` +
                          `⚡ **${getTranslation(language, 'messages.priority')}** ${getPriorityText(category.priority, language)}\n\n` +
                          `${language === 'es' 
                            ? 'Un miembro de nuestro equipo te asistirá pronto. Mientras tanto, puedes proporcionar toda la información relevante sobre tu consulta.'
                            : 'A member of our team will assist you soon. Meanwhile, you can provide all relevant information about your inquiry.'
                          }`;

    // Enviar mensaje inicial en el ticket
    await ticketChannel.send({
      content: welcomeContent,
      embeds: [ticketEmbed],
      components: [controlButtons]
    });

    // Enviar mensaje de ayuda adicional en el idioma correcto
    const helpEmbed = new EmbedBuilder()
      .setTitle(getTranslation(language, 'messages.helpTips'))
      .setDescription(
        `**${language === 'es' ? 'Para recibir la mejor ayuda posible:' : 'To receive the best possible help:'}**\n\n` +
        `${getTranslation(language, 'instructions.specific')}\n` +
        `${getTranslation(language, 'instructions.evidence')}\n` +
        `${getTranslation(language, 'instructions.ids')}\n` +
        `${getTranslation(language, 'instructions.timing')}\n` +
        `${getTranslation(language, 'instructions.browser')}\n\n` +
        `**${language === 'es' ? 'Enlaces útiles:' : 'Useful links:'}**\n` +
        `• [${language === 'es' ? 'Documentación' : 'Documentation'}](https://docs.nexus-panel.com)\n` +
        `• [${language === 'es' ? 'Panel Web' : 'Web Panel'}](https://app.nexus-panel.com)\n` +
        `• [${language === 'es' ? 'Estado del Servicio' : 'Service Status'}](https://status.nexus-panel.com)`
      )
      .setColor(0x00d2d3)
      .setFooter({ 
        text: language === 'es' 
          ? 'Nexus Panel • Aquí para ayudarte' 
          : 'Nexus Panel • Here to help you' 
      });

    await ticketChannel.send({ embeds: [helpEmbed] });

    // Confirmar creación al usuario con embed detallado
    const successEmbed = new EmbedBuilder()
      .setTitle(getTranslation(language, 'messages.ticketCreated'))
      .setDescription(
        `**${language === 'es' ? 'Tu ticket ha sido creado y configurado' : 'Your ticket has been created and configured'}**\n\n` +
        `📍 **${language === 'es' ? 'Canal del ticket:' : 'Ticket channel:'}** ${ticketChannel}\n` +
        `🌐 **${language === 'es' ? 'Idioma:' : 'Language:'}** ${language === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}\n` +
        `🏷️ **${getTranslation(language, 'messages.category')}** ${getTranslation(language, `categories.${categoryId}.name`)}\n` +
        `⚡ **${getTranslation(language, 'messages.priority')}** ${getPriorityText(category.priority, language)}\n` +
        `⏰ **${language === 'es' ? 'Tiempo estimado:' : 'Estimated time:'}** ${getResponseTime(category.priority, language)}\n` +
        `🆔 **Ticket ID:** \`${ticketChannel.id}\`\n\n` +
        `**${getTranslation(language, 'messages.nextSteps')}**\n` +
        `${language === 'es' ? '1. Dirígete a tu canal de ticket' : '1. Go to your ticket channel'}\n` +
        `${language === 'es' ? '2. Describe tu consulta detalladamente' : '2. Describe your inquiry in detail'}\n` +
        `${language === 'es' ? '3. Espera la respuesta del equipo de soporte' : '3. Wait for the support team response'}\n\n` +
        `${getTranslation(language, 'messages.thankYou')}`
      )
      .setColor(0x00ff00)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed]
    });

  } catch (error) {
    console.error('Error creating multilingual ticket:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle(getTranslation(language, 'messages.error'))
      .setDescription(
        `${language === 'es' 
          ? 'No se pudo crear tu ticket debido a un error técnico.' 
          : 'Could not create your ticket due to a technical error.'
        }\n\n` +
        `**${language === 'es' ? 'Posibles soluciones:' : 'Possible solutions:'}**\n` +
        `• ${getTranslation(language, 'errors.tryAgain')}\n` +
        `• ${getTranslation(language, 'errors.contactStaff')}\n` +
        `• ${getTranslation(language, 'errors.checkPermissions')}\n\n` +
        `${getTranslation(language, 'errors.persistentIssue')}`
      )
      .setColor(0xff0000)
      .setTimestamp();

    await interaction.editReply({
      embeds: [errorEmbed]
    });
  }
}

async function createTicketChannel(interaction: ButtonInteraction, category: any, categoryId: string, language: Language): Promise<TextChannel> {
  const guild = interaction.guild!;
  const user = interaction.user;
  
  // Buscar o crear categoría "TICKETS"
  let ticketCategory = guild.channels.cache.find(ch => 
    ch.type === ChannelType.GuildCategory && 
    (ch.name.toLowerCase().includes('ticket') || ch.name.toLowerCase().includes('soporte'))
  ) as CategoryChannel;

  if (!ticketCategory) {
    ticketCategory = await guild.channels.create({
      name: '🎫 TICKETS',
      type: ChannelType.GuildCategory,
      position: 999
    });
  }

  // Crear nombre único y limpio para el canal
  const timestamp = Date.now().toString().slice(-4);
  const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const languagePrefix = language === 'es' ? 'es' : 'en';
  const channelName = `ticket-${languagePrefix}-${cleanUsername}-${timestamp}`;
  
  // Crear canal con permisos específicos
  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: ticketCategory,
    topic: `${getTranslation(language, `categories.${categoryId}.name`)} - Ticket de ${user.tag} (${user.id}) - Lang: ${language.toUpperCase()} - Creado: ${new Date().toISOString()}`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.UseExternalEmojis
        ]
      },
      // Permisos para roles de staff
      ...getStaffPermissions(guild)
    ]
  });

  return ticketChannel as TextChannel;
}

function getStaffPermissions(guild: any) {
  const permissions = [];
  const staffRoles = ['Admin', 'Moderator', 'Support Team', 'Tech Support', 'Billing Support', 'Development Team', 'Management'];
  
  for (const roleName of staffRoles) {
    const role = guild.roles.cache.find((r: any) => r.name === roleName);
    if (role) {
      permissions.push({
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageChannels
        ]
      });
    }
  }

  return permissions;
}

function getStaffRoleId(interaction: ButtonInteraction, staffRole: string): string {
  const guild = interaction.guild;
  if (!guild) return '@everyone';
  
  // Buscar el rol específico primero
  let role = guild.roles.cache.find(r => r.name === staffRole);
  
  // Si no lo encuentra, buscar roles alternativos comunes
  if (!role) {
    const alternativeRoles = [
      'Support Team', 'Support', 'Staff', 'Moderator', 'Admin', 
      'Tech Support', 'Billing Support', 'Development Team', 'Management'
    ];
    
    for (const roleName of alternativeRoles) {
      role = guild.roles.cache.find(r => r.name === roleName);
      if (role) break;
    }
  }
  
  // Logging para debugging
  console.log(`🔍 Staff role search - Looking for: "${staffRole}"`);
  console.log(`📋 Available roles: ${guild.roles.cache.map(r => r.name).join(', ')}`);
  console.log(`✅ Selected role: ${role ? role.name : 'None found, using @everyone'}`);
  
  return role?.id || '@everyone';
}