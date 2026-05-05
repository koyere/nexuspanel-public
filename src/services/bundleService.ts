// nexus-panel/bot/src/services/bundleService.ts

import axios from 'axios';
import { API_ENDPOINTS } from '../constants/bundleConstants';
import { bundleLogger, logBundleApi, logBundleError, logBundleSuccess, logBundleCheckout, startBundleTimer } from '../utils/bundleLogger';

/**
 * 🎁 BUNDLE SERVICE
 * Handles all API communication with the backend for bundle operations
 */

// Bundle data structures (matching backend API)
export interface BundleRole {
  role: {
    id: string;
    name: string;
    color?: number;
    price?: string;
  };
}

export interface BundleGuild {
  id: string;
  name: string;
  icon: string;
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  finalPrice: string;
  individualTotal: string;
  discount: number;
  isActive: boolean;
  maxPurchases?: number;
  validUntil?: string;
  guildId: string;
  createdAt: string;
  roles: BundleRole[];
  guild?: BundleGuild;
  _count?: {
    purchases: number;
  };
}

export interface CheckoutResponse {
  url: string;
  provider: string;
  orderId: string;
  bundleInfo: {
    id: string;
    name: string;
    finalPrice: string;
    discount: number;
    rolesCount: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export class BundleService {
  private backendUrl: string;
  private apiKey: string;

  constructor() {
    this.backendUrl = process.env.BACKEND_API_URL || 'https://api.nexus-panel.com';
    this.apiKey = process.env.BOT_INTERNAL_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('❌ BOT_INTERNAL_API_KEY not configured in BundleService');
    }
  }

  /**
   * Get all active bundles for a guild
   */
  async getGuildBundles(guildId: string): Promise<Bundle[]> {
    const timer = startBundleTimer('getGuildBundles');
    const context = { guildId };
    
    try {
      const endpoint = API_ENDPOINTS.GET_GUILD_BUNDLES(guildId);
      logBundleApi(endpoint, context);
      
      const response = await axios.get<ApiResponse<Bundle[]>>(
        `${this.backendUrl}${endpoint}`,
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'User-Agent': 'Nexus-Panel-Bot/1.0',
          }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'API returned error');
      }

      const bundles = response.data.data || [];
      
      logBundleSuccess('getGuildBundles', {
        ...context,
        bundleCount: bundles.length,
      });
      
      bundleLogger.logBundleData(bundles, context);
      
      return bundles;
    } catch (error: any) {
      logBundleError('getGuildBundles', {
        ...context,
        error: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });
      
      throw new Error(`Failed to fetch bundles: ${error.message}`);
    } finally {
      timer();
    }
  }

  /**
   * Get detailed information about a specific bundle
   */
  async getBundleDetails(bundleId: string): Promise<Bundle> {
    const timer = startBundleTimer('getBundleDetails');
    const context = { bundleId };
    
    try {
      const endpoint = API_ENDPOINTS.GET_BUNDLE_DETAILS(bundleId);
      logBundleApi(endpoint, context);
      
      const response = await axios.get<ApiResponse<Bundle>>(
        `${this.backendUrl}${endpoint}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'Nexus-Panel-Bot/1.0',
          }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Bundle not found');
      }

      const bundle = response.data.data;
      
      logBundleSuccess('getBundleDetails', {
        ...context,
        bundleName: bundle.name,
        finalPrice: bundle.finalPrice,
        rolesCount: bundle.roles.length,
      });
      
      return bundle;
    } catch (error: any) {
      logBundleError('getBundleDetails', {
        ...context,
        error: error.message,
        responseStatus: error.response?.status,
      });
      
      throw new Error(`Failed to fetch bundle details: ${error.message}`);
    } finally {
      timer();
    }
  }

  /**
   * Create a PayPal checkout session for a bundle
   */
  async createBundleCheckout(bundleId: string, userId: string, guildId: string): Promise<CheckoutResponse> {
    const timer = startBundleTimer('createBundleCheckout');
    const context = { bundleId, userId, guildId };
    
    try {
      logBundleCheckout('start', context);
      
      const endpoint = API_ENDPOINTS.CREATE_CHECKOUT(bundleId);
      logBundleApi(endpoint, context);
      
      const response = await axios.post<CheckoutResponse>(
        `${this.backendUrl}${endpoint}`,
        {
          userId,
          guildId,
        },
        {
          timeout: 15000, // 15 seconds for checkout
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Nexus-Panel-Bot/1.0',
          }
        }
      );

      const checkout = response.data;
      
      logBundleCheckout('success', {
        ...context,
        orderId: checkout.orderId,
        bundleName: checkout.bundleInfo.name,
        finalPrice: checkout.bundleInfo.finalPrice,
      });
      
      return checkout;
    } catch (error: any) {
      logBundleCheckout('error', {
        ...context,
        error: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });
      
      throw new Error(`Failed to create checkout: ${error.message}`);
    } finally {
      timer();
    }
  }

  /**
   * Format price for display
   */
  formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numPrice);
  }

  /**
   * Calculate savings amount
   */
  calculateSavings(bundle: Bundle): number {
    const individual = parseFloat(bundle.individualTotal);
    const final = parseFloat(bundle.finalPrice);
    return individual - final;
  }

  /**
   * Check if bundle is expired
   */
  isBundleExpired(bundle: Bundle): boolean {
    if (!bundle.validUntil) return false;
    return new Date(bundle.validUntil) < new Date();
  }

  /**
   * Check if bundle has purchase limit
   */
  isPurchaseLimitReached(bundle: Bundle): boolean {
    if (!bundle.maxPurchases) return false;
    return (bundle._count?.purchases || 0) >= bundle.maxPurchases;
  }

  /**
   * Get bundle availability status
   */
  getBundleStatus(bundle: Bundle): 'available' | 'expired' | 'limit_reached' | 'inactive' {
    if (!bundle.isActive) return 'inactive';
    if (this.isBundleExpired(bundle)) return 'expired';
    if (this.isPurchaseLimitReached(bundle)) return 'limit_reached';
    return 'available';
  }
}