// nexus-panel/bot/src/cluster.ts
// Entry point for ShardingManager

import { NexusShardManager } from './sharding/ShardManager';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

console.log('🤖 Nexus Panel Bot - Cluster Mode Starting...');
console.log(`📊 Sharding Enabled: ${process.env.SHARDING_ENABLED}`);
console.log(`🔧 Node Environment: ${process.env.NODE_ENV || 'development'}`);

async function main() {
  try {
    // Validate required environment variables
    if (!process.env.DISCORD_BOT_TOKEN) {
      throw new Error('DISCORD_BOT_TOKEN is required');
    }

    if (!process.env.BOT_INTERNAL_API_KEY) {
      throw new Error('BOT_INTERNAL_API_KEY is required');
    }

    // Create and start shard manager
    const shardManager = new NexusShardManager();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('📴 SIGINT received, shutting down shards gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('📴 SIGTERM received, shutting down shards gracefully...');
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception in Shard Manager:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection in Shard Manager at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Start the shard manager
    await shardManager.start();

    // Optional: Set up management HTTP server for shard stats
    if (process.env.SHARD_MANAGER_HTTP_PORT) {
      const express = require('express');
      const app = express();
      const port = parseInt(process.env.SHARD_MANAGER_HTTP_PORT);

      app.get('/health', (req: any, res: any) => {
        res.json({
          status: 'ok',
          shards: shardManager.manager.shards.size,
          timestamp: new Date().toISOString()
        });
      });

      app.get('/stats', async (req: any, res: any) => {
        try {
          const stats = await shardManager.getStats();
          res.json(stats);
        } catch (error) {
          res.status(500).json({ error: 'Failed to get stats' });
        }
      });

      app.listen(port, () => {
        console.log(`📊 Shard Manager HTTP server listening on port ${port}`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to start Nexus Panel Bot Cluster:', error);
    process.exit(1);
  }
}

// Run the cluster
main().catch((error) => {
  console.error('💥 Fatal error in main process:', error);
  process.exit(1);
});