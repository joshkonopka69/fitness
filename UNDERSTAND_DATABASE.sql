-- ===============================================
-- FITNESSGURU - ANALIZA BAZY DANYCH
-- ===============================================
-- Ten plik pomoże Ci zrozumieć całą strukturę bazy danych
-- Uruchom te kwerendy w Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qkkmurwntbkhvbezbhcz/sql
-- ===============================================

-- ===============================================
-- 1. SPRAWDŹ WSZYSTKIE TABELE W BAZIE
-- ===============================================

SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ===============================================
-- 2. STRUKTURA GŁÓWNYCH TABEL
-- ===============================================

-- 2A. Tabela COACHES (Trenerzy/Użytkownicy aplikacji)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'coaches'
ORDER BY ordinal_position;

-- Policz trenerów
SELECT COUNT(*) as total_coaches FROM coaches;

-- Pokaż wszystkich trenerów
SELECT * FROM coaches;


-- 2B. Tabela CLIENTS (Klienci trenera)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- Statystyki klientów
SELECT 
  COUNT(*) as total_clients,
  COUNT(*) FILTER (WHERE active = true) as active_clients,
  COUNT(*) FILTER (WHERE active = false) as inactive_clients,
  ROUND(AVG(monthly_fee), 2) as avg_monthly_fee,
  SUM(monthly_fee) FILTER (WHERE active = true) as total_monthly_revenue
FROM clients;

-- Klienci pogrupowani po typie członkostwa
SELECT 
  membership_type,
  COUNT(*) as count,
  ROUND(AVG(monthly_fee), 2) as avg_fee
FROM clients
WHERE active = true
GROUP BY membership_type
ORDER BY count DESC;


-- 2C. Tabela TRAINING_SESSIONS (Sesje treningowe)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'training_sessions'
ORDER BY ordinal_position;

-- Statystyki sesji
SELECT 
  COUNT(*) as total_sessions,
  COUNT(DISTINCT session_date) as unique_dates,
  MIN(session_date) as first_session,
  MAX(session_date) as last_session
FROM training_sessions;

-- Sesje pogrupowane po typie
SELECT 
  session_type,
  COUNT(*) as count
FROM training_sessions
GROUP BY session_type
ORDER BY count DESC;


-- 2D. Tabela ATTENDANCE (Obecności na treningach)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attendance'
ORDER BY ordinal_position;

-- Statystyki obecności
SELECT 
  COUNT(*) as total_attendance_records,
  COUNT(*) FILTER (WHERE present = true) as present_count,
  COUNT(*) FILTER (WHERE present = false) as absent_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE present = true) / NULLIF(COUNT(*), 0), 2) as attendance_percentage
FROM attendance;


-- 2E. Tabela PAYMENT_HISTORY (Historia płatności od klientów)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payment_history'
ORDER BY ordinal_position;

-- Statystyki płatności
SELECT 
  COUNT(*) as total_payments,
  SUM(amount) as total_amount,
  ROUND(AVG(amount), 2) as avg_payment,
  MIN(payment_date) as first_payment,
  MAX(payment_date) as last_payment
FROM payment_history;

-- Płatności pogrupowane po metodzie
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM payment_history
GROUP BY payment_method
ORDER BY total_amount DESC;


-- ===============================================
-- 3. SYSTEM SUBSKRYPCJI (PREMIUM)
-- ===============================================

-- 3A. Sprawdź czy istnieje tabela coach_profiles (dla subskrypcji)
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'coach_profiles'
) as coach_profiles_exists;

-- 3B. Jeśli istnieje, sprawdź strukturę
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'coach_profiles'
ORDER BY ordinal_position;

-- 3C. Statystyki subskrypcji (jeśli tabela istnieje)
-- SELECT 
--   subscription_status,
--   COUNT(*) as count,
--   COUNT(*) FILTER (WHERE beta_tester = true) as beta_testers
-- FROM coach_profiles
-- GROUP BY subscription_status;


-- 3D. Sprawdź tabelę PAYMENTS (płatności za subskrypcje)
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'payments'
) as payments_table_exists;

-- Jeśli istnieje:
-- SELECT 
--   status,
--   COUNT(*) as count,
--   SUM(amount) as total_amount,
--   payment_method
-- FROM payments
-- GROUP BY status, payment_method;


-- ===============================================
-- 4. WIDOKI (VIEWS) - Gotowe raporty
-- ===============================================

-- Sprawdź wszystkie widoki
SELECT 
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public';

-- Użyj widoków (jeśli istnieją):

-- 4A. Zaległe płatności
-- SELECT * FROM overdue_payments;

-- 4B. Wskaźniki obecności klientów
-- SELECT * FROM client_attendance_rates;

-- 4C. Statystyki trenera
-- SELECT * FROM coach_statistics;

-- 4D. Podsumowanie obecności na sesjach
-- SELECT * FROM session_attendance_summary;


-- ===============================================
-- 5. FUNKCJE (FUNCTIONS) - Dostępne operacje
-- ===============================================

-- Lista wszystkich funkcji
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Przykłady użycia funkcji:

-- 5A. Sprawdź status subskrypcji (jeśli funkcja istnieje)
-- SELECT * FROM check_subscription_status('YOUR-USER-UUID');

-- 5B. Oblicz następną datę płatności (jeśli funkcja istnieje)
-- SELECT calculate_next_due_date(CURRENT_DATE);


-- ===============================================
-- 6. RELACJE MIĘDZY TABELAMI
-- ===============================================

SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY from_table, from_column;


-- ===============================================
-- 7. INDEKSY (dla wydajności)
-- ===============================================

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ===============================================
-- 8. ROW LEVEL SECURITY (RLS) - Bezpieczeństwo
-- ===============================================

-- Sprawdź które tabele mają włączone RLS
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Sprawdź polityki RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ===============================================
-- 9. PRZYKŁADOWE ZAPYTANIA BIZNESOWE
-- ===============================================

-- 9A. TOP 10 najlepszych klientów (najwięcej płatności)
SELECT 
  c.name,
  c.membership_type,
  COUNT(ph.id) as payment_count,
  SUM(ph.amount) as total_paid,
  c.monthly_fee
FROM clients c
LEFT JOIN payment_history ph ON ph.client_id = c.id
WHERE c.active = true
GROUP BY c.id, c.name, c.membership_type, c.monthly_fee
ORDER BY total_paid DESC NULLS LAST
LIMIT 10;


-- 9B. Klienci z zaległymi płatnościami
SELECT 
  c.name,
  c.phone,
  c.monthly_fee,
  c.membership_due_date,
  CURRENT_DATE - c.membership_due_date as days_overdue
FROM clients c
WHERE c.active = true 
  AND c.membership_due_date < CURRENT_DATE
ORDER BY days_overdue DESC;


-- 9C. Najbardziej popularne dni tygodnia na treningi
SELECT 
  TO_CHAR(session_date, 'Day') as day_of_week,
  COUNT(*) as session_count,
  COUNT(DISTINCT a.client_id) as unique_attendees
FROM training_sessions ts
LEFT JOIN attendance a ON a.session_id = ts.id AND a.present = true
GROUP BY TO_CHAR(session_date, 'Day'), EXTRACT(DOW FROM session_date)
ORDER BY EXTRACT(DOW FROM session_date);


-- 9D. Statystyki obecności w ostatnich 30 dniach
SELECT 
  COUNT(DISTINCT ts.id) as total_sessions,
  COUNT(DISTINCT a.client_id) as unique_clients,
  COUNT(a.id) as total_attendance_records,
  COUNT(a.id) FILTER (WHERE a.present = true) as present_count,
  ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.present = true) / NULLIF(COUNT(a.id), 0), 2) as attendance_rate
FROM training_sessions ts
LEFT JOIN attendance a ON a.session_id = ts.id
WHERE ts.session_date >= CURRENT_DATE - INTERVAL '30 days';


-- 9E. Przychody w ostatnich 6 miesiącach
SELECT 
  TO_CHAR(payment_date, 'YYYY-MM') as month,
  COUNT(*) as payment_count,
  SUM(amount) as total_revenue
FROM payment_history
WHERE payment_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
ORDER BY month DESC;


-- ===============================================
-- 10. INFORMACJE O AKTUALNYM UŻYTKOWNIKU
-- ===============================================

-- Sprawdź swojego użytkownika (wymaga autoryzacji)
-- SELECT 
--   auth.uid() as my_user_id,
--   auth.email() as my_email;

-- Twoje dane jako trener
-- SELECT * FROM coaches WHERE id = auth.uid();

-- Twoi klienci
-- SELECT * FROM clients WHERE coach_id = auth.uid() ORDER BY name;

-- Twoje sesje treningowe
-- SELECT * FROM training_sessions WHERE coach_id = auth.uid() ORDER BY session_date DESC;


-- ===============================================
-- 11. ROZMIAR BAZY DANYCH
-- ===============================================

-- Rozmiar każdej tabeli
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;


-- ===============================================
-- KONIEC ANALIZY
-- ===============================================
-- 
-- Aby dodać nowe funkcje do aplikacji:
-- 1. Zidentyfikuj jakie dane będą potrzebne
-- 2. Sprawdź czy istniejące tabele wystarczą
-- 3. Jeśli nie, dodaj nowe kolumny lub tabele
-- 4. Stwórz migrację SQL
-- 5. Zaktualizuj TypeScript interfejsy
-- 6. Dodaj nowe funkcje w services/
-- 7. Zaktualizuj ekrany (screens/)
--
-- ===============================================

