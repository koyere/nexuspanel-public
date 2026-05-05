// ARQUITECTURA COMPLETA DEL SISTEMA DE COMANDOS ADMINISTRATIVOS
// NEXUS PANEL SUPPORT SERVER EXCLUSIVE

export const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';

/**
 * 🏢 COMANDOS EXCLUSIVOS PARA SERVIDOR ADMINISTRATIVO
 */
export const ADMIN_COMMANDS = {
  // 🎫 SISTEMA DE TICKETS PROFESIONAL
  TICKET_SYSTEM: {
    command: 'nexus-ticket',
    subcommands: {
      'setup': 'Configurar sistema de tickets',
      'assign': 'Asignar ticket a staff',
      'escalate': 'Escalar a tier superior',
      'close': 'Cerrar ticket con resumen',
      'stats': 'Estadísticas de tickets'
    },
    permissions: ['🛠️ Soporte', '👑 Admin']
  },

  // 📊 DASHBOARD DE MÉTRICAS
  METRICS_DASHBOARD: {
    command: 'nexus-metrics',
    subcommands: {
      'realtime': 'Métricas en tiempo real',
      'revenue': 'Dashboard de ingresos',
      'users': 'Estadísticas de usuarios',
      'performance': 'Performance del sistema',
      'alerts': 'Alertas y notificaciones'
    },
    permissions: ['👑 Admin', '📊 Analytics']
  },

  // 🔍 INVESTIGACIÓN DE USUARIOS
  USER_LOOKUP: {
    command: 'nexus-lookup',
    subcommands: {
      'user': 'Investigar cuenta de usuario',
      'subscription': 'Estado de suscripción',
      'billing': 'Historial de pagos',
      'guild': 'Información de servidor',
      'ban-history': 'Historial de sanciones'
    },
    permissions: ['🛠️ Soporte', '👑 Admin']
  },

  // ⚡ ACCIONES ADMINISTRATIVAS
  ADMIN_ACTIONS: {
    command: 'nexus-admin',
    subcommands: {
      'ban-guild': 'Suspender servidor cliente',
      'limit-plan': 'Aplicar límites de plan',
      'reset-data': 'Resetear datos de usuario',
      'emergency': 'Acciones de emergencia',
      'maintenance': 'Modo mantenimiento'
    },
    permissions: ['👑 Admin']
  },

  // 🚨 SISTEMA DE ESCALACIÓN
  ESCALATION_SYSTEM: {
    command: 'nexus-escalate',
    subcommands: {
      'tier1-to-tier2': 'Escalar a Tier 2',
      'tier2-to-manager': 'Escalar a Manager',
      'emergency-response': 'Respuesta de emergencia',
      'priority-high': 'Alta prioridad',
      'auto-assign': 'Asignación automática'
    },
    permissions: ['🎯 Tier 1 Support', '💎 Tier 2 Support', '👨‍💼 Support Manager']
  }
};

/**
 * 👥 COMANDOS LIMITADOS PARA CLIENTES EN SERVIDOR SOPORTE
 */
export const CLIENT_COMMANDS = {
  // 🎟️ TICKETS SIMPLIFICADOS
  TICKET_CREATE: {
    command: 'ticket',
    subcommands: {
      'create': 'Crear nuevo ticket',
      'status': 'Ver estado de mis tickets',
      'close': 'Cerrar mi ticket'
    },
    permissions: ['@everyone']
  },

  // 📈 INFORMACIÓN PERSONAL
  MY_INFO: {
    command: 'my',
    subcommands: {
      'subscription': 'Ver mi plan actual',
      'earnings': 'Ver mis ganancias',
      'servers': 'Mis servidores conectados',
      'support-history': 'Historial de soporte'
    },
    permissions: ['@everyone']
  },

  // 🆘 AYUDA Y SOPORTE
  HELP_SYSTEM: {
    command: 'help',
    subcommands: {
      'setup': 'Ayuda de configuración',
      'billing': 'Ayuda con facturación',
      'technical': 'Ayuda técnica',
      'contact': 'Contactar soporte'
    },
    permissions: ['@everyone']
  }
};

/**
 * 🤖 COMANDOS PÚBLICOS (TODOS LOS SERVIDORES)
 */
export const PUBLIC_COMMANDS = {
  // 🛒 SISTEMA DE COMPRAS
  SHOP_SYSTEM: {
    command: 'shop',
    description: 'Ver roles disponibles para compra',
    permissions: ['@everyone']
  },

  // 🎁 SISTEMA DE BUNDLES
  BUNDLE_SYSTEM: {
    command: 'bundles',
    description: 'Ver paquetes de roles disponibles',
    permissions: ['@everyone']
  },

  // 📊 ANALYTICS BÁSICAS
  ANALYTICS_BASIC: {
    command: 'analytics',
    subcommands: {
      'basic': 'Estadísticas básicas del servidor',
      'members': 'Información de miembros',
      'activity': 'Actividad del servidor'
    },
    permissions: ['@everyone']
  }
};

/**
 * 🔐 SISTEMA DE VERIFICACIÓN CONTEXTUAL
 */
export class CommandContextManager {
  
  /**
   * Verificar si el comando puede ejecutarse en el guild actual
   */
  static canExecuteCommand(guildId: string, command: string, userRoles: string[]): boolean {
    // Comandos administrativos solo en servidor soporte
    if (this.isAdminCommand(command)) {
      return guildId === NEXUS_SUPPORT_GUILD_ID && this.hasAdminPermissions(userRoles);
    }
    
    // Comandos de cliente solo en servidor soporte
    if (this.isClientCommand(command)) {
      return guildId === NEXUS_SUPPORT_GUILD_ID;
    }
    
    // Comandos públicos en cualquier servidor
    return this.isPublicCommand(command);
  }

  /**
   * Obtener comandos disponibles según contexto
   */
  static getAvailableCommands(guildId: string, userRoles: string[]): string[] {
    const commands: string[] = [];
    
    // Siempre disponibles (comandos públicos)
    commands.push(...Object.keys(PUBLIC_COMMANDS));
    
    // Solo en servidor soporte
    if (guildId === NEXUS_SUPPORT_GUILD_ID) {
      commands.push(...Object.keys(CLIENT_COMMANDS));
      
      // Solo para staff
      if (this.hasAdminPermissions(userRoles)) {
        commands.push(...Object.keys(ADMIN_COMMANDS));
      }
    }
    
    return commands;
  }

  /**
   * Verificar permisos de administración
   */
  private static hasAdminPermissions(userRoles: string[]): boolean {
    const adminRoles = [
      '👑 Admin',
      '🛠️ Soporte', 
      '🎯 Tier 1 Support',
      '💎 Tier 2 Support',
      '🔧 Technical Support',
      '💰 Billing Support',
      '👨‍💼 Support Manager'
    ];
    
    return userRoles.some(role => adminRoles.includes(role));
  }

  private static isAdminCommand(command: string): boolean {
    return Object.keys(ADMIN_COMMANDS).some(key => 
      ADMIN_COMMANDS[key as keyof typeof ADMIN_COMMANDS].command === command
    );
  }

  private static isClientCommand(command: string): boolean {
    return Object.keys(CLIENT_COMMANDS).some(key => 
      CLIENT_COMMANDS[key as keyof typeof CLIENT_COMMANDS].command === command
    );
  }

  private static isPublicCommand(command: string): boolean {
    return Object.keys(PUBLIC_COMMANDS).some(key => 
      PUBLIC_COMMANDS[key as keyof typeof PUBLIC_COMMANDS].command === command
    );
  }
}

/**
 * 🎫 SISTEMA DE TICKETS PROFESIONAL
 */
export interface TicketSystem {
  // Categorías dinámicas
  categories: {
    free_tickets: string;      // Categoría para tickets gratuitos
    premium_tickets: string;   // Categoría para tickets premium
    escalated_tickets: string; // Categoría para tickets escalados
    closed_tickets: string;    // Archivo de tickets cerrados
  };
  
  // Configuración de asignación automática
  autoAssignment: {
    tier1: string[];  // IDs de usuarios Tier 1
    tier2: string[];  // IDs de usuarios Tier 2  
    managers: string[]; // IDs de managers
  };
  
  // SLA (Service Level Agreement)
  sla: {
    response_time_free: number;    // Tiempo respuesta free (horas)
    response_time_premium: number; // Tiempo respuesta premium (horas)
    escalation_time: number;       // Tiempo auto-escalación (horas)
  };
}

/**
 * 📊 DASHBOARD DE MÉTRICAS EN TIEMPO REAL
 */
export interface MetricsDashboard {
  // Métricas del sistema
  systemMetrics: {
    active_users: number;
    total_revenue: number;
    tickets_open: number;
    servers_connected: number;
    response_time_avg: number;
  };
  
  // Métricas de soporte
  supportMetrics: {
    tickets_today: number;
    resolution_rate: number;
    satisfaction_score: number;
    staff_online: number;
  };
  
  // Alertas activas
  alerts: {
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }[];
}

export default {
  ADMIN_COMMANDS,
  CLIENT_COMMANDS, 
  PUBLIC_COMMANDS,
  CommandContextManager
};