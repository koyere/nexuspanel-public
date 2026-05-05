// Script manual para registrar comandos de Discord
const { REST, Routes } = require('discord.js');
require('dotenv').config({ path: '../.env' });

const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';

// Comandos que queremos registrar
const commands = [
  {
    name: 'nexus-test',
    description: '🧪 Test command for admin system',
    type: 1
  },
  {
    name: 'nexus-ticket-panel',
    description: '🎫 Genera el panel de tickets profesional en el canal actual',
    type: 1,
    options: [
      {
        name: 'canal',
        description: 'Canal donde generar el panel (por defecto: canal actual)',
        type: 7, // CHANNEL
        channel_types: [0], // GUILD_TEXT
        required: false
      },
      {
        name: 'idioma',
        description: 'Idioma principal del panel (detecta automáticamente si no se especifica)',
        type: 3, // STRING
        choices: [
          { name: '🇪🇸 Español', value: 'es' },
          { name: '🇺🇸 English', value: 'en' }
        ],
        required: false
      }
    ]
  },
  {
    name: 'nexus-metrics',
    description: '📊 Muestra dashboard completo de métricas del sistema de tickets',
    type: 1,
    options: [
      {
        name: 'periodo',
        description: 'Período de tiempo para las métricas',
        type: 3, // STRING
        choices: [
          { name: '📅 Hoy', value: 'today' },
          { name: '📆 Esta Semana', value: 'week' },
          { name: '🗓️ Este Mes', value: 'month' },
          { name: '📊 Tiempo Real', value: 'realtime' }
        ],
        required: false
      },
      {
        name: 'categoria',
        description: 'Filtrar métricas por categoría específica',
        type: 3, // STRING
        choices: [
          { name: '🔧 Soporte Técnico', value: 'tech_support' },
          { name: '💳 Facturación', value: 'billing_support' },
          { name: '💬 Consulta General', value: 'general_support' },
          { name: '🐛 Reporte de Bug', value: 'bug_report' },
          { name: '🤝 Partnership', value: 'partnership' }
        ],
        required: false
      }
    ]
  }
];

async function registerCommands() {
  try {
    console.log('🔄 Iniciando registro manual de comandos...');
    
    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
    const clientId = '1382922621506818098'; // Bot ID de Nexus Panel
    
    // Limpiar comandos existentes
    console.log('🧹 Limpiando comandos existentes...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, NEXUS_SUPPORT_GUILD_ID),
      { body: [] }
    );
    
    // Registrar nuevos comandos
    console.log('📝 Registrando nuevos comandos...');
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, NEXUS_SUPPORT_GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ Successfully registered ${data.length} commands:`);
    data.forEach(cmd => console.log(`  - /${cmd.name}: ${cmd.description}`));
    
    console.log('🎯 Comandos registrados para guild:', NEXUS_SUPPORT_GUILD_ID);
    console.log('⚡ Los comandos deberían estar disponibles inmediatamente');
    
  } catch (error) {
    console.error('❌ Error al registrar comandos:', error);
    if (error.code === 50001) {
      console.error('💡 Error: Bot no tiene acceso al guild o falta OAuth scope');
    }
  }
}

registerCommands();