// ✅ SAFETY FIRST: Servicio de protección crítica contra eliminación de canales
// Este servicio previene eliminaciones accidentales que podrían destruir la credibilidad

interface ProtectionConfig {
  // Guilds donde NUNCA se debe permitir auto-delete
  protectedGuilds: string[];
  
  // Requiere confirmación explícita del owner para eliminar canales
  requireOwnerConfirmation: boolean;
  
  // Modo dry-run: solo simula, nunca elimina realmente
  dryRunMode: boolean;
  
  // Máximo de canales que se pueden eliminar por día
  maxDeletionsPerDay: number;
  
  // Nombres de canales que NUNCA se deben eliminar
  protectedChannelNames: string[];
  
  // Tipos de canales que NUNCA se deben eliminar
  protectedChannelTypes: string[];
}

interface DeletionAttempt {
  channelId: string;
  channelName: string;
  guildId: string;
  reason: string;
  timestamp: Date;
  approved: boolean;
  approvedBy?: string;
}

export class ChannelProtectionService {
  private static instance: ChannelProtectionService;
  private config: ProtectionConfig;
  private deletionHistory: DeletionAttempt[] = [];
  
  private constructor() {
    this.config = {
      // ✅ SEGURIDAD MÁXIMA: Nexus Support Guild está PROTEGIDO
      protectedGuilds: [
        '1396972223054479494' // Nexus-Panel™ Support
      ],
      
      // ✅ SEGURIDAD: Requiere confirmación de owner
      requireOwnerConfirmation: true,
      
      // ✅ SEGURIDAD: Modo DRY-RUN por defecto hasta configuración explícita
      dryRunMode: true,
      
      // ✅ SEGURIDAD: Máximo 2 eliminaciones por día
      maxDeletionsPerDay: 2,
      
      // ✅ SEGURIDAD: Canales protegidos por nombre
      protectedChannelNames: [
        'general',
        'announcements', 
        'rules',
        'welcome',
        'logs',
        'support',
        'registro-tickets',
        'tickets-logs'
      ],
      
      // ✅ SEGURIDAD: Tipos de canales protegidos
      protectedChannelTypes: [
        'GUILD_VOICE',
        'GUILD_STAGE_VOICE',
        'GUILD_CATEGORY',
        'GUILD_FORUM'
      ]
    };
  }

  public static getInstance(): ChannelProtectionService {
    if (!ChannelProtectionService.instance) {
      ChannelProtectionService.instance = new ChannelProtectionService();
    }
    return ChannelProtectionService.instance;
  }

  /**
   * ✅ VERIFICACIÓN CRÍTICA: ¿Se puede eliminar este canal?
   */
  public canDeleteChannel(
    channelId: string, 
    channelName: string, 
    guildId: string,
    channelType: string,
    reason: string
  ): { allowed: boolean; reason: string; requiresConfirmation: boolean } {
    
    // ✅ EXCEPCIÓN ESPECIAL: Permitir eliminación de tickets cerrados
    if (reason.includes('Ticket cerrado por') || reason.includes('Auto-close')) {
      console.log(`🎫 EXCEPCIÓN DE TICKET: Permitiendo eliminación de ticket "${channelName}" - Razón: ${reason}`);
      return {
        allowed: true,
        reason: 'Eliminación de ticket cerrado permitida (excepción especial)',
        requiresConfirmation: false
      };
    }
    
    // ✅ PROTECCIÓN 1: Guild protegido (para canales NO-ticket)
    if (this.config.protectedGuilds.includes(guildId)) {
      console.log(`🛡️ PROTECCIÓN: Guild ${guildId} está en lista de protegidos`);
      return {
        allowed: false,
        reason: 'Guild está en lista de protección crítica',
        requiresConfirmation: false
      };
    }
    
    // ✅ PROTECCIÓN 2: Nombre de canal protegido
    const isProtectedName = this.config.protectedChannelNames.some(name => 
      channelName.toLowerCase().includes(name.toLowerCase())
    );
    
    if (isProtectedName) {
      console.log(`🛡️ PROTECCIÓN: Canal "${channelName}" tiene nombre protegido`);
      return {
        allowed: false,
        reason: `Canal con nombre protegido: ${channelName}`,
        requiresConfirmation: false
      };
    }
    
    // ✅ PROTECCIÓN 3: Tipo de canal protegido
    if (this.config.protectedChannelTypes.includes(channelType)) {
      console.log(`🛡️ PROTECCIÓN: Canal tipo ${channelType} está protegido`);
      return {
        allowed: false,
        reason: `Tipo de canal protegido: ${channelType}`,
        requiresConfirmation: false
      };
    }
    
    // ✅ PROTECCIÓN 4: Límite de eliminaciones diarias
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayDeletions = this.deletionHistory.filter(attempt => 
      attempt.approved && 
      attempt.guildId === guildId &&
      attempt.timestamp >= today
    ).length;
    
    if (todayDeletions >= this.config.maxDeletionsPerDay) {
      console.log(`🛡️ PROTECCIÓN: Límite diario alcanzado (${todayDeletions}/${this.config.maxDeletionsPerDay})`);
      return {
        allowed: false,
        reason: `Límite diario de eliminaciones alcanzado: ${todayDeletions}/${this.config.maxDeletionsPerDay}`,
        requiresConfirmation: false
      };
    }
    
    // ✅ PROTECCIÓN 5: Modo DRY-RUN activo
    if (this.config.dryRunMode) {
      console.log(`🛡️ DRY-RUN: Simulando eliminación de "${channelName}" por: ${reason}`);
      return {
        allowed: false,
        reason: 'Sistema en modo DRY-RUN - solo simulación',
        requiresConfirmation: false
      };
    }
    
    // ✅ PROTECCIÓN 6: Requiere confirmación de owner
    if (this.config.requireOwnerConfirmation) {
      console.log(`🛡️ CONFIRMACIÓN: Eliminación de "${channelName}" requiere aprobación del owner`);
      return {
        allowed: false,
        reason: 'Requiere confirmación explícita del owner del servidor',
        requiresConfirmation: true
      };
    }
    
    // Si pasa todas las protecciones
    return {
      allowed: true,
      reason: 'Eliminación permitida después de verificaciones de seguridad',
      requiresConfirmation: false
    };
  }

  /**
   * ✅ REGISTRO: Intentar eliminación con protecciones
   */
  public attemptDeletion(
    channelId: string,
    channelName: string, 
    guildId: string,
    channelType: string,
    reason: string,
    approvedBy?: string
  ): DeletionAttempt {
    
    const check = this.canDeleteChannel(channelId, channelName, guildId, channelType, reason);
    
    const attempt: DeletionAttempt = {
      channelId,
      channelName,
      guildId,
      reason,
      timestamp: new Date(),
      approved: check.allowed,
      approvedBy
    };
    
    this.deletionHistory.push(attempt);
    
    // Mantener solo últimos 100 registros
    if (this.deletionHistory.length > 100) {
      this.deletionHistory = this.deletionHistory.slice(-100);
    }
    
    console.log(`📋 REGISTRO ELIMINACIÓN:`, {
      canal: channelName,
      permitido: check.allowed,
      razón: check.reason,
      requiereConfirmación: check.requiresConfirmation
    });
    
    return attempt;
  }

  /**
   * ✅ CONFIGURACIÓN: Actualizar protecciones (solo admin)
   */
  public updateConfig(newConfig: Partial<ProtectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`🔧 CONFIGURACIÓN ACTUALIZADA:`, this.config);
  }

  /**
   * ✅ ESTADÍSTICAS: Obtener historial de eliminaciones
   */
  public getDeletionHistory(guildId?: string): DeletionAttempt[] {
    if (guildId) {
      return this.deletionHistory.filter(attempt => attempt.guildId === guildId);
    }
    return [...this.deletionHistory];
  }

  /**
   * ✅ CONFIGURACIÓN: Obtener configuración actual
   */
  public getConfig(): ProtectionConfig {
    return { ...this.config };
  }

  /**
   * ✅ EMERGENCIA: Activar protección total (deshabilita todas las eliminaciones)
   */
  public activateEmergencyProtection(): void {
    this.config.dryRunMode = true;
    this.config.requireOwnerConfirmation = true;
    this.config.maxDeletionsPerDay = 0;
    
    console.log(`🚨 PROTECCIÓN DE EMERGENCIA ACTIVADA - TODAS LAS ELIMINACIONES DESHABILITADAS`);
  }
}

// Export singleton
export const channelProtection = ChannelProtectionService.getInstance();