-- ===============================================
-- SPRAWDŹ STRUKTURĘ WSZYSTKICH TABEL
-- ===============================================
-- Uruchom to w Supabase SQL Editor aby zobaczyć
-- dokładną strukturę każdej tabeli
-- ===============================================

-- 1. COACHES (już znane)
SELECT 
  'COACHES' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'coaches'
ORDER BY ordinal_position;

-- 2. CLIENTS (już znane)
SELECT 
  'CLIENTS' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- 3. TRAINING_SESSIONS (już znane)
SELECT 
  'TRAINING_SESSIONS' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'training_sessions'
ORDER BY ordinal_position;

-- 4. ATTENDANCE (już znane)
SELECT 
  'ATTENDANCE' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attendance'
ORDER BY ordinal_position;

-- 5. PAYMENT_HISTORY (już znane)
SELECT 
  'PAYMENT_HISTORY' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payment_history'
ORDER BY ordinal_position;

-- ===============================================
-- NOWE TABELE (do sprawdzenia)
-- ===============================================

-- 6. TRANSACTIONS (duża tabela - 160 kB)
SELECT 
  'TRANSACTIONS' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- Policz rekordy w transactions
SELECT 'TRANSACTIONS' as table_name, COUNT(*) as record_count FROM transactions;

-- Zobacz przykładowe dane (pierwsze 5 rekordów)
SELECT * FROM transactions LIMIT 5;


-- 7. CLIENT_MEASUREMENTS (pomiary ciała!)
SELECT 
  'CLIENT_MEASUREMENTS' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'client_measurements'
ORDER BY ordinal_position;

-- Policz pomiary
SELECT 'CLIENT_MEASUREMENTS' as table_name, COUNT(*) as record_count FROM client_measurements;

-- Zobacz przykładowe pomiary
SELECT * FROM client_measurements LIMIT 5;


-- 8. CLIENT_NOTES (notatki o klientach)
SELECT 
  'CLIENT_NOTES' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'client_notes'
ORDER BY ordinal_position;

-- Policz notatki
SELECT 'CLIENT_NOTES' as table_name, COUNT(*) as record_count FROM client_notes;

-- Zobacz przykładowe notatki
SELECT * FROM client_notes LIMIT 5;


-- 9. PAYMENT_REMINDERS (przypomnienia o płatnościach)
SELECT 
  'PAYMENT_REMINDERS' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payment_reminders'
ORDER BY ordinal_position;

-- Policz przypomnienia
SELECT 'PAYMENT_REMINDERS' as table_name, COUNT(*) as record_count FROM payment_reminders;

-- Zobacz przykładowe przypomnienia
SELECT * FROM payment_reminders LIMIT 5;


-- 10. SESSION_TEMPLATES (szablony sesji)
SELECT 
  'SESSION_TEMPLATES' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'session_templates'
ORDER BY ordinal_position;

-- Policz szablony
SELECT 'SESSION_TEMPLATES' as table_name, COUNT(*) as record_count FROM session_templates;

-- Zobacz przykładowe szablony
SELECT * FROM session_templates LIMIT 5;


-- ===============================================
-- PODSUMOWANIE WSZYSTKICH DANYCH
-- ===============================================

SELECT 
  'coaches' as table_name,
  COUNT(*) as records,
  pg_size_pretty(pg_total_relation_size('coaches')) as size
FROM coaches

UNION ALL

SELECT 
  'clients',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('clients'))
FROM clients

UNION ALL

SELECT 
  'training_sessions',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('training_sessions'))
FROM training_sessions

UNION ALL

SELECT 
  'attendance',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('attendance'))
FROM attendance

UNION ALL

SELECT 
  'payment_history',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('payment_history'))
FROM payment_history

UNION ALL

SELECT 
  'transactions',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('transactions'))
FROM transactions

UNION ALL

SELECT 
  'client_measurements',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('client_measurements'))
FROM client_measurements

UNION ALL

SELECT 
  'client_notes',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('client_notes'))
FROM client_notes

UNION ALL

SELECT 
  'payment_reminders',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('payment_reminders'))
FROM payment_reminders

UNION ALL

SELECT 
  'session_templates',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('session_templates'))
FROM session_templates

ORDER BY records DESC;


-- ===============================================
-- RELACJE - JAK POŁĄCZONE SĄ NOWE TABELE?
-- ===============================================

SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'transactions',
    'client_measurements', 
    'client_notes',
    'payment_reminders',
    'session_templates'
  )
ORDER BY from_table, from_column;


-- ===============================================
-- GOTOWE!
-- ===============================================
-- Teraz wiem dokładnie co masz w bazie danych
-- i mogę pomóc dodać nowe funkcje!
-- ===============================================







