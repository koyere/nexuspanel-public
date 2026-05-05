// ========================================================================
// 🎯 SIMPLE DISCORD PRESET APPLICATOR 
// ========================================================================
const fs = require('fs');

// Check if we're in the right environment
try {
    const Discord = require('discord.js');
    console.log('✅ Discord.js available');
} catch (error) {
    console.log('❌ Discord.js not available, will use axios for REST API calls');
}

// Configuration
const GUILD_ID = '1397236537829363773';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ ERROR: DISCORD_BOT_TOKEN not found');
    process.exit(1);
}

// Load preset - adjust path based on where file is
let preset;
try {
    preset = JSON.parse(fs.readFileSync('/tmp/Serv_DC_Minepack.json', 'utf8'));
    console.log('📋 Preset loaded for:', preset.server_name);
} catch (error) {
    console.error('❌ Error loading preset:', error.message);
    process.exit(1);
}

// Since discord.js might not be available in this context, 
// let's use the axios library to make direct Discord API calls
const axios = require('axios');

const API_BASE = 'https://discord.com/api/v10';
const headers = {
    'Authorization': `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json'
};

// Permission mapping to Discord values
const PERMISSION_MAP = {
    'ADMINISTRATOR': '8',
    'MANAGE_MESSAGES': '8192',
    'SEND_MESSAGES': '2048',
    'READ_MESSAGES': '1024'
};

// Convert hex to integer
function hexToInt(hex) {
    return parseInt(hex.replace('#', ''), 16);
}

async function applyPreset() {
    try {
        console.log('🚀 Starting Discord Preset Application...');
        console.log('🎯 Target Guild:', GUILD_ID);
        
        // Step 1: Get guild info
        console.log('\\n1️⃣ Getting guild information...');
        const guildResponse = await axios.get(`${API_BASE}/guilds/${GUILD_ID}`, { headers });
        const guild = guildResponse.data;
        console.log('✅ Connected to guild:', guild.name);
        
        // Step 2: Update guild name if needed
        console.log('\\n2️⃣ Updating server name...');
        if (guild.name !== preset.server_name) {
            await axios.patch(`${API_BASE}/guilds/${GUILD_ID}`, {
                name: preset.server_name
            }, { headers });
            console.log('✅ Server name updated to:', preset.server_name);
        } else {
            console.log('ℹ️ Server name already correct');
        }
        
        // Step 3: Get existing roles
        console.log('\\n3️⃣ Getting existing roles...');
        const rolesResponse = await axios.get(`${API_BASE}/guilds/${GUILD_ID}/roles`, { headers });
        const existingRoles = rolesResponse.data;
        console.log(`ℹ️ Found ${existingRoles.length} existing roles`);
        
        // Step 4: Create roles
        console.log('\\n4️⃣ Creating roles...');
        for (const roleData of preset.roles) {
            const existingRole = existingRoles.find(r => r.name === roleData.name);
            
            if (!existingRole) {
                try {
                    const rolePayload = {
                        name: roleData.name,
                        color: hexToInt(roleData.color),
                        permissions: PERMISSION_MAP[roleData.permissions] || '0'
                    };
                    
                    await axios.post(`${API_BASE}/guilds/${GUILD_ID}/roles`, rolePayload, { headers });
                    console.log(`  ✅ Created role: ${roleData.name} (${roleData.color})`);
                    
                    // Rate limiting - wait a bit
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.log(`  ⚠️ Failed to create role ${roleData.name}:`, error.response?.data?.message || error.message);
                }
            } else {
                console.log(`  ℹ️ Role already exists: ${roleData.name}`);
            }
        }
        
        // Step 5: Get existing channels
        console.log('\\n5️⃣ Getting existing channels...');
        const channelsResponse = await axios.get(`${API_BASE}/guilds/${GUILD_ID}/channels`, { headers });
        const existingChannels = channelsResponse.data;
        console.log(`ℹ️ Found ${existingChannels.length} existing channels`);
        
        // Step 6: Create categories and channels
        console.log('\\n6️⃣ Creating categories and channels...');
        
        for (const categoryData of preset.categories) {
            console.log(`\\n📂 Processing category: ${categoryData.name}`);
            
            // Check if category exists
            let category = existingChannels.find(c => c.type === 4 && c.name === categoryData.name);
            
            if (!category) {
                try {
                    const categoryPayload = {
                        name: categoryData.name,
                        type: 4 // Category channel type
                    };
                    
                    const categoryResponse = await axios.post(`${API_BASE}/guilds/${GUILD_ID}/channels`, categoryPayload, { headers });
                    category = categoryResponse.data;
                    existingChannels.push(category); // Add to our cache
                    console.log(`  ✅ Created category: ${categoryData.name}`);
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.log(`  ⚠️ Failed to create category ${categoryData.name}:`, error.response?.data?.message || error.message);
                    continue;
                }
            } else {
                console.log(`  ℹ️ Category already exists: ${categoryData.name}`);
            }
            
            // Create channels in category
            for (const channelData of categoryData.channels) {
                const existingChannel = existingChannels.find(c => 
                    c.name === channelData.name && c.parent_id === category.id
                );
                
                if (!existingChannel) {
                    try {
                        const channelPayload = {
                            name: channelData.name,
                            type: 0, // Text channel
                            parent_id: category.id
                        };
                        
                        // Add permission overwrites for private channels
                        if (channelData.private) {
                            channelPayload.permission_overwrites = [
                                {
                                    id: guild.id, // @everyone role ID is same as guild ID
                                    type: 0, // Role type
                                    deny: '1024' // VIEW_CHANNEL permission
                                }
                            ];
                        }
                        
                        await axios.post(`${API_BASE}/guilds/${GUILD_ID}/channels`, channelPayload, { headers });
                        console.log(`    ✅ Created channel: ${channelData.name}`);
                        
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                    } catch (error) {
                        console.log(`    ⚠️ Failed to create channel ${channelData.name}:`, error.response?.data?.message || error.message);
                    }
                } else {
                    console.log(`    ℹ️ Channel already exists: ${channelData.name}`);
                }
            }
        }
        
        console.log('\\n🎉 ✅ PRESET APPLICATION COMPLETED!');
        console.log('📊 Summary:');
        console.log(`   🎭 Roles: ${preset.roles.length} defined`);
        console.log(`   📁 Categories: ${preset.categories.length} defined`);
        console.log(`   📝 Channels: ${preset.categories.reduce((sum, cat) => sum + cat.channels.length, 0)} defined`);
        console.log('\\n✅ MinePack server preset applied successfully!');
        
    } catch (error) {
        console.error('❌ ERROR during preset application:', error.response?.data || error.message);
    }
}

// Run the application
applyPreset().then(() => {
    console.log('\\n🏁 Script completed');
}).catch(error => {
    console.error('❌ Script failed:', error);
});