-- ===============================================
-- SZYBKA DIAGNOSTYKA BAZY DANYCH
-- ===============================================
-- Uruchom w Supabase SQL Editor aby zobaczyć aktualny stan
-- https://supabase.com/dashboard/project/qkkmurwntbkhvbezbhcz/sql
-- ===============================================

-- 🔍 1. JAKIE TABELE MASZ?
SELECT 
  '📊 ' || table_name as "Tabela",
  CASE 
    WHEN table_name = 'coaches' THEN 'Trenerzy/Użytkownicy aplikacji'
    WHEN table_name = 'coach_profiles' THEN 'Profile trenerów (subskrypcje)'
    WHEN table_name = 'clients' THEN 'Klienci trenera'
    WHEN table_name = 'training_sessions' THEN 'Sesje treningowe'
    WHEN table_name = 'attendance' THEN 'Lista obecności'
    WHEN table_name = 'payment_history' THEN 'Historia płatności od klientów'
    WHEN table_name = 'payments' THEN 'Płatności za subskrypcje Premium'
    ELSE 'Inna tabela'
  END as "Opis"
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- 📈 2. ILE DANYCH MASZ?
SELECT 
  'Trenerzy' as "Kategoria",
  COUNT(*)::text as "Liczba"
FROM coaches
UNION ALL
SELECT 
  'Klienci (aktywni)',
  COUNT(*)::text
FROM clients
WHERE active = true
UNION ALL
SELECT 
  'Klienci (wszyscy)',
  COUNT(*)::text
FROM clients
UNION ALL
SELECT 
  'Sesje treningowe',
  COUNT(*)::text
FROM training_sessions
UNION ALL
SELECT 
  'Wpisy obecności',
  COUNT(*)::text
FROM attendance
UNION ALL
SELECT 
  'Płatności od klientów',
  COUNT(*)::text
FROM payment_history;


-- 💰 3. PRZYCHODY
SELECT 
  'Miesięczny przychód (potencjalny)' as "Typ",
  SUM(monthly_fee)::text || ' zł' as "Kwota"
FROM clients
WHERE active = true
UNION ALL
SELECT 
  'Suma wszystkich płatności',
  SUM(amount)::text || ' zł'
FROM payment_history;


-- 👥 4. TYPY CZŁONKOSTWA KLIENTÓW
SELECT 
  membership_type as "Typ członkostwa",
  COUNT(*) as "Liczba klientów",
  ROUND(AVG(monthly_fee), 2) || ' zł' as "Średnia opłata"
FROM clients
WHERE active = true
GROUP BY membership_type
ORDER BY COUNT(*) DESC;


-- 📅 5. OSTATNIE SESJE TRENINGOWE
SELECT 
  session_date as "Data",
  title as "Nazwa",
  session_type as "Typ",
  TO_CHAR(start_time, 'HH24:MI') as "Godzina"
FROM training_sessions
ORDER BY session_date DESC, start_time DESC
LIMIT 10;


-- ⚠️ 6. ZALEGŁE PŁATNOŚCI
SELECT 
  name as "Klient",
  phone as "Telefon",
  monthly_fee || ' zł' as "Opłata",
  membership_due_date as "Termin płatności",
  (CURRENT_DATE - membership_due_date)::text || ' dni' as "Zaległa od"
FROM clients
WHERE active = true 
  AND membership_due_date < CURRENT_DATE
ORDER BY membership_due_date ASC
LIMIT 10;


-- 🎯 7. NAJBARDZIEJ AKTYWNI KLIENCI (frekwencja)
SELECT 
  c.name as "Klient",
  COUNT(a.id) FILTER (WHERE a.present = true) as "Obecności",
  COUNT(a.id) as "Wszystkie sesje",
  CASE 
    WHEN COUNT(a.id) > 0 THEN
      ROUND((COUNT(a.id) FILTER (WHERE a.present = true)::NUMERIC / COUNT(a.id)::NUMERIC) * 100, 0)::text || '%'
    ELSE '0%'
  END as "Frekwencja"
FROM clients c
LEFT JOIN attendance a ON a.client_id = c.id
WHERE c.active = true
GROUP BY c.id, c.name
HAVING COUNT(a.id) > 0
ORDER BY COUNT(a.id) FILTER (WHERE a.present = true) DESC
LIMIT 10;


-- 📊 8. TYPY TRENINGÓW (najpopularniejsze)
SELECT 
  session_type as "Typ treningu",
  COUNT(*) as "Liczba sesji"
FROM training_sessions
GROUP BY session_type
ORDER BY COUNT(*) DESC;


-- 🔒 9. BEZPIECZEŃSTWO - Które tabele mają RLS?
SELECT 
  tablename as "Tabela",
  CASE 
    WHEN rowsecurity THEN '✅ Włączone'
    ELSE '❌ Wyłączone'
  END as "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;


-- 📌 10. INDEKSY (dla wydajności)
SELECT 
  tablename as "Tabela",
  indexname as "Indeks"
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- 🔗 11. RELACJE MIĘDZY TABELAMI
SELECT
  tc.table_name || '.' || kcu.column_name as "Od",
  '→' as "",
  ccu.table_name || '.' || ccu.column_name as "Do"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;


-- ✅ GOTOWE!
-- Teraz wiesz wszystko o swojej bazie danych!
-- 
-- Następny krok: Zdecyduj jakie funkcje chcesz dodać
-- i powiedz mi - pomogę zaprojektować i zaimplementować!







