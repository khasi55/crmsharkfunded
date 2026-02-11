-- 🛡️ SHARKFUNDED DATABASE HARDENING: ZERO-TRUST LOCKDOWN
-- Migration Date: 2026-02-11
-- Description: Addresses Supabase Linter security errors (RLS, search_path, permissive policies).

-- ==========================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE "public"."passed_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."competition_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."competitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users_staging_import" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trade_consistency_snapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."challenge_type_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."mt5_risk_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."event_entry_passes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."mt5_server_config" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. IMPLEMENT SERVICE ROLE ONLY POLICIES
-- For tables that should NEVER be accessed by public/authenticated users
-- ==========================================

-- mt5_server_config
CREATE POLICY "Service Role Only: mt5_server_config" 
ON "public"."mt5_server_config" 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- admin_users
CREATE POLICY "Service Role Only: admin_users" 
ON "public"."admin_users" 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- system_logs
CREATE POLICY "Service Role Only: system_logs" 
ON "public"."system_logs" 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- users_staging_import (High Sensitivity: contains passwords)
CREATE POLICY "Service Role Only: users_staging_import" 
ON "public"."users_staging_import" 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- ==========================================
-- 3. RESTRICT PERMISSIVE POLICIES
-- Fixing policies that were using 'USING (true)' for non-SELECT commands
-- ==========================================

-- advanced_risk_flags
DROP POLICY IF EXISTS "Service role full access" ON "public"."advanced_risk_flags";
CREATE POLICY "Service Role Only: advanced_risk_flags" 
ON "public"."advanced_risk_flags" 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- kyc_sessions
DROP POLICY IF EXISTS "Service role can update KYC sessions" ON "public"."kyc_sessions";
CREATE POLICY "Service Role Only: kyc_sessions" 
ON "public"."kyc_sessions" 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- ==========================================
-- 4. SECURE FUNCTION SEARCH PATHS
-- Prevents search-path injection attacks by fixing search_path to public
-- ==========================================

ALTER FUNCTION "public"."verify_admin_credentials" SET search_path = public;
ALTER FUNCTION "public"."increment_affiliate_commission" SET search_path = public;
ALTER FUNCTION "public"."validate_coupon" SET search_path = public;
ALTER FUNCTION "public"."get_account_type_by_name" SET search_path = public;
ALTER FUNCTION "public"."generate_order_id" SET search_path = public;
ALTER FUNCTION "public"."update_risk_state" SET search_path = public;
ALTER FUNCTION "public"."process_staging_users" SET search_path = public;
ALTER FUNCTION "public"."increment_coupon_usage" SET search_path = public;
ALTER FUNCTION "public"."handle_new_user" SET search_path = public;
ALTER FUNCTION "public"."update_kyc_sessions_updated_at" SET search_path = public;
ALTER FUNCTION "public"."sync_kyc_status_to_profile" SET search_path = public;
ALTER FUNCTION "public"."update_wallet_updated_at" SET search_path = public;

-- ==========================================
-- 5. PUBLIC READ-ONLY POLICIES
-- For tables where public/authenticated read is required
-- ==========================================

-- competitions (Public can view)
CREATE POLICY "Public Read: competitions" ON "public"."competitions" FOR SELECT USING (true);
-- competition_participants (Public can view)
CREATE POLICY "Public Read: competition_participants" ON "public"."competition_participants" FOR SELECT USING (true);
-- mt5_risk_groups (Authenticated users can see rules)
CREATE POLICY "Auth Read: mt5_risk_groups" ON "public"."mt5_risk_groups" FOR SELECT TO authenticated USING (true);
-- challenge_type_rules (Authenticated users can see rules)
CREATE POLICY "Auth Read: challenge_type_rules" ON "public"."challenge_type_rules" FOR SELECT TO authenticated USING (true);

-- LOCKDOWN COMPLETE --
