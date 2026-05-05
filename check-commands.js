// Script para verificar estado de comandos registrados
const { REST, Routes } = require('discord.js');
require('dotenv').config({ path: '../.env' });

const NEXUS_SUPPORT_GUILD_ID = '1396972223054479494';
const BOT_CLIENT_ID = '1382922621506818098';

async function checkCommands() {
  try {
    console.log('🔍 Verificando comandos registrados...');
    
    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
    
    // Verificar comandos del guild
    const guildCommands = await rest.get(
      Routes.applicationGuildCommands(BOT_CLIENT_ID, NEXUS_SUPPORT_GUILD_ID)
    );
    
    console.log(`📊 Comandos encontrados en guild (${NEXUS_SUPPORT_GUILD_ID}): ${guildCommands.length}`);
    
    if (guildCommands.length > 0) {
      guildCommands.forEach(cmd => {
        console.log(`  ✅ /${cmd.name}: ${cmd.description}`);
        console.log(`     ID: ${cmd.id} | Version: ${cmd.version}`);
      });
    } else {
      console.log('  ❌ No se encontraron comandos registrados');
    }
    
    // Verificar comandos globales (por si acaso)
    const globalCommands = await rest.get(
      Routes.applicationCommands(BOT_CLIENT_ID)
    );
    
    console.log(`\n🌐 Comandos globales: ${globalCommands.length}`);
    if (globalCommands.length > 0) {
      globalCommands.forEach(cmd => {
        console.log(`  🌍 /${cmd.name}: ${cmd.description}`);
      });
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error al verificar comandos:', error);
    console.error('Stack:', error.stack);
  }
}

checkCommands();