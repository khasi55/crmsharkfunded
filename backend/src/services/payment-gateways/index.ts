import { SharkPayGateway } from './sharkpay';
import { PaymidGateway } from './paymid';
import { EPayGateway } from './epay';
import { CregisGateway } from './cregis';
import { PaymentGateway } from './types';

/**
 * Payment Gateway Registry
 * Centralized management of all payment gateways
 */
class PaymentGatewayRegistry {
    private gateways: Map<string, PaymentGateway>;

    constructor() {
        this.gateways = new Map();
        this.registerGateways();
    }

    private registerGateways() {
        const sharkpay = new SharkPayGateway();
        const paymid = new PaymidGateway();
        const epay = new EPayGateway();
        const cregis = new CregisGateway();

        this.gateways.set('sharkpay', sharkpay);
        this.gateways.set('paymid', paymid);
        this.gateways.set('epay', epay);
        this.gateways.set('cregis', cregis);
    }

    getGateway(name: string): PaymentGateway | undefined {
        return this.gateways.get(name.toLowerCase());
    }

    getAllGateways(): string[] {
        return Array.from(this.gateways.keys());
    }
}

// Singleton instance
export const paymentGatewayRegistry = new PaymentGatewayRegistry();

export { SharkPayGateway, PaymidGateway, EPayGateway, CregisGateway };
export * from './types';
