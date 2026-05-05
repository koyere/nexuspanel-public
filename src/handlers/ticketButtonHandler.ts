// Handler para botones de control de tickets
import { 
  ButtonInteraction, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  PermissionFlagsBits, 
  TextChannel,
  GuildMemberRoleManager,
  MessageFlags
} from 'discord.js';
import { getTranslation, type Language } from '../utils/translations';
import { logTicketAction, updateTicketStatus } from '../services/ticketLogger';
import { channelProtection } from '../services/channelProtection.service';

const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';

// Detectar idioma del ticket desde el topic del canal
function detectTicketLanguage(channel: TextChannel): Language {
  const topic = channel.topic || '';
  if (topic.includes('Lang: ES')) return 'es';
  if (topic.includes('Lang: EN')) return 'en';
  return 'es'; // Default español
}

// Verificar si el usuario tiene permisos de staff
function hasStaffPermissions(interaction: ButtonInteraction): boolean {
  const member = interaction.member;
  const memberPermissions = member?.permissions;
  const hasAdminPermissions = memberPermissions && typeof memberPermissions !== 'string' && memberPermissions.has(PermissionFlagsBits.Administrator);
  const hasRequiredRole = member && (member.roles as GuildMemberRoleManager).cache.some(role => 
    ['Admin', 'Moderator', 'Support Manager', 'Administrator', 'Owner', 'Staff', 'Support', 'Tech Support', 'Billing Support', 'Development Team', 'Management'].includes(role.name)
  );
  
  return !!(hasAdminPermissions || hasRequiredRole);
}

// Verificar si el usuario es el creador del ticket
function isTicketOwner(interaction: ButtonInteraction, channel: TextChannel): boolean {
  const topic = channel.topic || '';
  return topic.includes(interaction.user.id);
}

export async function handleTicketButton(interaction: ButtonInteraction) {
  if (!interaction.customId.includes('_ticket_')) return;

  const channel = interaction.channel as TextChannel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: '❌ Este comando solo funciona en canales de texto.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const language = detectTicketLanguage(channel);
  const isStaff = hasStaffPermissions(interaction);
  const isOwner = isTicketOwner(interaction, channel);

  // Extraer acción del customId
  const action = interaction.customId.split('_')[0]; // close, claim, priority, transcript

  try {
    switch (action) {
      case 'close':
        await handleCloseTicket(interaction, channel, language, isStaff, isOwner);
        break;
      case 'claim':
        await handleClaimTicket(interaction, channel, language, isStaff);
        break;
      case 'priority':
        await handlePriorityTicket(interaction, channel, language, isStaff);
        break;
      case 'transcript':
        await handleTranscriptTicket(interaction, channel, language, isStaff, isOwner);
        break;
      default:
        await interaction.reply({
          content: language === 'es' ? '❌ Acción no reconocida.' : '❌ Unrecognized action.',
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error('Error in ticket button handler:', error);
    await interaction.reply({
      content: language === 'es' 
        ? '❌ Ocurrió un error al procesar la acción. Por favor, inténtalo nuevamente.'
        : '❌ An error occurred while processing the action. Please try again.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleCloseTicket(interaction: ButtonInteraction, channel: TextChannel, language: Language, isStaff: boolean, isOwner: boolean) {
  // Solo staff o el dueño del ticket pueden cerrarlo
  if (!isStaff && !isOwner) {
    await interaction.reply({
      content: language === 'es' 
        ? '❌ Solo el staff o el creador del ticket pueden cerrarlo.'
        : '❌ Only staff or the ticket creator can close it.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply();

  try {
    // Generar transcript automático antes de cerrar
    console.log(`📄 Generating automatic transcript for ${channel.name}...`);
    await generateAndSendTranscript(interaction, channel, language, true);

    // Crear embed de confirmación de cierre
    const closeEmbed = new EmbedBuilder()
      .setTitle(getTranslation(language, 'messages.ticketClosed'))
      .setDescription(
        `**${language === 'es' ? 'El ticket ha sido cerrado' : 'The ticket has been closed'}**\n\n` +
        `👤 **${language === 'es' ? 'Cerrado por:' : 'Closed by:'}** ${interaction.user}\n` +
        `⏰ **${language === 'es' ? 'Fecha de cierre:' : 'Closure date:'}** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
        `🆔 **Ticket ID:** \`${channel.id}\`\n` +
        `📄 **Transcript:** Enviado automáticamente al registro\n\n` +
        `${language === 'es' 
          ? '⚠️ **Este canal será eliminado en 30 segundos.**\n\nGracias por usar Nexus Panel Support.' 
          : '⚠️ **This channel will be deleted in 30 seconds.**\n\nThank you for using Nexus Panel Support.'
        }`
      )
      .setColor(0xff4757)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({
        text: language === 'es' ? 'Ticket cerrado • Nexus Panel' : 'Ticket closed • Nexus Panel',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    // Actualizar mensaje original
    await interaction.editReply({
      embeds: [closeEmbed]
    });

    console.log(`🔒 Ticket ${channel.name} closed by ${interaction.user.tag} (${interaction.user.id})`);

    // 📊 LOGGING: Registrar cierre de ticket
    try {
      await updateTicketStatus(channel.id, {
        status: 'closed',
        closedBy: interaction.user.id
      });
      console.log(`✅ Ticket closure logged for channel ${channel.id}`);
    } catch (logError) {
      console.error('❌ Error logging ticket closure:', logError);
    }

    // ✅ SAFETY FIRST: Verificación crítica de seguridad ANTES de eliminar
    const protectionCheck = channelProtection.attemptDeletion(
      channel.id,
      channel.name,
      channel.guild.id,
      channel.type.toString(),
      `Ticket cerrado por ${interaction.user.tag}`,
      interaction.user.id
    );

    if (!protectionCheck.approved) {
      console.log(`🛡️ ELIMINACIÓN BLOQUEADA: ${channel.name} - Razón: ${protectionCheck.reason}`);
      console.log(`📊 ESTADÍSTICA: Ticket "${channel.name}" cerrado pero NO eliminado por protecciones de seguridad`);
      
      // Notificar al usuario que el ticket fue cerrado pero no eliminado
      const protectionEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🛡️ Ticket Cerrado con Protección')
        .setDescription(`El ticket ha sido cerrado exitosamente, pero el canal se mantiene por protecciones de seguridad.\n\n**Razón**: ${protectionCheck.reason}`)
        .setTimestamp();
        
      await interaction.followUp({ embeds: [protectionEmbed], ephemeral: true });
      return; // BLOQUEAR eliminación
    }

    // Solo eliminar si pasa TODAS las protecciones de seguridad
    setTimeout(async () => {
      try {
        // ✅ PROTECCIÓN FINAL: Verificar una vez más antes de eliminar
        const finalCheck = channelProtection.canDeleteChannel(
          channel.id,
          channel.name,
          channel.guild.id, 
          channel.type.toString(),
          `Ticket cerrado por ${interaction.user.tag}`
        );

        if (!finalCheck.allowed) {
          console.log(`🛡️ ELIMINACIÓN BLOQUEADA EN ÚLTIMO MOMENTO: ${finalCheck.reason}`);
          return;
        }

        await channel.delete(`Ticket cerrado por ${interaction.user.tag}`);
        console.log(`🗑️ Ticket channel ${channel.name} deleted after closure with security verification`);
      } catch (error) {
        console.error('Error deleting ticket channel:', error);
      }
    }, 30000);

  } catch (error) {
    console.error('Error closing ticket:', error);
    await interaction.editReply({
      content: language === 'es' 
        ? '❌ Error al cerrar el ticket. Por favor, contacta a un administrador.'
        : '❌ Error closing ticket. Please contact an administrator.'
    });
  }
}

async function handleClaimTicket(interaction: ButtonInteraction, channel: TextChannel, language: Language, isStaff: boolean) {
  if (!isStaff) {
    await interaction.reply({
      content: language === 'es' 
        ? '❌ Solo el staff puede reclamar tickets.'
        : '❌ Only staff can claim tickets.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply();

  try {
    const claimEmbed = new EmbedBuilder()
      .setTitle(language === 'es' ? '👋 Ticket Reclamado' : '👋 Ticket Claimed')
      .setDescription(
        `**${language === 'es' ? 'Ticket asignado a staff' : 'Ticket assigned to staff'}**\n\n` +
        `👤 **${language === 'es' ? 'Atendido por:' : 'Handled by:'}** ${interaction.user}\n` +
        `⏰ **${language === 'es' ? 'Reclamado:' : 'Claimed:'}** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
        `${language === 'es' 
          ? 'Este miembro del staff se encargará de resolver tu consulta.'
          : 'This staff member will handle resolving your inquiry.'
        }`
      )
      .setColor(0x5865f2)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    await interaction.editReply({
      embeds: [claimEmbed]
    });

    console.log(`👋 Ticket ${channel.name} claimed by ${interaction.user.tag} (${interaction.user.id})`);

    // 📊 LOGGING: Registrar claim de ticket
    try {
      await updateTicketStatus(channel.id, {
        status: 'claimed',
        claimedBy: interaction.user.id
      });
      console.log(`✅ Ticket claim logged for channel ${channel.id}`);
    } catch (logError) {
      console.error('❌ Error logging ticket claim:', logError);
    }

  } catch (error) {
    console.error('Error claiming ticket:', error);
    await interaction.editReply({
      content: language === 'es' 
        ? '❌ Error al reclamar el ticket.'
        : '❌ Error claiming ticket.'
    });
  }
}

async function handlePriorityTicket(interaction: ButtonInteraction, channel: TextChannel, language: Language, isStaff: boolean) {
  if (!isStaff) {
    await interaction.reply({
      content: language === 'es' 
        ? '❌ Solo el staff puede cambiar la prioridad.'
        : '❌ Only staff can change priority.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply();

  try {
    const priorityEmbed = new EmbedBuilder()
      .setTitle(language === 'es' ? '⚡ Prioridad Actualizada' : '⚡ Priority Updated')
      .setDescription(
        `**${language === 'es' ? 'Ticket marcado como alta prioridad' : 'Ticket marked as high priority'}**\n\n` +
        `👤 **${language === 'es' ? 'Actualizado por:' : 'Updated by:'}** ${interaction.user}\n` +
        `⚡ **${language === 'es' ? 'Nueva prioridad:' : 'New priority:'}** 🔴 ${language === 'es' ? 'Alta' : 'High'}\n` +
        `⏰ **${language === 'es' ? 'Tiempo de respuesta:' : 'Response time:'}** < 4 horas\n\n` +
        `${language === 'es' 
          ? '🚨 Este ticket será atendido con prioridad.'
          : '🚨 This ticket will be handled with priority.'
        }`
      )
      .setColor(0xff6b35)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    await interaction.editReply({
      embeds: [priorityEmbed]
    });

    console.log(`⚡ Ticket ${channel.name} marked as high priority by ${interaction.user.tag}`);

    // 📊 LOGGING: Registrar cambio de prioridad
    try {
      await updateTicketStatus(channel.id, {
        priority: 'high'
      });
      console.log(`✅ Ticket priority change logged for channel ${channel.id}`);
    } catch (logError) {
      console.error('❌ Error logging ticket priority change:', logError);
    }

  } catch (error) {
    console.error('Error updating priority:', error);
    await interaction.editReply({
      content: language === 'es' 
        ? '❌ Error al actualizar la prioridad.'
        : '❌ Error updating priority.'
    });
  }
}

async function handleTranscriptTicket(interaction: ButtonInteraction, channel: TextChannel, language: Language, isStaff: boolean, isOwner: boolean) {
  if (!isStaff && !isOwner) {
    await interaction.reply({
      content: language === 'es' 
        ? '❌ Solo el staff o el creador del ticket pueden generar el transcript.'
        : '❌ Only staff or the ticket creator can generate transcript.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await generateAndSendTranscript(interaction, channel, language, false);
}

// Función centralizada para generar y enviar transcripts
async function generateAndSendTranscript(interaction: ButtonInteraction, channel: TextChannel, language: Language, isAutomatic: boolean) {
  const TRANSCRIPT_LOG_CHANNEL_ID = '1397060287315710034';
  
  try {
    // Obtener información del ticket desde el topic
    const topic = channel.topic || '';
    const ticketOwnerMatch = topic.match(/\((\d+)\)/);
    const ticketOwner = ticketOwnerMatch ? ticketOwnerMatch[1] : 'Unknown';
    const ticketLanguage = topic.includes('Lang: ES') ? 'ES' : topic.includes('Lang: EN') ? 'EN' : 'ES';
    const createdAtMatch = topic.match(/Creado: (.+?)$/);
    const createdAt = createdAtMatch ? createdAtMatch[1] : 'Unknown';

    // Obtener todos los mensajes del canal
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Crear transcript en formato texto detallado
    let transcript = `📄 TRANSCRIPT DEL TICKET - NEXUS PANEL SUPPORT\n`;
    transcript += `════════════════════════════════════════════════════════════════\n`;
    transcript += `🆔 Canal: ${channel.name}\n`;
    transcript += `👤 Propietario: <@${ticketOwner}> (${ticketOwner})\n`;
    transcript += `🌐 Idioma: ${ticketLanguage}\n`;
    transcript += `🕐 Creado: ${createdAt}\n`;
    transcript += `📅 Transcript generado: ${new Date().toLocaleString()}\n`;
    transcript += `🔄 Generado por: ${isAutomatic ? 'Sistema automático' : interaction.user.tag}\n`;
    transcript += `📊 Total de mensajes: ${sortedMessages.size}\n`;
    transcript += `════════════════════════════════════════════════════════════════\n\n`;

    // Agregar todos los mensajes con formato detallado
    sortedMessages.forEach(msg => {
      const timestamp = new Date(msg.createdTimestamp).toLocaleString();
      const author = `${msg.author.tag} (${msg.author.id})`;
      
      transcript += `┌─ [${timestamp}] ${author}\n`;
      if (msg.content) {
        transcript += `│  💬 ${msg.content}\n`;
      }
      
      if (msg.embeds.length > 0) {
        msg.embeds.forEach((embed, index) => {
          transcript += `│  📋 Embed ${index + 1}:\n`;
          if (embed.title) transcript += `│     🏷️ Título: ${embed.title}\n`;
          if (embed.description) transcript += `│     📝 Descripción: ${embed.description.substring(0, 200)}...\n`;
        });
      }
      
      if (msg.attachments.size > 0) {
        transcript += `│  📎 Archivos adjuntos:\n`;
        msg.attachments.forEach(attachment => {
          transcript += `│     🔗 ${attachment.name} (${attachment.url})\n`;
        });
      }
      
      transcript += `└─────────────────────────────────────────────────────────────\n\n`;
    });

    transcript += `\n════════════════════════════════════════════════════════════════\n`;
    transcript += `📊 RESUMEN DEL TICKET:\n`;
    transcript += `• Total de mensajes: ${sortedMessages.size}\n`;
    transcript += `• Participantes únicos: ${[...new Set(sortedMessages.map(m => m.author.tag))].length}\n`;
    transcript += `• Duración aproximada: ${Math.round((Date.now() - sortedMessages.first()?.createdTimestamp!) / (1000 * 60 * 60))} horas\n`;
    transcript += `• Estado: ${isAutomatic ? 'CERRADO AUTOMÁTICAMENTE' : 'TRANSCRIPT MANUAL'}\n`;
    transcript += `════════════════════════════════════════════════════════════════\n`;

    // Crear archivo
    const buffer = Buffer.from(transcript, 'utf-8');
    const filename = `transcript-${channel.name}-${Date.now()}.txt`;

    // Crear embed para el canal de logs
    const logEmbed = new EmbedBuilder()
      .setTitle(isAutomatic ? '📄 Transcript Automático de Ticket Cerrado' : '📄 Transcript Manual Generado')
      .setDescription(
        `**📋 Información del Ticket:**\n` +
        `🆔 **Canal:** ${channel.name}\n` +
        `👤 **Propietario:** <@${ticketOwner}>\n` +
        `🌐 **Idioma:** ${ticketLanguage}\n` +
        `🕐 **Creado:** ${createdAt}\n` +
        `📅 **Cerrado:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
        `🔄 **Acción:** ${isAutomatic ? 'Cierre automático' : `Transcript manual por ${interaction.user.tag}`}\n` +
        `📊 **Mensajes:** ${sortedMessages.size} mensajes registrados\n\n` +
        `📎 **Archivo adjunto:** ${filename}`
      )
      .setColor(isAutomatic ? 0xff4757 : 0x00d2d3)
      .setThumbnail(interaction.guild?.iconURL() || null)
      .setFooter({
        text: 'Nexus Panel Support System',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    // Enviar al canal de logs
    const logChannel = interaction.guild?.channels.cache.get(TRANSCRIPT_LOG_CHANNEL_ID) as TextChannel;
    if (logChannel) {
      await logChannel.send({
        embeds: [logEmbed],
        files: [{
          attachment: buffer,
          name: filename
        }]
      });
      console.log(`📄 Transcript sent to log channel for ${channel.name}`);
    } else {
      console.error(`❌ Log channel ${TRANSCRIPT_LOG_CHANNEL_ID} not found`);
    }

    // Si es manual, responder al usuario
    if (!isAutomatic) {
      const userEmbed = new EmbedBuilder()
        .setTitle(language === 'es' ? '📄 Transcript Generado' : '📄 Transcript Generated')
        .setDescription(
          `**${language === 'es' ? 'Transcript del ticket creado' : 'Ticket transcript created'}**\n\n` +
          `📊 **${language === 'es' ? 'Mensajes incluidos:' : 'Messages included:'}** ${sortedMessages.size}\n` +
          `⏰ **${language === 'es' ? 'Generado:' : 'Generated:'}** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
          `📋 **${language === 'es' ? 'Enviado al registro:' : 'Sent to logs:'}** <#${TRANSCRIPT_LOG_CHANNEL_ID}>\n\n` +
          `${language === 'es' 
            ? '✅ El transcript ha sido guardado automáticamente en el canal de registros.'
            : '✅ The transcript has been automatically saved to the logs channel.'
          }`
        )
        .setColor(0x00d2d3)
        .setTimestamp();

      await interaction.editReply({
        embeds: [userEmbed]
      });
    }

    console.log(`📄 ${isAutomatic ? 'Automatic' : 'Manual'} transcript generated for ${channel.name} by ${interaction.user.tag}`);

  } catch (error) {
    console.error('Error generating transcript:', error);
    
    if (!isAutomatic) {
      await interaction.editReply({
        content: language === 'es' 
          ? '❌ Error al generar el transcript.'
          : '❌ Error generating transcript.'
      });
    }
  }
}