// Comando para mostrar dashboard de métricas administrativas
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ChannelType, PermissionFlagsBits, GuildMemberRoleManager, MessageFlags } from 'discord.js';
import { getTicketMetrics } from '../services/ticketLogger';

const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';

export const data = new SlashCommandBuilder()
  .setName('nexus-metrics')
  .setDescription('📊 Muestra dashboard completo de métricas del sistema de tickets')
  .addStringOption(option =>
    option
      .setName('periodo')
      .setDescription('Período de tiempo para las métricas')
      .addChoices(
        { name: '📅 Hoy', value: 'today' },
        { name: '📆 Esta Semana', value: 'week' },
        { name: '🗓️ Este Mes', value: 'month' },
        { name: '📊 Tiempo Real', value: 'realtime' }
      )
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('categoria')
      .setDescription('Filtrar métricas por categoría específica')
      .addChoices(
        { name: '🔧 Soporte Técnico', value: 'tech_support' },
        { name: '💳 Facturación', value: 'billing_support' },
        { name: '💬 Consulta General', value: 'general_support' },
        { name: '🐛 Reporte de Bug', value: 'bug_report' },
        { name: '🤝 Partnership', value: 'partnership' }
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
    ['Admin', 'Moderator', 'Support Manager', 'Administrator', 'Owner', 'Staff', 'Support', 'Management'].includes(role.name)
  );
  
  if (!member || (!hasAdminPermissions && !hasRequiredRole)) {
    await interaction.reply({
      content: `❌ No tienes permisos para ver las métricas administrativas.\n\n**Permisos requeridos:**\n• Permiso de Administrador\n• O uno de estos roles: Admin, Moderator, Support Manager, Staff, Support, Management`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Obtener parámetros
    const periodo = interaction.options.getString('periodo') || 'realtime';
    const categoria = interaction.options.getString('categoria');
    
    // 📊 USAR DATOS REALES: Obtener métricas desde la base de datos
    const realMetricsData = await getTicketMetrics({
      guildId: interaction.guildId!,
      period: periodo,
      category: categoria
    });

    if (!realMetricsData || !realMetricsData.success) {
      throw new Error('No se pudieron obtener las métricas de la base de datos');
    }

    // Combinar con métricas del canal para contexto adicional
    const channelMetrics = await generateChannelMetrics(interaction.guild!, periodo, categoria);
    const metricsData = combineMetrics(realMetricsData.metrics, channelMetrics);
    
    // Crear embed del dashboard
    const dashboardEmbed = createDashboardEmbed(metricsData, periodo, categoria);
    
    await interaction.editReply({
      embeds: [dashboardEmbed]
    });

  } catch (error) {
    console.error('Error generating metrics dashboard:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error en Dashboard de Métricas')
      .setDescription(
        `Ocurrió un error al generar las métricas del sistema.\n\n` +
        `**Posibles causas:**\n` +
        `• Error temporal del sistema\n` +
        `• Problema al acceder a los datos\n` +
        `• Sobrecarga del servidor\n\n` +
        `Por favor, inténtalo nuevamente en unos momentos.`
      )
      .setColor(0xff0000)
      .setTimestamp();

    await interaction.editReply({
      embeds: [errorEmbed]
    });
  }
}

// Función para combinar métricas reales de DB con información del canal
function combineMetrics(realMetrics: any, channelMetrics: any) {
  return {
    ...realMetrics,
    staffStats: channelMetrics.staffStats,
    channelInfo: channelMetrics.channelInfo,
    isRealData: true // Indicador de que usamos datos reales
  };
}

// Función para obtener métricas complementarias del canal (staff online, etc.)
async function generateChannelMetrics(guild: any, periodo: string, categoria: string | null) {
  // Estadísticas de staff (basado en roles) - información que no está en DB
  const staffMembers = guild.members.cache.filter((member: any) => {
    return member.roles.cache.some((role: any) => 
      ['Admin', 'Moderator', 'Support Team', 'Tech Support', 'Billing Support', 'Development Team', 'Management'].includes(role.name)
    );
  });

  const onlineStaff = staffMembers.filter((member: any) => 
    member.presence?.status === 'online' || member.presence?.status === 'idle' || member.presence?.status === 'dnd'
  );

  // Obtener canales de tickets activos para información adicional
  const ticketChannels = guild.channels.cache.filter((channel: any) => {
    if (channel.type !== ChannelType.GuildText) return false;
    const parent = channel.parent;
    if (parent && (parent.name.toLowerCase().includes('ticket') || parent.name.toLowerCase().includes('soporte'))) {
      return true;
    }
    return channel.name.toLowerCase().includes('ticket');
  });

  return {
    staffStats: {
      total: staffMembers.size,
      online: onlineStaff.size,
      offline: staffMembers.size - onlineStaff.size
    },
    channelInfo: {
      activeChannels: ticketChannels.size,
      guildName: guild.name,
      guildMemberCount: guild.memberCount
    }
  };
}

// Función para crear el embed del dashboard con datos reales
function createDashboardEmbed(metrics: any, periodo: string, categoria: string | null) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Dashboard de Métricas - Nexus Panel Support')
    .setColor(0x00d2d3)
    .setThumbnail('https://cdn.discordapp.com/embed/avatars/0.png')
    .setTimestamp();

  // Descripción con resumen usando datos reales
  let description = `**📋 Resumen del Sistema de Tickets**\n\n`;
  description += `🎯 **Período:** ${getPeriodoText(periodo)}\n`;
  if (categoria) {
    description += `🏷️ **Categoría:** ${getCategoryDisplayName(categoria)}\n`;
  }
  description += `⏰ **Actualizado:** <t:${Math.floor(new Date(metrics.generatedAt).getTime() / 1000)}:R>\n`;
  description += `🗃️ **Fuente:** Base de datos PostgreSQL (datos reales)\n\n`;

  // Estadísticas principales con datos reales de la DB
  description += `**📊 Estadísticas Principales:**\n`;
  description += `• 🎫 **Tickets Activos:** ${metrics.totalActiveTickets}\n`;
  description += `• 📊 **Total en Período:** ${metrics.totalTickets}\n`;
  description += `• ✅ **Tickets Cerrados:** ${metrics.closedTickets}\n`;
  description += `• 👥 **Staff Online:** ${metrics.staffStats?.online || 0}/${metrics.staffStats?.total || 0}\n`;
  
  // Información de rendimiento si está disponible
  if (metrics.performance) {
    if (metrics.performance.avgResponseTime) {
      description += `• ⚡ **Tiempo Promedio Respuesta:** ${metrics.performance.avgResponseTime.toFixed(1)}h\n`;
    }
    if (metrics.performance.avgCloseTime) {
      description += `• 🔒 **Tiempo Promedio Cierre:** ${metrics.performance.avgCloseTime.toFixed(1)}h\n`;
    }
  }

  embed.setDescription(description);

  // Campo de breakdown por categorías usando datos reales de la DB
  if (!categoria && metrics.categoryStats) {
    let categoryBreakdown = '';
    const categories = [
      { key: 'tech_support', emoji: '🔧', name: 'Soporte Técnico' },
      { key: 'billing_support', emoji: '💳', name: 'Facturación' },
      { key: 'general_support', emoji: '💬', name: 'Consulta General' },
      { key: 'bug_report', emoji: '🐛', name: 'Reporte de Bug' },
      { key: 'partnership', emoji: '🤝', name: 'Partnership' }
    ];

    const totalCategoryTickets = Object.values(metrics.categoryStats).reduce((sum: number, count: any) => sum + count, 0);

    categories.forEach(cat => {
      const count = metrics.categoryStats[cat.key] || 0;
      const percentage = totalCategoryTickets > 0 ? Math.round((count / totalCategoryTickets) * 100) : 0;
      if (count > 0) {
        categoryBreakdown += `${cat.emoji} **${cat.name}:** ${count} (${percentage}%)\n`;
      }
    });

    embed.addFields({
      name: '📋 Breakdown por Categorías (Datos Reales)',
      value: categoryBreakdown || 'Sin tickets registrados en la base de datos',
      inline: false
    });
  }

  // Campo de tickets recientes usando datos reales de la DB
  if (metrics.activeTickets && metrics.activeTickets.length > 0) {
    const recentTickets = metrics.activeTickets
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    let recentList = '';
    const now = new Date();
    recentTickets.forEach((ticket: any, index: number) => {
      const createdAt = new Date(ticket.createdAt);
      const age = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      const categoryEmoji = getCategoryEmoji(ticket.category);
      const langFlag = ticket.language === 'en' ? '🇺🇸' : '🇪🇸';
      const statusEmoji = ticket.status === 'open' ? '🟢' : ticket.status === 'claimed' ? '🟡' : '🔴';
      const priorityEmoji = ticket.priority === 'high' ? '🔴' : ticket.priority === 'urgent' ? '🚨' : '⚪';
      recentList += `${index + 1}. ${statusEmoji}${priorityEmoji} ${categoryEmoji} <#${ticket.channelId}> ${langFlag} (${age}h)\n`;
    });

    embed.addFields({
      name: '🕐 Tickets Activos Recientes (Base de Datos)',
      value: recentList,
      inline: false
    });
  }

  // Indicadores de estado basados en datos reales
  let statusIndicators = '';
  
  // Estado general del sistema
  const loadPercentage = Math.min(100, (metrics.totalActiveTickets / 20) * 100);
  const loadEmoji = loadPercentage < 50 ? '🟢' : loadPercentage < 80 ? '🟡' : '🔴';
  statusIndicators += `${loadEmoji} **Carga del Sistema:** ${loadPercentage.toFixed(0)}%\n`;

  // Estado del staff
  if (metrics.staffStats) {
    const staffRatio = metrics.staffStats.total > 0 ? (metrics.staffStats.online / metrics.staffStats.total) * 100 : 0;
    const staffEmoji = staffRatio >= 50 ? '🟢' : staffRatio >= 25 ? '🟡' : '🔴';
    statusIndicators += `${staffEmoji} **Disponibilidad Staff:** ${staffRatio.toFixed(0)}%\n`;
  }

  // Indicador de rendimiento basado en datos reales
  if (metrics.performance && metrics.performance.avgResponseTime) {
    const responseEmoji = metrics.performance.avgResponseTime < 4 ? '🟢' : metrics.performance.avgResponseTime < 12 ? '🟡' : '🔴';
    statusIndicators += `${responseEmoji} **Tiempo de Respuesta:** ${metrics.performance.avgResponseTime.toFixed(1)}h\n`;
  }

  // Alertas basadas en datos más antiguos
  if (metrics.oldestTicket && metrics.oldestTicket.createdAt) {
    const ageHours = Math.floor((new Date().getTime() - new Date(metrics.oldestTicket.createdAt).getTime()) / (1000 * 60 * 60));
    if (ageHours > 24) {
      statusIndicators += `🚨 **Alerta:** Ticket sin atender >${ageHours}h\n`;
    }
  }

  // Indicador de datos reales
  statusIndicators += `🗃️ **Fuente:** PostgreSQL Database (datos reales)\n`;

  embed.addFields({
    name: '⚡ Indicadores de Estado',
    value: statusIndicators || '🟢 Sistema funcionando normalmente',
    inline: false
  });

  embed.setFooter({
    text: `Dashboard de datos reales • ${metrics.totalActiveTickets || 0} tickets activos • PostgreSQL`,
    iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
  });

  return embed;
}

// Funciones auxiliares
function getPeriodoText(periodo: string): string {
  switch (periodo) {
    case 'today': return 'Hoy';
    case 'week': return 'Esta Semana';
    case 'month': return 'Este Mes';
    default: return 'Tiempo Real';
  }
}

function getCategoryDisplayName(categoria: string): string {
  const categories: { [key: string]: string } = {
    tech_support: '🔧 Soporte Técnico',
    billing_support: '💳 Facturación',
    general_support: '💬 Consulta General',
    bug_report: '🐛 Reporte de Bug',
    partnership: '🤝 Partnership'
  };
  return categories[categoria] || categoria;
}

function getCategoryFromName(name: string): string {
  const mapping: { [key: string]: string } = {
    'Soporte Técnico': 'tech_support',
    'Technical Support': 'tech_support',
    'Facturación': 'billing_support',
    'Billing': 'billing_support',
    'Consulta General': 'general_support',
    'General Inquiry': 'general_support',
    'Reporte de Bug': 'bug_report',
    'Bug Report': 'bug_report',
    'Partnership': 'partnership'
  };
  return mapping[name] || 'general_support';
}

function getCategoryEmoji(category: string): string {
  const emojis: { [key: string]: string } = {
    tech_support: '🔧',
    billing_support: '💳',
    general_support: '💬',
    bug_report: '🐛',
    partnership: '🤝'
  };
  return emojis[category] || '📄';
}