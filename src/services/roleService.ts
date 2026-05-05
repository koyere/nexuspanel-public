// nexus-panel/bot/src/services/roleService.ts

import axios from 'axios';

/**
 * 🎭 ROLE SERVICE
 * Handles API communication for individual role purchases with promotion code support
 */

export interface RoleCheckoutResponse {
  url: string;
  provider: string;
  orderId: string;
  promotionApplied?: {
    code: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
  };
}

export interface PromotionValidationResponse {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  discount?: {
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    discountAmount: number;
    finalAmount: number;
    maxDiscount?: number;
  };
  validationDetails?: {
    codeExists: boolean;
    isActive: boolean;
    notExpired: boolean;
    withinUsageLimit: boolean;
    userNotExceeded: boolean;
    meetsMinimumAmount: boolean;
    applicableToItem: boolean;
    userNotExcluded: boolean;
    ipNotBlocked: boolean;
    rateNotExceeded: boolean;
  };
}

export class RoleService {
  private backendUrl: string;
  private apiKey: string;

  constructor() {
    this.backendUrl = process.env.BACKEND_API_URL || 'https://api.nexus-panel.com';
    this.apiKey = process.env.BOT_INTERNAL_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('❌ BOT_INTERNAL_API_KEY not configured in RoleService');
    }
  }

  /**
   * Create a PayPal checkout session for a role with optional promotion code
   */
  async createRoleCheckout(
    roleId: string,
    userId: string,
    guildId: string,
    promotionCode?: string,
    paymentProvider?: 'paypal' | 'stripe'
  ): Promise<RoleCheckoutResponse> {
    try {
      // Default to PayPal if not specified for backward compatibility
      const provider = paymentProvider || 'paypal';
      console.log(`[INFO] Creating role checkout: roleId=${roleId}, userId=${userId}, guildId=${guildId}, provider=${provider}, promotionCode=${promotionCode || 'none'}`);

      const endpoint = `/api/checkout/${roleId}`;
      const requestBody: any = {
        userId,
        guildId,
        provider
      };

      // Add promotion code if provided
      if (promotionCode && promotionCode.trim()) {
        requestBody.promotionCode = promotionCode.trim().toUpperCase();
      }
      
      const response = await axios.post<RoleCheckoutResponse>(
        `${this.backendUrl}${endpoint}`,
        requestBody,
        {
          timeout: 15000, // 15 seconds for checkout
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Nexus-Panel-Bot/1.0',
          }
        }
      );

      const checkout = response.data;
      
      console.log(`[SUCCESS] Role checkout created: orderId=${checkout.orderId}, url=${checkout.url}`);
      if (checkout.promotionApplied) {
        console.log(`[PROMO] Applied code ${checkout.promotionApplied.code}: $${checkout.promotionApplied.originalAmount} → $${checkout.promotionApplied.finalAmount} (saved $${checkout.promotionApplied.discountAmount})`);
      }
      
      return checkout;
    } catch (error: any) {
      console.error(`[ERROR] Failed to create role checkout:`, {
        roleId,
        userId,
        guildId,
        promotionCode,
        error: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });
      
      // Extract meaningful error message
      let errorMessage = 'Failed to create checkout session';
      if (error.response?.data?.details) {
        errorMessage = error.response.data.details; // Promotion validation error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate a promotion code for a specific role (for preview/validation)
   */
  async validatePromotionCode(
    guildId: string,
    promotionCode: string,
    userId: string,
    roleId: string,
    roleName: string,
    originalAmount: number
  ): Promise<PromotionValidationResponse> {
    try {
      const endpoint = `/api/promotions/${guildId}/validate`;
      
      const response = await axios.post(
        `${this.backendUrl}${endpoint}`,
        {
          code: promotionCode.trim().toUpperCase(),
          userId,
          itemType: 'ROLE',
          itemId: roleId,
          itemName: roleName,
          originalAmount
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Nexus-Panel-Bot/1.0',
          }
        }
      );

      console.log(`[DEBUG] Backend response for ${promotionCode}:`, response.data);

      // Handle backend response format: { success: true, data: { discount, validationDetails } }
      if (response.data.success && response.data.data) {
        return {
          isValid: true,
          discount: response.data.data.discount,
          validationDetails: response.data.data.validationDetails
        };
      } else {
        // Handle error response: { success: false, error, message, validationDetails }
        return {
          isValid: false,
          errorCode: response.data.error || 'VALIDATION_FAILED',
          errorMessage: response.data.message || 'Código promocional no válido',
          validationDetails: response.data.validationDetails
        };
      }
    } catch (error: any) {
      console.error(`[ERROR] Failed to validate promotion code:`, {
        guildId,
        promotionCode,
        userId,
        roleId,
        error: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });
      
      // If backend returns 400 with error details, parse them
      if (error.response?.status === 400 && error.response?.data) {
        return {
          isValid: false,
          errorCode: error.response.data.error || 'VALIDATION_ERROR',
          errorMessage: error.response.data.message || 'Código promocional no válido',
          validationDetails: error.response.data.validationDetails
        };
      }
      
      return {
        isValid: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Unable to validate promotion code'
      };
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
}