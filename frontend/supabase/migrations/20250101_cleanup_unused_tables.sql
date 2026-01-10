-- ============================================================================
-- CLEANUP MIGRATION
-- ============================================================================
-- Drops tables that are no longer used by the separated Risk Engine logic.

-- 1. DROP Original Violations Table
-- Replaced by: core_risk_violations, advanced_risk_flags
DROP TABLE IF EXISTS public.risk_violations CASCADE;

-- 2. DROP Unused Optimization Tables
-- These were created for a "Live Risk State" optimization but are not
-- currently connected to the Core/Advanced engines.
DROP TABLE IF EXISTS public.risk_states CASCADE;
DROP TABLE IF EXISTS public.equity_snapshots CASCADE;

-- Note: 
-- We KEEP 'core_risk_violations' (New Core Engine)
-- We KEEP 'advanced_risk_flags' (New Advanced Engine)
-- We KEEP 'daily_stats' (Used for P&L tracking)
-- We KEEP 'trades' (Core data)
-- We KEEP 'risk_rules_config' (Configuration)
