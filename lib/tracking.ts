/**
 * Unified Tracking Utility for SharkFunded
 * Handles Axon, Meta Pixel (fbq), and Google Tag Manager (dataLayer)
 */

type TrackingEvent = 'Lead' | 'Purchase' | 'AddToCart' | 'InitiateCheckout' | 'ViewContent' | 'Search' | 'Contact' | 'CompleteRegistration' | string;

interface TrackingData {
    currency?: string;
    value?: number;
    transaction_id?: string;
    items?: Array<{
        item_id: string;
        item_name: string;
        price: number;
        quantity: number;
        [key: string]: any;
    }>;
    [key: string]: any;
}

export const trackEvent = (event: TrackingEvent, data?: TrackingData) => {
    if (typeof window === 'undefined') return;

    // 1. Axon Tracking
    if ((window as any).axon) {
        try {
            // Map common events to Axon specific ones if needed
            const axonEvent = event.toLowerCase();
            (window as any).axon("track", axonEvent, data);
            console.debug(`[Tracking] Axon: ${axonEvent}`, data);
        } catch (err) {
            console.warn(`[Tracking] Axon failed:`, err);
        }
    }

    // 2. Meta Pixel (Facebook)
    if ((window as any).fbq) {
        try {
            // Meta uses standard event names (Lead, Purchase, etc.)
            (window as any).fbq('track', event, data);
            console.debug(`[Tracking] Meta Pixel: ${event}`, data);
        } catch (err) {
            console.warn(`[Tracking] Meta Pixel failed:`, err);
        }
    }

    // 3. Google Tag Manager (dataLayer)
    if ((window as any).dataLayer) {
        try {
            (window as any).dataLayer.push({
                event: event.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''), // Convert CamelCase to snake_case
                ...data
            });
            console.debug(`[Tracking] GTM DataLayer: ${event}`, data);
        } catch (err) {
            console.warn(`[Tracking] GTM failed:`, err);
        }
    }
};

/**
 * Convenience method for Lead event (Sign up)
 */
export const trackLead = (data?: any) => {
    trackEvent('Lead', data);
};

/**
 * Convenience method for Purchase event
 */
export const trackPurchase = (data: { value: number; currency: string; transaction_id: string; [key: string]: any }) => {
    trackEvent('Purchase', data);
};

/**
 * Convenience method for Lower Funnel events
 */
export const trackAddToCart = (data: any) => trackEvent('AddToCart', data);
export const trackInitiateCheckout = (data: any) => trackEvent('InitiateCheckout', data);
