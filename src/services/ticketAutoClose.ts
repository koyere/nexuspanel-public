// Servicio para auto-cerrar tickets inactivos después de 7 días
import { 
  Client, 
  TextChannel, 
  EmbedBuilder, 
  ChannelType,
  Collection,
  Message 
} from 'discord.js';
import { logTicketAction, updateTicketStatus } from './ticketLogger';
import { channelProtection } from './channelProtection.service';

const INACTIVITY_DAYS = 7; // Días de inactividad antes de auto-cerrar
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas en millisegundos
const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';

interface TicketInfo {
  channelId: string;
  lastActivity: Date;
  language: 'es' | 'en';
  creatorId: string;
  isActive: boolean;
}

export class TicketAutoCloseService {
  private client: Client;
  private isRunning: boolean = false;
  private checkTimer?: NodeJS.Timeout;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Iniciar el servicio de auto-close
   */
  public start(): void {
    if (this.isRunning) {
      console.log('⚠️ TicketAutoCloseService ya está ejecutándose');
      return;
    }

    this.isRunning = true;
    console.log('🚀 TicketAutoCloseService iniciado - Verificación cada 24 horas');
    
    // Ejecutar inmediatamente al inicio
    this.checkInactiveTickets();
    
    // Programar verificaciones cada 24 horas
    this.checkTimer = setInterval(() => {
      this.checkInactiveTickets();
    }, CHECK_INTERVAL);
  }

  /**
   * Detener el servicio
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
    console.log('🛑 TicketAutoCloseService detenido');
  }

  /**
   * Verificar y cerrar tickets inactivos
   */
  private async checkInactiveTickets(): Promise<void> {
    try {
      console.log('🔍 Verificando tickets inactivos...');
      
      const guild = this.client.guilds.cache.get(NEXUS_SUPPORT_GUILD_ID);
      if (!guild) {
        console.log('❌ Guild de soporte no encontrado');
        return;
      }

      // Buscar todos los canales de tickets
      const ticketChannels = await this.findTicketChannels(guild);
      console.log(`📊 Encontrados ${ticketChannels.size} tickets para verificar`);

      let inactiveCount = 0;
      let closedCount = 0;

      for (const [channelId, ticketInfo] of ticketChannels) {
        const channel = guild.channels.cache.get(channelId) as TextChannel;
        if (!channel) continue;

        // Verificar última actividad
        const lastActivity = await this.getLastActivity(channel);
        const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceActivity >= INACTIVITY_DAYS) {
          inactiveCount++;
          console.log(`⏰ Ticket ${channel.name} inactivo por ${daysSinceActivity} días`);
          
          // Auto-cerrar el ticket
          const closed = await this.autoCloseTicket(channel, ticketInfo.language, daysSinceActivity);
          if (closed) closedCount++;
        }
      }

      console.log(`✅ Verificación completada: ${inactiveCount} tickets inactivos, ${closedCount} auto-cerrados`);
      
    } catch (error) {
      console.error('❌ Error en verificación de tickets inactivos:', error);
    }
  }

  /**
   * Encontrar todos los canales de tickets activos
   */
  private async findTicketChannels(guild: any): Promise<Collection<string, TicketInfo>> {
    const ticketChannels = new Collection<string, TicketInfo>();

    for (const [channelId, channel] of guild.channels.cache) {
      if (channel.type !== ChannelType.GuildText) continue;
      
      const textChannel = channel as TextChannel;
      
      // Verificar si es un canal de ticket por nombre o topic
      if (this.isTicketChannel(textChannel)) {
        const language = this.detectLanguage(textChannel);
        const creatorId = this.extractCreatorId(textChannel);
        
        ticketChannels.set(channelId, {
          channelId,
          lastActivity: new Date(), // Se actualizará con getLastActivity
          language,
          creatorId,
          isActive: true
        });
      }
    }

    return ticketChannels;
  }

  /**
   * Verificar si un canal es un ticket
   */
  private isTicketChannel(channel: TextChannel): boolean {
    const name = channel.name.toLowerCase();
    const topic = channel.topic || '';
    
    return (
      name.startsWith('ticket-') || 
      name.includes('ticket') ||
      topic.includes('Ticket de') ||
      topic.includes('Ticket ID')
    );
  }

  /**
   * Detectar idioma del ticket
   */
  private detectLanguage(channel: TextChannel): 'es' | 'en' {
    const topic = channel.topic || '';
    const name = channel.name.toLowerCase();
    
    if (topic.includes('Lang: EN') || name.includes('-en-')) return 'en';
    if (topic.includes('Lang: ES') || name.includes('-es-')) return 'es';
    
    return 'es'; // Default español
  }

  /**
   * Extraer ID del creador del ticket
   */
  private extractCreatorId(channel: TextChannel): string {
    const topic = channel.topic || '';
    const match = topic.match(/\((\d+)\)/);
    return match ? match[1] : '';
  }

  /**
   * Obtener fecha de última actividad en el canal
   */
  private async getLastActivity(channel: TextChannel): Promise<Date> {
    try {
      // Obtener los últimos 10 mensajes para analizar actividad
      const messages = await channel.messages.fetch({ limit: 10 });
      
      if (messages.size === 0) {
        // Si no hay mensajes, usar fecha de creación del canal
        return new Date(channel.createdTimestamp);
      }

      // Encontrar el último mensaje que no sea del bot
      const lastUserMessage = messages.find(msg => !msg.author.bot);
      
      if (lastUserMessage) {
        return lastUserMessage.createdAt;
      }

      // Si solo hay mensajes del bot, usar el más reciente
      const lastMessage = messages.first();
      return lastMessage ? lastMessage.createdAt : new Date(channel.createdTimestamp);
      
    } catch (error) {
      console.error(`❌ Error obteniendo última actividad para ${channel.name}:`, error);
      return new Date(channel.createdTimestamp);
    }
  }

  /**
   * Auto-cerrar un ticket inactivo
   */
  private async autoCloseTicket(channel: TextChannel, language: 'es' | 'en', daysSinceActivity: number): Promise<boolean> {
    try {
      console.log(`🔒 Auto-cerrando ticket ${channel.name} (${daysSinceActivity} días inactivo)`);

      // Crear embed de notificación
      const autoCloseEmbed = new EmbedBuilder()
        .setTitle(language === 'es' ? '🔒 Ticket Cerrado Automáticamente' : '🔒 Ticket Automatically Closed')
        .setDescription(
          language === 'es' 
            ? `**Este ticket ha sido cerrado automáticamente debido a inactividad.**\n\n` +
              `⏰ **Tiempo sin actividad:** ${daysSinceActivity} días\n` +
              `📅 **Fecha de cierre:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
              `🤖 **Cerrado por:** Sistema automático\n\n` +
              `**¿Necesitas más ayuda?**\n` +
              `• Crea un nuevo ticket usando el panel de tickets\n` +
              `• Contacta al staff si tu problema persiste\n` +
              `• Revisa nuestra [documentación](https://docs.nexus-panel.com)\n\n` +
              `**Nota:** Este cierre automático ayuda a mantener el servidor organizado.`
            : `**This ticket has been automatically closed due to inactivity.**\n\n` +
              `⏰ **Time inactive:** ${daysSinceActivity} days\n` +
              `📅 **Closure date:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
              `🤖 **Closed by:** Automatic system\n\n` +
              `**Need more help?**\n` +
              `• Create a new ticket using the ticket panel\n` +
              `• Contact staff if your issue persists\n` +
              `• Check our [documentation](https://docs.nexus-panel.com)\n\n` +
              `**Note:** This automatic closure helps keep the server organized.`
        )
        .setColor(0xff6b35)
        .setTimestamp()
        .setFooter({
          text: language === 'es' 
            ? 'Nexus Panel • Sistema de Auto-cierre'
            : 'Nexus Panel • Auto-close System',
          iconURL: channel.guild.iconURL() || undefined
        });

      // Enviar mensaje de notificación
      await channel.send({ embeds: [autoCloseEmbed] });

      // Logging en base de datos
      try {
        await logTicketAction({
          ticketId: channel.id,
          userId: 'SYSTEM',
          action: 'AUTO_CLOSE',
          details: `Ticket auto-cerrado después de ${daysSinceActivity} días de inactividad`
        });

        await updateTicketStatus(channel.id, { status: 'closed', closedBy: 'SYSTEM' });
      } catch (logError) {
        console.error('❌ Error logging auto-close:', logError);
      }

      // ✅ SAFETY FIRST: Verificación crítica de seguridad ANTES de eliminar
      const protectionCheck = channelProtection.attemptDeletion(
        channel.id,
        channel.name,
        channel.guild.id,
        channel.type.toString(),
        `Auto-close: Inactivo por ${daysSinceActivity} días`,
        'SYSTEM'
      );

      if (!protectionCheck.approved) {
        console.log(`🛡️ ELIMINACIÓN BLOQUEADA: ${channel.name} - Razón: ${protectionCheck.reason}`);
        console.log(`📊 ESTADÍSTICA: Canal "${channel.name}" marcado como cerrado pero NO eliminado por protecciones de seguridad`);
        return false; // BLOQUEAR eliminación
      }

      // Solo llegar aquí si pasa TODAS las protecciones de seguridad
      console.log(`⚠️ ADVERTENCIA CRÍTICA: Se procederá a eliminar canal "${channel.name}" en 5 segundos`);
      console.log(`🔍 RAZÓN: ${protectionCheck.reason}`);
      
      setTimeout(async () => {
        try {
          // ✅ PROTECCIÓN FINAL: Verificar una vez más antes de eliminar
          const finalCheck = channelProtection.canDeleteChannel(
            channel.id,
            channel.name, 
            channel.guild.id,
            channel.type.toString(),
            `Auto-close: Inactivo por ${daysSinceActivity} días`
          );

          if (!finalCheck.allowed) {
            console.log(`🛡️ ELIMINACIÓN BLOQUEADA EN ÚLTIMO MOMENTO: ${finalCheck.reason}`);
            return;
          }

          await channel.delete(`Auto-close: Inactivo por ${daysSinceActivity} días`);
          console.log(`✅ Canal ${channel.name} eliminado exitosamente después de verificaciones de seguridad`);
          
        } catch (deleteError) {
          console.error(`❌ Error eliminando canal ${channel.name}:`, deleteError);
        }
      }, 5000);

      return true;

    } catch (error) {
      console.error(`❌ Error auto-cerrando ticket ${channel.name}:`, error);
      return false;
    }
  }

  /**
   * Obtener estadísticas del servicio
   */
  public getStats(): { isRunning: boolean; lastCheck: string; interval: string } {
    return {
      isRunning: this.isRunning,
      lastCheck: 'En desarrollo',
      interval: `${CHECK_INTERVAL / (1000 * 60 * 60)} horas`
    };
  }

  /**
   * Forzar verificación manual (para testing)
   */
  public async forceCheck(): Promise<void> {
    console.log('🔧 Forzando verificación manual de tickets inactivos...');
    await this.checkInactiveTickets();
  }
}

// Instancia singleton
let ticketAutoCloseInstance: TicketAutoCloseService | null = null;

export function initializeTicketAutoClose(client: Client): TicketAutoCloseService {
  if (!ticketAutoCloseInstance) {
    ticketAutoCloseInstance = new TicketAutoCloseService(client);
  }
  return ticketAutoCloseInstance;
}

export function getTicketAutoCloseService(): TicketAutoCloseService | null {
  return ticketAutoCloseInstance;
}