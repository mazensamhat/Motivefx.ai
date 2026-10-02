-- Applied to the dedicated MotiveFX Supabase project during incident remediation.
-- Only idle, open transactions of the application role are affected; active queries are not.
-- Rollback: ALTER ROLE postgres IN DATABASE postgres RESET idle_in_transaction_session_timeout;
ALTER ROLE postgres IN DATABASE postgres SET idle_in_transaction_session_timeout = '60s';
