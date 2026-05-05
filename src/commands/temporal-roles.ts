// FASE 1.1.9: Comando para ver roles temporales activos
// /opt/nexus-panel/bot/src/commands/temporal-roles.ts

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import axios from 'axios';
import { detectServerLanguage, getTranslation } from '../utils/translations';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://backend:3001';

export const data = new SlashCommandBuilder()
  .setName('temporal-roles')
  .setDescription('⏰ Ver tus roles temporales activos y su tiempo restante')
  .setDescriptionLocalizations({
    'es-ES': '⏰ Ver tus roles temporales activos y su tiempo restante',
    'en-US': '⏰ View your active temporary roles and remaining time'
  });

/**
 * Calcula el tiempo restante en formato legible
 */
function formatTimeRemaining(expiresAt: string, language: 'es' | 'en'): string {
  const now = new Date();
  const expirationDate = new Date(expiresAt);
  const diffMs = expirationDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return language === 'es' ? 'Expirado' : 'Expired';
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  const dayLabel = getTranslation(language, 'commands.temporalRoles.days');
  const hourLabel = getTranslation(language, 'commands.temporalRoles.hours');
  const minuteLabel = getTranslation(language, 'commands.temporalRoles.minutes');

  if (days > 0) parts.push(`${days} ${dayLabel}`);
  if (hours > 0) parts.push(`${hours} ${hourLabel}`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} ${minuteLabel}`);

  return parts.join(', ') || `< 1 ${minuteLabel}`;
}

/**
 * Determina si un rol está por expirar pronto (menos de 24 horas)
 */
function isExpiringSoon(expiresAt: string): boolean {
  const now = new Date();
  const expirationDate = new Date(expiresAt);
  const diffMs = expirationDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  return hoursRemaining <= 24 && hoursRemaining > 0;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: 'Este comando solo puede usarse en un servidor.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const language = detectServerLanguage(guildId);

  try {
    // Fetch user's temporal roles from backend
    const response = await axios.get(
      `${BACKEND_API_URL}/api/user/${userId}/temporal-roles`,
      {
        params: { guildId },
        headers: {
          'Authorization': `Bearer ${process.env.BOT_INTERNAL_API_KEY}`
        }
      }
    );

    const temporalRoles = response.data.temporalRoles || [];

    // If no temporal roles, show friendly message
    if (temporalRoles.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(getTranslation(language, 'commands.temporalRoles.noRoles'))
        .setDescription(getTranslation(language, 'commands.temporalRoles.noRolesDescription'))
        .setColor(0x5865F2)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // Build embed with active temporal roles
    const embed = new EmbedBuilder()
      .setTitle(getTranslation(language, 'commands.temporalRoles.activeRolesTitle'))
      .setColor(0x00AE86)
      .setTimestamp()
      .setFooter({ text: `${temporalRoles.length} ${language === 'es' ? 'rol(es) temporal(es)' : 'temporal role(s)'}` });

    // Add field for each temporal role
    for (const roleAssignment of temporalRoles) {
      const timeRemaining = formatTimeRemaining(roleAssignment.expiresAt, language);
      const expiringSoonBadge = isExpiringSoon(roleAssignment.expiresAt)
        ? getTranslation(language, 'commands.temporalRoles.expiringSoon')
        : '';

      const fieldValue = [
        `**${getTranslation(language, 'commands.temporalRoles.expiresIn')}** ${timeRemaining}`,
        `**${getTranslation(language, 'commands.temporalRoles.purchasedOn')}** <t:${Math.floor(new Date(roleAssignment.assignedAt).getTime() / 1000)}:R>`,
        expiringSoonBadge
      ].filter(Boolean).join('\n');

      embed.addFields({
        name: `${roleAssignment.role.name}`,
        value: fieldValue,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

  } catch (error: any) {
    console.error('Error fetching temporal roles:', error);

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription(
        language === 'es'
          ? 'Ocurrió un error al cargar tus roles temporales. Por favor, inténtalo de nuevo más tarde.'
          : 'An error occurred while loading your temporal roles. Please try again later.'
      )
      .setColor(0xED4245)
      .setTimestamp();

    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}
