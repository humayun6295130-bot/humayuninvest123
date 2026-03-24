/**
 * Webhook Notification System
 * 
 * Provides webhook notifications for transaction events including:
 * - Payment confirmed
 * - Payment failed
 * - Payment pending
 * - Transaction reverted
 * 
 * @version 1.0.0
 * @author Investment Platform Team
 */

import {
    WebhookConfig,
    WebhookEventType,
    WebhookRetryPolicy,
    DEFAULT_WEBHOOK_CONFIG,
    BlockchainNetwork,
} from './etherscan';

import { PaymentVerificationResult } from './etherscan-payment';

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookPayload {
    event: WebhookEventType;
    timestamp: string;
    data: WebhookData;
    signature?: string;
}

export interface WebhookData {
    txHash: string;
    network: BlockchainNetwork;
    status: string;
    amount: string;
    amountFormatted: string;
    sender: string;
    recipient: string;
    confirmations: number;
    blockNumber?: number;
    blockHash?: string;
    timestamp?: number;
    userId?: string;
    metadata?: Record<string, any>;
}

export interface WebhookDeliveryResult {
    success: boolean;
    statusCode?: number;
    attempts: number;
    error?: string;
    timestamp: Date;
}

// ============================================================================
// HMAC SIGNATURE
// ============================================================================

function generateSignature(payload: string, secret: string): string {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    // Simple HMAC implementation for Node.js compatible environments
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', keyData);
    hmac.update(messageData);
    return hmac.digest('hex');
}

// ============================================================================
// WEBHOOK SENDER
// ============================================================================

class WebhookSender {
    private config: WebhookConfig;
    private deliveryHistory: Map<string, WebhookDeliveryResult[]> = new Map();
    private maxHistorySize: number = 1000;

    constructor(config: WebhookConfig) {
        this.config = config;
    }

    /**
     * Send webhook notification
     */
    async send(payload: WebhookPayload): Promise<WebhookDeliveryResult> {
        if (!this.config.enabled) {
            return {
                success: false,
                attempts: 0,
                error: 'Webhooks disabled',
                timestamp: new Date(),
            };
        }

        const maxRetries = this.config.retryPolicy.maxRetries;
        let lastError: string | undefined;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Generate signature if secret is provided
                let signature: string | undefined;
                if (this.config.secret) {
                    const payloadString = JSON.stringify(payload);
                    signature = generateSignature(payloadString, this.config.secret);
                }

                // Send webhook
                const response = await fetch(this.config.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': signature || '',
                        'X-Webhook-Event': payload.event,
                    },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(30000),
                });

                const result: WebhookDeliveryResult = {
                    success: response.ok,
                    statusCode: response.status,
                    attempts: attempt + 1,
                    timestamp: new Date(),
                };

                if (response.ok) {
                    this.recordDelivery(payload.data.txHash, result);
                    return result;
                }

                lastError = `HTTP ${response.status}: ${response.statusText}`;
            } catch (error: any) {
                lastError = error.message;

                // Wait before retry
                if (attempt < maxRetries) {
                    const delay = this.calculateRetryDelay(attempt);
                    await this.sleep(delay);
                }
            }
        }

        const result: WebhookDeliveryResult = {
            success: false,
            attempts: maxRetries + 1,
            error: lastError,
            timestamp: new Date(),
        };

        this.recordDelivery(payload.data.txHash, result);
        return result;
    }

    /**
     * Send payment confirmed webhook
     */
    async sendPaymentConfirmed(result: PaymentVerificationResult): Promise<WebhookDeliveryResult> {
        const payload: WebhookPayload = {
            event: 'payment.confirmed',
            timestamp: new Date().toISOString(),
            data: this.mapResultToData(result),
        };

        return this.send(payload);
    }

    /**
     * Send payment failed webhook
     */
    async sendPaymentFailed(result: PaymentVerificationResult): Promise<WebhookDeliveryResult> {
        const payload: WebhookPayload = {
            event: 'payment.failed',
            timestamp: new Date().toISOString(),
            data: this.mapResultToData(result),
        };

        return this.send(payload);
    }

    /**
     * Send payment pending webhook
     */
    async sendPaymentPending(result: PaymentVerificationResult): Promise<WebhookDeliveryResult> {
        const payload: WebhookPayload = {
            event: 'payment.pending',
            timestamp: new Date().toISOString(),
            data: this.mapResultToData(result),
        };

        return this.send(payload);
    }

    /**
     * Send payment duplicate webhook
     */
    async sendPaymentDuplicate(result: PaymentVerificationResult): Promise<WebhookDeliveryResult> {
        const payload: WebhookPayload = {
            event: 'payment.duplicate',
            timestamp: new Date().toISOString(),
            data: this.mapResultToData(result),
        };

        return this.send(payload);
    }

    /**
     * Send transaction reverted webhook
     */
    async sendTransactionReverted(result: PaymentVerificationResult): Promise<WebhookDeliveryResult> {
        const payload: WebhookPayload = {
            event: 'transaction.reverted',
            timestamp: new Date().toISOString(),
            data: this.mapResultToData(result),
        };

        return this.send(payload);
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private mapResultToData(result: PaymentVerificationResult): WebhookData {
        return {
            txHash: result.txHash,
            network: result.network,
            status: result.status,
            amount: result.amount,
            amountFormatted: result.amountFormatted,
            sender: result.sender,
            recipient: result.recipient,
            confirmations: result.confirmations,
            blockNumber: result.blockNumber,
            blockHash: result.blockHash,
            timestamp: result.timestamp,
            userId: result.metadata?.userId,
            metadata: result.metadata,
        };
    }

    private calculateRetryDelay(attempt: number): number {
        const baseDelay = this.config.retryPolicy.retryDelay;
        if (this.config.retryPolicy.exponentialBackoff) {
            return baseDelay * Math.pow(2, attempt);
        }
        return baseDelay;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private recordDelivery(txHash: string, result: WebhookDeliveryResult): void {
        let history = this.deliveryHistory.get(txHash) || [];
        history.push(result);

        // Trim history if needed
        if (history.length > this.maxHistorySize) {
            history = history.slice(-this.maxHistorySize);
        }

        this.deliveryHistory.set(txHash, history);
    }

    /**
     * Get delivery history for a transaction
     */
    getDeliveryHistory(txHash: string): WebhookDeliveryResult[] {
        return this.deliveryHistory.get(txHash) || [];
    }

    /**
     * Update webhook configuration
     */
    updateConfig(config: Partial<WebhookConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): WebhookConfig {
        return { ...this.config };
    }
}

// ============================================================================
// WEBHOOK MANAGER
// ============================================================================

export class WebhookManager {
    private webhooks: Map<string, WebhookSender> = new Map();
    private globalConfig: WebhookConfig;

    constructor(globalConfig?: Partial<WebhookConfig>) {
        this.globalConfig = {
            ...DEFAULT_WEBHOOK_CONFIG,
            ...globalConfig,
            url: '',
            secret: '',
        } as WebhookConfig;
    }

    /**
     * Register a webhook
     */
    registerWebhook(id: string, config: WebhookConfig): void {
        this.webhooks.set(id, new WebhookSender(config));
    }

    /**
     * Unregister a webhook
     */
    unregisterWebhook(id: string): void {
        this.webhooks.delete(id);
    }

    /**
     * Get webhook by ID
     */
    getWebhook(id: string): WebhookSender | undefined {
        return this.webhooks.get(id);
    }

    /**
     * Send event to all registered webhooks
     */
    async broadcastEvent(
        event: WebhookEventType,
        result: PaymentVerificationResult
    ): Promise<Map<string, WebhookDeliveryResult>> {
        const results = new Map<string, WebhookDeliveryResult>();

        for (const [id, webhook] of this.webhooks.entries()) {
            // Check if webhook subscribes to this event
            if (!webhook.getConfig().events.includes(event)) {
                continue;
            }

            let deliveryResult: WebhookDeliveryResult;

            switch (event) {
                case 'payment.confirmed':
                    deliveryResult = await webhook.sendPaymentConfirmed(result);
                    break;
                case 'payment.failed':
                    deliveryResult = await webhook.sendPaymentFailed(result);
                    break;
                case 'payment.pending':
                    deliveryResult = await webhook.sendPaymentPending(result);
                    break;
                case 'payment.duplicate':
                    deliveryResult = await webhook.sendPaymentDuplicate(result);
                    break;
                case 'transaction.reverted':
                    deliveryResult = await webhook.sendTransactionReverted(result);
                    break;
                default:
                    deliveryResult = {
                        success: false,
                        attempts: 0,
                        error: 'Unknown event type',
                        timestamp: new Date(),
                    };
            }

            results.set(id, deliveryResult);
        }

        return results;
    }

    /**
     * List all registered webhooks
     */
    listWebhooks(): Array<{ id: string; config: WebhookConfig }> {
        const list: Array<{ id: string; config: WebhookConfig }> = [];

        for (const [id, webhook] of this.webhooks.entries()) {
            list.push({
                id,
                config: webhook.getConfig(),
            });
        }

        return list;
    }

    /**
     * Clear all webhooks
     */
    clearWebhooks(): void {
        this.webhooks.clear();
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a webhook sender with custom configuration
 */
export function createWebhookSender(config: WebhookConfig): WebhookSender {
    return new WebhookSender(config);
}

/**
 * Create a webhook manager
 */
export function createWebhookManager(config?: Partial<WebhookConfig>): WebhookManager {
    return new WebhookManager(config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default WebhookManager;
