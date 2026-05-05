// Comando para testing y control del sistema de auto-close de tickets
import { SlashCommandBuilder, EmbedBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getTicketAutoCloseService } from '../services/ticketAutoClose';

export const data = new SlashCommandBuilder()
  .setName('nexus-autoclose-test')
  .setDescription('Testing y control del sistema de auto-close de tickets (Solo administradores)')
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('Ver estado del servicio de auto-close')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('force-check')
      .setDescription('Forzar verificación manual de tickets inactivos')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('stats')
      .setDescription('Ver estadísticas del servicio de auto-close')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: any) {
  // Verificar permisos de administrador
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Acceso Denegado')
      .setDescription('Este comando requiere permisos de administrador.')
      .setColor(0xff0000)
      .setTimestamp();

    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const autoCloseService = getTicketAutoCloseService();

  if (!autoCloseService) {
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Servicio No Disponible')
      .setDescription('El servicio de auto-close no está inicializado.')
      .setColor(0xff0000)
      .setTimestamp();

    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  try {
    switch (subcommand) {
      case 'status':
        await handleStatusCommand(interaction, autoCloseService);
        break;
      case 'force-check':
        await handleForceCheckCommand(interaction, autoCloseService);
        break;
      case 'stats':
        await handleStatsCommand(interaction, autoCloseService);
        break;
      default:
        await interaction.reply({ content: '❌ Subcomando no reconocido.', ephemeral: true });
    }
  } catch (error) {
    console.error('Error in nexus-autoclose-test command:', error);
    await interaction.reply({ 
      content: '❌ Ocurrió un error al ejecutar el comando.', 
      ephemeral: true 
    });
  }
}

async function handleStatusCommand(interaction: CommandInteraction, autoCloseService: any) {
  const stats = autoCloseService.getStats();
  
  const statusEmbed = new EmbedBuilder()
    .setTitle('🔒 Estado del Sistema Auto-Close')
    .setDescription('Estado actual del servicio de auto-cierre de tickets')
    .addFields(
      {
        name: '⚡ Estado del Servicio',
        value: stats.isRunning ? '✅ **Activo**' : '❌ **Inactivo**',
        inline: true
      },
      {
        name: '⏰ Intervalo de Verificación',
        value: `🕐 **${stats.interval}**`,
        inline: true
      },
      {
        name: '📊 Configuración',
        value: `🗓️ **Días de inactividad:** 7 días\n🔍 **Verificación automática:** Cada 24 horas\n🎯 **Servidor objetivo:** Nexus Support`,
        inline: false
      },
      {
        name: '🛠️ Funcionalidades',
        value: `• Auto-detección de tickets inactivos\n• Notificación antes del cierre\n• Logging completo de acciones\n• Cierre automático y eliminación\n• Soporte multiidioma (ES/EN)`,
        inline: false
      }
    )
    .setColor(stats.isRunning ? 0x00ff00 : 0xff0000)
    .setTimestamp()
    .setFooter({
      text: 'Nexus Panel • Auto-Close System',
      iconURL: interaction.guild?.iconURL() || undefined
    });

  await interaction.reply({ embeds: [statusEmbed] });
}

async function handleForceCheckCommand(interaction: CommandInteraction, autoCloseService: any) {
  await interaction.deferReply();

  try {
    // Ejecutar verificación forzada
    await autoCloseService.forceCheck();

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Verificación Completada')
      .setDescription('Se ha ejecutado una verificación manual de tickets inactivos.')
      .addFields(
        {
          name: '🔍 Proceso Ejecutado',
          value: `• Verificación de todos los canales de tickets\n• Análisis de última actividad\n• Auto-cierre de tickets con +7 días de inactividad\n• Logging de acciones realizadas`,
          inline: false
        },
        {
          name: '📋 Criterios de Auto-Cierre',
          value: `• **Inactividad:** 7 días sin mensajes de usuarios\n• **Detección:** Solo mensajes del bot no cuentan como actividad\n• **Notificación:** Se envía mensaje antes de cerrar\n• **Eliminación:** Canal se elimina después de 5 segundos`,
          inline: false
        }
      )
      .setColor(0x00ff00)
      .setTimestamp()
      .setFooter({
        text: 'Verificación ejecutada por: ' + interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL()
      });

    await interaction.editReply({ embeds: [successEmbed] });

  } catch (error) {
    console.error('Error in force check:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error en Verificación')
      .setDescription('Ocurrió un error durante la verificación manual.')
      .addFields({ name: '🔧 Detalles del Error', value: `\`\`\`${error instanceof Error ? error.message : 'Error desconocido'}\`\`\`` })
      .setColor(0xff0000)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handleStatsCommand(interaction: CommandInteraction, autoCloseService: any) {
  const stats = autoCloseService.getStats();
  
  const statsEmbed = new EmbedBuilder()
    .setTitle('📊 Estadísticas Auto-Close')
    .setDescription('Estadísticas detalladas del sistema de auto-cierre')
    .addFields(
      {
        name: '🔧 Estado Técnico',
        value: `**Servicio:** ${stats.isRunning ? '🟢 Online' : '🔴 Offline'}\n**Modo:** Producción\n**Versión:** 1.0.0`,
        inline: true
      },
      {
        name: '⚙️ Configuración Actual',
        value: `**Intervalo:** ${stats.interval}\n**Umbral:** 7 días\n**Auto-start:** ✅ Sí`,
        inline: true
      },
      {
        name: '📈 Métricas (Próximamente)',
        value: `**Tickets procesados:** En desarrollo\n**Auto-cerrados hoy:** En desarrollo\n**Promedio diario:** En desarrollo`,
        inline: false
      },
      {
        name: '🎯 Funcionalidades Implementadas',
        value: `✅ Auto-detección de tickets\n✅ Verificación de inactividad\n✅ Notificaciones multiidioma\n✅ Logging en base de datos\n✅ Eliminación automática\n✅ Comando de testing admin`,
        inline: false
      }
    )
    .setColor(0x3498db)
    .setTimestamp()
    .setFooter({
      text: 'Nexus Panel • Auto-Close Statistics',
      iconURL: interaction.guild?.iconURL() || undefined
    });

  await interaction.reply({ embeds: [statsEmbed] });
}