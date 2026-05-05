// Servicio para logging de tickets en base de datos PostgreSQL
import axios from 'axios';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://backend:3001';
const BOT_INTERNAL_API_KEY = process.env.BOT_INTERNAL_API_KEY;

interface TicketData {
  channelId: string;
  guildId: string;
  userId: string;
  category: string;
  language: string;
  subject?: string;
}

interface TicketActionData {
  ticketId: string;
  userId: string;
  action: string;
  details?: any;
}

interface TicketMessageData {
  ticketId: string;
  messageId: string;
  userId: string;
  content: string;
  isStaff: boolean;
}

class TicketLogger {
  private static instance: TicketLogger;

  static getInstance(): TicketLogger {
    if (!TicketLogger.instance) {
      TicketLogger.instance = new TicketLogger();
    }
    return TicketLogger.instance;
  }

  private async makeRequest(endpoint: string, data: any) {
    try {
      const response = await axios.post(`${BACKEND_API_URL}/api${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${BOT_INTERNAL_API_KEY}`,
          'X-Internal-Request': 'true',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Error logging to ${endpoint}:`, error);
      // No throw - logging should not break the bot
      return null;
    }
  }

  private async makePutRequest(endpoint: string, data: any) {
    try {
      const response = await axios.put(`${BACKEND_API_URL}/api${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${BOT_INTERNAL_API_KEY}`,
          'X-Internal-Request': 'true',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating ${endpoint}:`, error);
      // No throw - logging should not break the bot
      return null;
    }
  }

  // Log ticket creation
  async logTicketCreated(data: TicketData): Promise<string | null> {
    console.log(`📝 Logging ticket creation: ${data.channelId} (${data.category})`);
    
    const result = await this.makeRequest('/tickets', {
      channelId: data.channelId,
      guildId: data.guildId,
      userId: data.userId,
      category: data.category,
      language: data.language,
      subject: data.subject,
      status: 'open',
      priority: 'normal'
    });

    if (result?.ticket?.id) {
      console.log(`✅ Ticket logged with ID: ${result.ticket.id}`);
      return result.ticket.id;
    }
    
    return null;
  }

  // Log ticket action (claim, close, priority change, etc.)
  async logTicketAction(data: TicketActionData): Promise<void> {
    console.log(`📝 Logging ticket action: ${data.action} on ticket ${data.ticketId}`);
    
    await this.makeRequest('/tickets/actions', {
      ticketId: data.ticketId,
      userId: data.userId,
      action: data.action,
      details: data.details
    });
  }

  // Log ticket message
  async logTicketMessage(data: TicketMessageData): Promise<void> {
    console.log(`📝 Logging ticket message: ${data.messageId}`);
    
    await this.makeRequest('/tickets/messages', {
      ticketId: data.ticketId,
      messageId: data.messageId,
      userId: data.userId,
      content: data.content.substring(0, 2000), // Limit content length
      isStaff: data.isStaff
    });
  }

  // Update ticket status
  async updateTicketStatus(channelId: string, updates: {
    status?: string;
    priority?: string;
    claimedBy?: string;
    closedBy?: string;
  }): Promise<void> {
    console.log(`📝 Updating ticket status: ${channelId}`, updates);
    
    await this.makePutRequest('/tickets/update', {
      channelId,
      ...updates
    });
  }

  // Get ticket by channel ID
  async getTicketByChannelId(channelId: string): Promise<any> {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/api/tickets/channel/${channelId}`, {
        headers: {
          'Authorization': `Bearer ${BOT_INTERNAL_API_KEY}`,
          'X-Internal-Request': 'true'
        },
        timeout: 5000
      });
      return response.data.ticket;
    } catch (error) {
      console.error(`❌ Error getting ticket by channel:`, error);
      return null;
    }
  }

  // Get metrics data for dashboard
  async getMetrics(filters: {
    period?: string;
    category?: string;
    guildId: string;
  }): Promise<any> {
    try {
      const params = new URLSearchParams({
        guildId: filters.guildId,
        ...(filters.period && { period: filters.period }),
        ...(filters.category && { category: filters.category })
      });

      const response = await axios.get(`${BACKEND_API_URL}/api/tickets/metrics?${params}`, {
        headers: {
          'Authorization': `Bearer ${BOT_INTERNAL_API_KEY}`,
          'X-Internal-Request': 'true'
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Error getting metrics:`, error);
      return null;
    }
  }

  // Helper: Extract ticket ID from channel topic
  extractTicketIdFromTopic(topic: string): string | null {
    const match = topic.match(/Ticket ID: ([a-z0-9]+)/);
    return match ? match[1] : null;
  }

  // Helper: Determine if user is staff
  isStaffMember(member: any): boolean {
    if (!member || !member.roles) return false;
    
    const staffRoles = [
      'Admin', 'Moderator', 'Support Team', 'Tech Support', 
      'Billing Support', 'Development Team', 'Management', 'Staff', 'Support'
    ];
    
    return member.roles.cache.some((role: any) => staffRoles.includes(role.name));
  }

  // Helper: Get category from custom ID or topic
  getCategoryFromCustomId(customId: string): string {
    const parts = customId.split('_');
    if (parts.length >= 3) {
      return parts.slice(2, -1).join('_');
    }
    return 'general_support';
  }
}

// Export singleton instance
export const ticketLogger = TicketLogger.getInstance();

// Helper functions for easy access
export async function logTicketCreated(data: TicketData): Promise<string | null> {
  return ticketLogger.logTicketCreated(data);
}

export async function logTicketAction(data: TicketActionData): Promise<void> {
  return ticketLogger.logTicketAction(data);
}

export async function logTicketMessage(data: TicketMessageData): Promise<void> {
  return ticketLogger.logTicketMessage(data);
}

export async function updateTicketStatus(channelId: string, updates: any): Promise<void> {
  return ticketLogger.updateTicketStatus(channelId, updates);
}

export async function getTicketMetrics(filters: any): Promise<any> {
  return ticketLogger.getMetrics(filters);
}