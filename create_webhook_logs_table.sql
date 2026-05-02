-- ============================================
-- WEBHOOK LOGS TABLE
-- Store all payment webhook callbacks for auditing
-- ============================================

CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Webhook Details
    event_type TEXT NOT NULL, -- 'payment.success', 'payment.failed', etc.
    gateway TEXT NOT NULL, -- 'sharkpay', 'paymid'
    
    -- Order Reference
    order_id TEXT, -- Our internal order ID (reference_id)
    gateway_order_id TEXT, -- Gateway's order ID
    
    -- Payment Details
    amount NUMERIC,
    currency TEXT DEFAULT 'INR',
    status TEXT,
    payment_method TEXT,
    
    -- Transaction Details
    utr TEXT, -- Bank transaction reference
    
    -- Raw Data
    request_headers JSONB,
    request_body JSONB NOT NULL,
    
    -- Processing
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Timestamps
    received_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON public.webhook_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_gateway_order_id ON public.webhook_logs(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_gateway ON public.webhook_logs(gateway);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON public.webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON public.webhook_logs(received_at DESC);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy (admin only)
CREATE POLICY "Webhook logs are admin only"
    ON public.webhook_logs FOR SELECT
    USING (false); -- Only accessible via service role

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Webhook logs table created successfully!';
    RAISE NOTICE '📝 All payment webhooks will be logged for auditing';
END $$;
