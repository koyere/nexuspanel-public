// Comando para generar panel de tickets multiidioma
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, GuildMemberRoleManager, TextChannel, MessageFlags } from 'discord.js';
import { getTranslation, detectServerLanguage, type Language } from '../utils/translations';

const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';

export const data = new SlashCommandBuilder()
  .setName('nexus-ticket-panel')
  .setDescription('🎫 Genera el panel de tickets profesional en el canal actual')
  .addChannelOption(option =>
    option
      .setName('canal')
      .setDescription('Canal donde generar el panel (por defecto: canal actual)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('idioma')
      .setDescription('Idioma principal del panel (detecta automáticamente si no se especifica)')
      .addChoices(
        { name: '🇪🇸 Español', value: 'es' },
        { name: '🇺🇸 English', value: 'en' }
      )
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Verificar servidor
  if (interaction.guildId !== NEXUS_SUPPORT_GUILD_ID) {
    await interaction.reply({
      content: '❌ Este comando solo está disponible en el servidor oficial de Nexus Panel.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Verificar permisos (roles o permisos de administrador)
  const member = interaction.member;
  const memberPermissions = member?.permissions;
  const hasAdminPermissions = memberPermissions && typeof memberPermissions !== 'string' && memberPermissions.has(PermissionFlagsBits.Administrator);
  const hasRequiredRole = member && (member.roles as GuildMemberRoleManager).cache.some(role => 
    ['Admin', 'Moderator', 'Support Manager', 'Administrator', 'Owner', 'Staff', 'Support'].includes(role.name)
  );
  
  if (!member || (!hasAdminPermissions && !hasRequiredRole)) {
    await interaction.reply({
      content: `❌ No tienes permisos para generar paneles de tickets.\n\n**Permisos requeridos:**\n• Permiso de Administrador\n• O uno de estos roles: Admin, Moderator, Support Manager, Administrator, Owner, Staff, Support`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Obtener canal objetivo
    const targetChannel = interaction.options.getChannel('canal') as TextChannel || interaction.channel as TextChannel;
    
    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      await interaction.editReply({
        content: '❌ El canal debe ser un canal de texto válido.'
      });
      return;
    }

    // Detectar o usar idioma especificado
    const specifiedLanguage = interaction.options.getString('idioma') as Language;
    const serverLanguage = specifiedLanguage || detectServerLanguage(interaction.guildId!);
    
    // Crear embed principal en idioma detectado
    const mainEmbed = new EmbedBuilder()
      .setTitle(getTranslation(serverLanguage, 'panel.title'))
      .setDescription(getTranslation(serverLanguage, 'panel.description'))
      .setColor(0x00d2d3)
      .setThumbnail(interaction.guild?.iconURL({ extension: 'png' }) || null)
      .setImage('https://via.placeholder.com/1200x300/00d2d3/ffffff?text=Nexus+Panel+Support+System')
      .setFooter({
        text: getTranslation(serverLanguage, 'panel.footer'),
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    // Agregar field para selección de idioma
    mainEmbed.addFields({
      name: getTranslation(serverLanguage, 'panel.languageSelect'),
      value: serverLanguage === 'es' 
        ? 'Cada categoría tiene botones en **🇪🇸 Español** e **🇺🇸 English**. Elige tu idioma preferido al crear el ticket.'
        : 'Each category has buttons in **🇪🇸 Español** and **🇺🇸 English**. Choose your preferred language when creating the ticket.',
      inline: false
    });

    // Crear botones duales para cada categoría
    const buttonRows = createDualLanguageButtons();

    // Enviar panel al canal
    const panelMessage = await targetChannel.send({
      embeds: [mainEmbed],
      components: buttonRows
    });

    // Confirmar éxito con embed detallado
    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Panel de Tickets Multiidioma Generado')
      .setDescription(
        `**El panel de tickets ha sido creado exitosamente**\n\n` +
        `📍 **Canal:** ${targetChannel}\n` +
        `🌐 **Idioma Principal:** ${serverLanguage === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}\n` +
        `🎫 **Categorías:** 5 categorías con botones duales ES/EN\n` +
        `🆔 **Message ID:** \`${panelMessage.id}\`\n` +
        `⏰ **Generado:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
        `👤 **Por:** ${interaction.user}\n\n` +
        `**Categorías disponibles (Dual Language):**\n` +
        `🔧 **Soporte Técnico / Technical Support**\n` +
        `💳 **Facturación / Billing**\n` +
        `💬 **Consulta General / General Inquiry**\n` +
        `🐛 **Reporte de Bug / Bug Report**\n` +
        `🤝 **Partnership / Partnership**\n\n` +
        `El panel está listo para recibir tickets en ambos idiomas.`
      )
      .setColor(0x00ff00)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed]
    });

  } catch (error) {
    console.error('Error generating multilingual ticket panel:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error al Generar Panel Multiidioma')
      .setDescription(
        `Ocurrió un error al crear el panel de tickets multiidioma.\n\n` +
        `**Posibles causas:**\n` +
        `• Permisos insuficientes del bot\n` +
        `• Canal no válido\n` +
        `• Error temporal del servidor\n\n` +
        `Por favor, verifica los permisos e inténtalo nuevamente.`
      )
      .setColor(0xff0000)
      .setTimestamp();

    await interaction.editReply({
      embeds: [errorEmbed]
    });
  }
}

function createDualLanguageButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const categories = ['tech_support', 'billing_support', 'general_support', 'bug_report', 'partnership'];
  const emojis = ['🔧', '💳', '💬', '🐛', '🤝'];
  const colors = [ButtonStyle.Primary, ButtonStyle.Danger, ButtonStyle.Success, ButtonStyle.Secondary, ButtonStyle.Secondary];
  
  // Labels estandarizados para tamaño uniforme
  const standardLabels = {
    tech_support: { es: '🔧 Soporte Técnico', en: '🔧 Technical Support' },
    billing_support: { es: '💳 Facturación', en: '💳 Billing Support' },
    general_support: { es: '💬 Consulta General', en: '💬 General Inquiry' },
    bug_report: { es: '🐛 Reportar Bug', en: '🐛 Report Bug' },
    partnership: { es: '🤝 Partnership', en: '🤝 Partnership' }
  };
  
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  
  // Crear una fila por categoría con botones ES/EN
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const style = colors[i];
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`create_ticket_${category}_es`)
          .setLabel(`🇪🇸 ${standardLabels[category as keyof typeof standardLabels].es}`)
          .setStyle(style),
        new ButtonBuilder()
          .setCustomId(`create_ticket_${category}_en`)
          .setLabel(`🇺🇸 ${standardLabels[category as keyof typeof standardLabels].en}`)
          .setStyle(style)
      );
    
    rows.push(row);
  }
  
  return rows;
}