// ✅ RECOVERY: Script de recuperación de canales eliminados accidentalmente
import { Client, ChannelType, PermissionFlagsBits } from 'discord.js';

interface DeletedChannelInfo {
  name: string;
  type: ChannelType;
  categoryId?: string;
  position: number;
  permissions?: any[];
  topic?: string;
  reason: string;
}

export class ChannelRecoveryService {
  private client: Client;
  
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * ✅ RECUPERAR: Canales eliminados del Discord de soporte Nexus Panel
   */
  async recoverNexusSupportChannels(): Promise<void> {
    const NEXUS_GUILD_ID = '1396972223054479494';
    
    console.log('🔄 INICIANDO RECUPERACIÓN DE CANALES NEXUS PANEL SUPPORT...');
    
    try {
      const guild = await this.client.guilds.fetch(NEXUS_GUILD_ID);
      if (!guild) {
        console.error('❌ No se pudo acceder al guild de Nexus Panel');
        return;
      }

      // Canales que necesitan ser recreados basado en el incidente
      const channelsToRecover: DeletedChannelInfo[] = [
        {
          name: '🎫│ticket-premium-premium-ticket',
          type: ChannelType.GuildText,
          position: 0,
          topic: 'Canal para tickets premium - Sistema de soporte Nexus Panel',
          reason: 'Recuperación después de eliminación automática no autorizada'
        },
        {
          name: '📝│registro-tickets-tickets-logs', 
          type: ChannelType.GuildText,
          position: 1,
          topic: 'Registro y logs de todos los tickets del sistema',
          reason: 'Recuperación después de eliminación automática no autorizada'
        },
        {
          name: '🆓│ticket-gratis-free-ticket',
          type: ChannelType.GuildText,
          position: 2,
          topic: 'Canal para tickets gratuitos - Sistema de soporte Nexus Panel',
          reason: 'Recuperación después de eliminación automática no autorizada'
        }
      ];

      for (const channelInfo of channelsToRecover) {
        try {
          console.log(`🔄 Recreando canal: ${channelInfo.name}`);
          
          const newChannel = await guild.channels.create({
            name: channelInfo.name,
            type: ChannelType.GuildText,
            topic: channelInfo.topic,
            reason: channelInfo.reason,
            permissionOverwrites: [
              {
                id: guild.roles.everyone,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                deny: [PermissionFlagsBits.SendMessages]
              }
            ]
          });

          console.log(`✅ Canal recreado exitosamente: ${channelInfo.name} (ID: ${newChannel.id})`);
          
          // Enviar mensaje de bienvenida/explicación
          if (newChannel.isTextBased()) {
            const welcomeMessage = `🔄 **Canal Recuperado**\n\n` +
              `Este canal fue recreado después de una eliminación automática no autorizada.\n\n` +
              `**Fecha de recuperación**: ${new Date().toLocaleString('es-ES')}\n` +
              `**Motivo original**: Sistema de auto-close de tickets defectuoso\n` +
              `**Estado actual**: ✅ Protecciones de seguridad implementadas\n\n` +
              `El sistema ahora cuenta con múltiples capas de protección para prevenir eliminaciones accidentales.`;
              
            await newChannel.send(welcomeMessage);
          }
          
        } catch (error) {
          console.error(`❌ Error recreando canal ${channelInfo.name}:`, error);
        }
      }

      console.log('✅ RECUPERACIÓN DE CANALES COMPLETADA');
      
    } catch (error) {
      console.error('❌ Error en recuperación de canales:', error);
    }
  }

  /**
   * ✅ VERIFICAR: Qué canales faltan en un guild
   */
  async auditMissingChannels(guildId: string, expectedChannels: string[]): Promise<string[]> {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) return expectedChannels;

      const existingChannels = guild.channels.cache.map(channel => channel.name);
      const missingChannels = expectedChannels.filter(expected => 
        !existingChannels.some(existing => existing.includes(expected))
      );

      console.log(`📊 AUDITORÍA - Guild ${guild.name}:`);
      console.log(`- Canales esperados: ${expectedChannels.length}`);
      console.log(`- Canales existentes: ${existingChannels.length}`);
      console.log(`- Canales faltantes: ${missingChannels.length}`);
      
      if (missingChannels.length > 0) {
        console.log(`🚨 CANALES FALTANTES:`, missingChannels);
      }

      return missingChannels;
      
    } catch (error) {
      console.error('❌ Error en auditoría de canales:', error);
      return expectedChannels;
    }
  }

  /**
   * ✅ EMERGENCIA: Recrear canal específico con configuración completa
   */
  async emergencyChannelRestore(
    guildId: string, 
    channelName: string, 
    channelType: ChannelType = ChannelType.GuildText,
    topic?: string
  ): Promise<boolean> {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) return false;

      const restoredChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: topic || `Canal restaurado automáticamente - ${new Date().toISOString()}`,
        reason: 'Restauración de emergencia por eliminación accidental'
      });

      console.log(`🚨 CANAL RESTAURADO EN EMERGENCIA: ${channelName} (ID: ${restoredChannel.id})`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error en restauración de emergencia para ${channelName}:`, error);
      return false;
    }
  }
}