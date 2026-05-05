// Test admin command - simple implementation
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';

const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';

export const data = new SlashCommandBuilder()
  .setName('nexus-test')
  .setDescription('🧪 Test command for admin system');

export async function execute(interaction: ChatInputCommandInteraction) {
  // Verificar que es el servidor correcto
  if (interaction.guildId !== NEXUS_SUPPORT_GUILD_ID) {
    await interaction.reply({
      content: '❌ Este comando solo está disponible en el servidor oficial de Nexus Panel.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🧪 Sistema Administrativo - Test')
    .setDescription('¡El sistema administrativo está funcionando correctamente!')
    .addFields(
      { name: '🎫 Tickets', value: 'Sistema listo', inline: true },
      { name: '📊 Métricas', value: 'Sistema listo', inline: true },
      { name: '🔍 Lookup', value: 'Sistema listo', inline: true }
    )
    .setColor(0x00AE86)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}