
-- Update constraint to allow 'monitor' severity
ALTER TABLE advanced_risk_flags DROP CONSTRAINT IF EXISTS advanced_risk_flags_severity_check;
ALTER TABLE advanced_risk_flags ADD CONSTRAINT advanced_risk_flags_severity_check CHECK (severity IN ('warning', 'breach', 'critical', 'monitor'));
