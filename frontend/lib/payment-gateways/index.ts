import { PaymentGateway } from './types';
import { SharkPayGateway } from './sharkpay';
import { PaymidGateway } from './paymid';
import { EPayGateway } from './epay';

// Payment Gateway Factory
const gateways: Record<string, PaymentGateway> = {
    sharkpay: new SharkPayGateway(),
    paymid: new PaymidGateway(),
    epay: new EPayGateway(),
};

export function getPaymentGateway(name: string): PaymentGateway {
    const gateway = gateways[name.toLowerCase()];
    if (!gateway) {
        throw new Error(`Payment gateway '${name}' not found. Available: ${getAvailableGateways().join(', ')}`);
    }
    return gateway;
}

export function getAvailableGateways(): string[] {
    return Object.keys(gateways);
}

export { SharkPayGateway, PaymidGateway, EPayGateway };
export * from './types';
