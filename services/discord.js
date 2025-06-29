const { Client, GatewayIntentBits } = require('discord.js');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

// Discord configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// Connect to Discord
if (DISCORD_TOKEN) {
  client.login(DISCORD_TOKEN).catch(console.error);
}

// Sync user roles with Discord
async function syncDiscordRoles(discordId, roles) {
  if (!DISCORD_TOKEN || !GUILD_ID) {
    throw new Error('Discord configuration not set up');
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(discordId);

    // Get Discord role IDs from the roles
    const discordRoleIds = roles
      .map(role => role.discordRoleId)
      .filter(id => id); // Remove null/undefined values

    // Remove all current roles except @everyone
    const rolesToRemove = member.roles.cache
      .filter(role => role.id !== guild.id) // Don't remove @everyone
      .map(role => role.id);

    // Add new roles
    await member.roles.add(discordRoleIds);
    
    // Remove old roles
    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove);
    }

    console.log(`Synced roles for Discord user ${discordId}`);
  } catch (error) {
    console.error(`Failed to sync roles for Discord user ${discordId}:`, error);
    throw error;
  }
}

// Ban user from Discord
async function banFromDiscord(discordId, reason) {
  if (!DISCORD_TOKEN || !GUILD_ID) {
    throw new Error('Discord configuration not set up');
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.ban(discordId, { reason });

    console.log(`Banned Discord user ${discordId} for reason: ${reason}`);
  } catch (error) {
    console.error(`Failed to ban Discord user ${discordId}:`, error);
    throw error;
  }
}

// Unban user from Discord
async function unbanFromDiscord(discordId) {
  if (!DISCORD_TOKEN || !GUILD_ID) {
    throw new Error('Discord configuration not set up');
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.unban(discordId);

    console.log(`Unbanned Discord user ${discordId}`);
  } catch (error) {
    console.error(`Failed to unban Discord user ${discordId}:`, error);
    throw error;
  }
}

// Get Discord server information
async function getServerInfo() {
  if (!DISCORD_TOKEN || !GUILD_ID) {
    throw new Error('Discord configuration not set up');
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    
    return {
      name: guild.name,
      memberCount: guild.memberCount,
      roleCount: guild.roles.cache.size,
      connected: true
    };
  } catch (error) {
    console.error('Failed to get Discord server info:', error);
    throw error;
  }
}

// Get Discord roles
async function getDiscordRoles() {
  if (!DISCORD_TOKEN || !GUILD_ID) {
    throw new Error('Discord configuration not set up');
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const roles = guild.roles.cache
      .filter(role => role.id !== guild.id) // Exclude @everyone
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        permissions: role.permissions.toArray()
      }))
      .sort((a, b) => b.position - a.position);

    return roles;
  } catch (error) {
    console.error('Failed to get Discord roles:', error);
    throw error;
  }
}

// Check if Discord is connected
function isDiscordConnected() {
  return client.isReady();
}

// Event handlers
client.on('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

module.exports = {
  syncDiscordRoles,
  banFromDiscord,
  unbanFromDiscord,
  getServerInfo,
  getDiscordRoles,
  isDiscordConnected
}; 