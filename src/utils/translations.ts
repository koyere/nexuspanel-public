// Sistema de traducciones para tickets del bot Discord
// /opt/nexus-panel/bot/src/utils/translations.ts

export type Language = 'es' | 'en';

export const TICKET_TRANSLATIONS = {
  es: {
    // Panel principal
    panel: {
      title: '🎫 Centro de Soporte - Nexus Panel',
      description: `**¡Bienvenido al sistema de tickets de Nexus Panel!**\n\n` +
        `Selecciona la categoría que mejor describa tu consulta para crear un ticket privado. ` +
        `Nuestro equipo de soporte te asistirá lo antes posible.\n\n` +
        `**⏱️ Tiempo de respuesta:**\n` +
        `• 🔴 Crítico: < 1 hora\n` +
        `• 🟡 Alto: < 4 horas\n` +
        `• 🟢 Normal: < 24 horas\n\n` +
        `**📋 Antes de crear un ticket:**\n` +
        `• Revisa nuestras [FAQ](https://docs.nexus-panel.com)\n` +
        `• Asegúrate de tener toda la información relevante\n` +
        `• Un ticket por problema para mejor seguimiento`,
      footer: 'Nexus Panel Support System • Powered by Discord',
      languageSelect: '🌐 Selecciona tu idioma preferido:'
    },
    
    // Categorías de tickets
    categories: {
      tech_support: {
        name: '🔧 Soporte Técnico',
        description: 'Problemas con el bot, panel web o configuración',
        buttonLabel: 'Soporte Técnico'
      },
      billing_support: {
        name: '💳 Facturación',
        description: 'Problemas con pagos, suscripciones o reembolsos',
        buttonLabel: 'Facturación'
      },
      general_support: {
        name: '💬 Consulta General',
        description: 'Preguntas generales sobre Nexus Panel',
        buttonLabel: 'Consulta General'
      },
      bug_report: {
        name: '🐛 Reporte de Bug',
        description: 'Reportar errores o comportamientos inesperados',
        buttonLabel: 'Reportar Bug'
      },
      partnership: {
        name: '🤝 Partnership',
        description: 'Propuestas de colaboración y partnerships',
        buttonLabel: 'Partnership'
      }
    },

    // Mensajes del sistema
    messages: {
      ticketCreated: '✅ Ticket Creado Exitosamente',
      ticketExists: '⚠️ Ticket Ya Existente',
      ticketClosed: '🔒 Ticket Cerrado',
      noPermissions: '❌ Sin Permisos',
      error: '❌ Error',
      welcome: '¡Bienvenido a tu ticket de soporte!',
      teamAssigned: 'Equipo asignado:',
      category: 'Categoría:',
      priority: 'Prioridad:',
      ticketInfo: '🎫 Información del Ticket',
      user: 'Usuario:',
      created: 'Creado:',
      status: 'Estado:',
      pending: '🟡 Pendiente',
      instructions: '📝 Instrucciones:',
      helpTips: '💡 Consejos para una Mejor Asistencia',
      nextSteps: 'Próximos pasos:',
      thankYou: '¡Gracias por usar Nexus Panel Support!'
    },

    // Instrucciones y consejos
    instructions: {
      describe: '• Describe tu consulta con el mayor detalle posible',
      screenshots: '• Incluye capturas de pantalla si es necesario',
      professional: '• Mantén la conversación profesional y respetuosa',
      patient: '• Sé paciente, te responderemos lo antes posible',
      specific: '🔍 **Sé específico:** Describe exactamente qué estás intentando hacer',
      evidence: '📸 **Adjunta evidencia:** Capturas de pantalla o videos ayudan mucho',
      ids: '🔢 **Proporciona IDs:** Guild ID, User ID, o cualquier código relevante',
      timing: '⏰ **Horarios:** Menciona cuándo ocurrió el problema',
      browser: '🌐 **Navegador/Dispositivo:** Si es un problema de la web'
    },

    // Botones
    buttons: {
      close: 'Cerrar Ticket',
      claim: 'Reclamar',
      highPriority: 'Alta Prioridad',
      transcript: 'Transcript',
      spanish: '🇪🇸 Español',
      english: '🇺🇸 English'
    },

    // Errores
    errors: {
      alreadyExists: 'Ya tienes un ticket abierto',
      useExisting: 'Por favor, utiliza tu ticket existente o ciérralo antes de crear uno nuevo.',
      tryAgain: 'Inténtalo nuevamente en unos momentos',
      contactStaff: 'Contacta directamente a un staff',
      checkPermissions: 'Verifica que tengas permisos en el servidor',
      persistentIssue: 'Si el problema persiste, menciona a un administrador.'
    },

    // Tiempos de respuesta
    responseTime: {
      high: '< 4 horas',
      normal: '< 24 horas',
      low: '< 48 horas'
    },

    // Comandos - Roles Temporales
    commands: {
      temporalRoles: {
        days: 'días',
        hours: 'horas',
        minutes: 'minutos',
        noRoles: '⏰ Sin Roles Temporales',
        noRolesDescription: 'Actualmente no tienes ningún rol temporal activo. Los roles temporales aparecerán aquí cuando compres acceso temporal a roles en el servidor.',
        activeRolesTitle: '⏰ Tus Roles Temporales Activos',
        expiringSoon: '⚠️ ¡Expira pronto!',
        expiresIn: 'Expira en:',
        purchasedOn: 'Comprado:'
      }
    }
  },

  en: {
    // Main panel
    panel: {
      title: '🎫 Support Center - Nexus Panel',
      description: `**Welcome to the Nexus Panel ticket system!**\n\n` +
        `Select the category that best describes your inquiry to create a private ticket. ` +
        `Our support team will assist you as soon as possible.\n\n` +
        `**⏱️ Response time:**\n` +
        `• 🔴 Critical: < 1 hour\n` +
        `• 🟡 High: < 4 hours\n` +
        `• 🟢 Normal: < 24 hours\n\n` +
        `**📋 Before creating a ticket:**\n` +
        `• Check our [FAQ](https://docs.nexus-panel.com)\n` +
        `• Make sure you have all relevant information\n` +
        `• One ticket per issue for better tracking`,
      footer: 'Nexus Panel Support System • Powered by Discord',
      languageSelect: '🌐 Select your preferred language:'
    },
    
    // Ticket categories
    categories: {
      tech_support: {
        name: '🔧 Technical Support',
        description: 'Issues with bot, web panel or configuration',
        buttonLabel: 'Technical Support'
      },
      billing_support: {
        name: '💳 Billing',
        description: 'Payment, subscription or refund issues',
        buttonLabel: 'Billing'
      },
      general_support: {
        name: '💬 General Inquiry',
        description: 'General questions about Nexus Panel',
        buttonLabel: 'General Inquiry'
      },
      bug_report: {
        name: '🐛 Bug Report',
        description: 'Report errors or unexpected behavior',
        buttonLabel: 'Report Bug'
      },
      partnership: {
        name: '🤝 Partnership',
        description: 'Collaboration and partnership proposals',
        buttonLabel: 'Partnership'
      }
    },

    // System messages
    messages: {
      ticketCreated: '✅ Ticket Created Successfully',
      ticketExists: '⚠️ Existing Ticket',
      ticketClosed: '🔒 Ticket Closed',
      noPermissions: '❌ No Permissions',
      error: '❌ Error',
      welcome: 'Welcome to your support ticket!',
      teamAssigned: 'Assigned team:',
      category: 'Category:',
      priority: 'Priority:',
      ticketInfo: '🎫 Ticket Information',
      user: 'User:',
      created: 'Created:',
      status: 'Status:',
      pending: '🟡 Pending',
      instructions: '📝 Instructions:',
      helpTips: '💡 Tips for Better Assistance',
      nextSteps: 'Next steps:',
      thankYou: 'Thank you for using Nexus Panel Support!'
    },

    // Instructions and tips
    instructions: {
      describe: '• Describe your inquiry in as much detail as possible',
      screenshots: '• Include screenshots if necessary',
      professional: '• Keep the conversation professional and respectful',
      patient: '• Be patient, we will respond as soon as possible',
      specific: '🔍 **Be specific:** Describe exactly what you are trying to do',
      evidence: '📸 **Attach evidence:** Screenshots or videos help a lot',
      ids: '🔢 **Provide IDs:** Guild ID, User ID, or any relevant code',
      timing: '⏰ **Timing:** Mention when the problem occurred',
      browser: '🌐 **Browser/Device:** If it\'s a web-related issue'
    },

    // Buttons
    buttons: {
      close: 'Close Ticket',
      claim: 'Claim',
      highPriority: 'High Priority',
      transcript: 'Transcript',
      spanish: '🇪🇸 Español',
      english: '🇺🇸 English'
    },

    // Errors
    errors: {
      alreadyExists: 'You already have an open ticket',
      useExisting: 'Please use your existing ticket or close it before creating a new one.',
      tryAgain: 'Try again in a few moments',
      contactStaff: 'Contact a staff member directly',
      checkPermissions: 'Verify that you have permissions on the server',
      persistentIssue: 'If the issue persists, mention an administrator.'
    },

    // Response times
    responseTime: {
      high: '< 4 hours',
      normal: '< 24 hours',
      low: '< 48 hours'
    },

    // Commands - Temporal Roles
    commands: {
      temporalRoles: {
        days: 'days',
        hours: 'hours',
        minutes: 'minutes',
        noRoles: '⏰ No Temporal Roles',
        noRolesDescription: 'You currently have no active temporal roles. Temporal roles will appear here when you purchase temporary access to roles on the server.',
        activeRolesTitle: '⏰ Your Active Temporal Roles',
        expiringSoon: '⚠️ Expiring soon!',
        expiresIn: 'Expires in:',
        purchasedOn: 'Purchased:'
      }
    }
  }
};

// Función para obtener traducciones
export function getTranslation(language: Language, key: string): string {
  const keys = key.split('.');
  let value: any = TICKET_TRANSLATIONS[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback al español si no encuentra la traducción
      value = TICKET_TRANSLATIONS.es;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return `[Missing translation: ${key}]`;
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : `[Invalid translation: ${key}]`;
}

// Función para detectar idioma del servidor
export function detectServerLanguage(guildId: string): Language {
  // Para el servidor de soporte de Nexus Panel, usar español por defecto
  if (guildId === '1396972223054479494') {
    return 'es';
  }
  
  // Para otros servidores, podrías implementar lógica adicional
  // Por ahora, español por defecto
  return 'es';
}

// Función para obtener prioridad en texto
export function getPriorityText(priority: string, language: Language): string {
  switch (priority) {
    case 'high': return language === 'es' ? '🔴 Alta' : '🔴 High';
    case 'normal': return language === 'es' ? '🟡 Normal' : '🟡 Normal';
    case 'low': return language === 'es' ? '🟢 Baja' : '🟢 Low';
    default: return language === 'es' ? '🟡 Normal' : '🟡 Normal';
  }
}

// Función para obtener tiempo de respuesta
export function getResponseTime(priority: string, language: Language): string {
  return getTranslation(language, `responseTime.${priority}`);
}