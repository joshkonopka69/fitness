-- ===============================================
-- SYSTEM ŚLEDZENIA PŁATNOŚCI MIESIĘCZNYCH
-- ===============================================
-- Autor: FitnessGuru Team
-- Data: 2024-11-15
-- Opis: Umożliwia trenerom śledzenie kto zapłacił
--       za treningi w danym miesiącu z automatycznym
--       resetem co miesiąc
-- ===============================================

-- ===============================================
-- 1. TABELA PŁATNOŚCI MIESIĘCZNYCH
-- ===============================================
CREATE TABLE IF NOT EXISTS monthly_payment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  has_paid BOOLEAN DEFAULT FALSE,
  marked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Jeden wpis na klienta na miesiąc
  UNIQUE(client_id, year, month)
);

COMMENT ON TABLE monthly_payment_tracking IS 'Śledzenie płatności miesięcznych klientów';
COMMENT ON COLUMN monthly_payment_tracking.year IS 'Rok (np. 2024)';
COMMENT ON COLUMN monthly_payment_tracking.month IS 'Miesiąc 1-12 (1=styczeń, 12=grudzień)';
COMMENT ON COLUMN monthly_payment_tracking.has_paid IS 'Czy klient zapłacił za ten miesiąc';
COMMENT ON COLUMN monthly_payment_tracking.marked_at IS 'Kiedy oznaczono jako zapłacone';
COMMENT ON COLUMN monthly_payment_tracking.notes IS 'Opcjonalne notatki (np. "Zapłacił gotówką")';

-- ===============================================
-- 2. INDEKSY (dla wydajności)
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_payment_tracking_coach 
  ON monthly_payment_tracking(coach_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_tracking_client 
  ON monthly_payment_tracking(client_id);
  
CREATE INDEX IF NOT EXISTS idx_payment_tracking_period 
  ON monthly_payment_tracking(year, month);
  
CREATE INDEX IF NOT EXISTS idx_payment_tracking_coach_period 
  ON monthly_payment_tracking(coach_id, year, month);
  
-- Indeks dla szybkiego wyszukiwania nieopłaconych
CREATE INDEX IF NOT EXISTS idx_payment_tracking_unpaid 
  ON monthly_payment_tracking(coach_id, year, month, has_paid) 
  WHERE has_paid = FALSE;

-- ===============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ===============================================
ALTER TABLE monthly_payment_tracking ENABLE ROW LEVEL SECURITY;

-- Trenerzy mogą widzieć tylko swoje wpisy
DROP POLICY IF EXISTS "Coaches can view own payment tracking" ON monthly_payment_tracking;
CREATE POLICY "Coaches can view own payment tracking" 
  ON monthly_payment_tracking FOR SELECT 
  USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can insert own payment tracking" ON monthly_payment_tracking;
CREATE POLICY "Coaches can insert own payment tracking" 
  ON monthly_payment_tracking FOR INSERT 
  WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can update own payment tracking" ON monthly_payment_tracking;
CREATE POLICY "Coaches can update own payment tracking" 
  ON monthly_payment_tracking FOR UPDATE 
  USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can delete own payment tracking" ON monthly_payment_tracking;
CREATE POLICY "Coaches can delete own payment tracking" 
  ON monthly_payment_tracking FOR DELETE 
  USING (auth.uid() = coach_id);

-- ===============================================
-- 4. TRIGGER DLA UPDATED_AT
-- ===============================================
DROP TRIGGER IF EXISTS update_payment_tracking_updated_at ON monthly_payment_tracking;
CREATE TRIGGER update_payment_tracking_updated_at
  BEFORE UPDATE ON monthly_payment_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 5. WIDOKI (VIEWS)
-- ===============================================

-- Widok: Nieopłaceni klienci w bieżącym miesiącu
DROP VIEW IF EXISTS unpaid_clients_current_month;
CREATE OR REPLACE VIEW unpaid_clients_current_month AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.phone as client_phone,
  c.coach_id,
  mpt.year,
  mpt.month,
  mpt.has_paid,
  mpt.id as tracking_id
FROM clients c
LEFT JOIN monthly_payment_tracking mpt 
  ON mpt.client_id = c.id 
  AND mpt.year = EXTRACT(YEAR FROM NOW())::INTEGER
  AND mpt.month = EXTRACT(MONTH FROM NOW())::INTEGER
WHERE 
  c.active = TRUE
  AND (mpt.has_paid = FALSE OR mpt.has_paid IS NULL);

COMMENT ON VIEW unpaid_clients_current_month IS 'Klienci którzy nie zapłacili w bieżącym miesiącu';

-- Widok: Statystyki płatności per kategoria
DROP VIEW IF EXISTS payment_stats_by_category;
CREATE OR REPLACE VIEW payment_stats_by_category AS
SELECT 
  cc.id as category_id,
  cc.name as category_name,
  cc.coach_id,
  cc.color,
  cc.icon,
  EXTRACT(YEAR FROM NOW())::INTEGER as year,
  EXTRACT(MONTH FROM NOW())::INTEGER as month,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT CASE WHEN mpt.has_paid = TRUE THEN c.id END) as paid_clients,
  COUNT(DISTINCT CASE WHEN mpt.has_paid = FALSE OR mpt.has_paid IS NULL THEN c.id END) as unpaid_clients
FROM client_categories cc
LEFT JOIN client_category_assignments cca ON cca.category_id = cc.id
LEFT JOIN clients c ON c.id = cca.client_id AND c.active = TRUE
LEFT JOIN monthly_payment_tracking mpt 
  ON mpt.client_id = c.id 
  AND mpt.year = EXTRACT(YEAR FROM NOW())::INTEGER
  AND mpt.month = EXTRACT(MONTH FROM NOW())::INTEGER
WHERE cc.parent_category_id IS NULL -- tylko główne kategorie
GROUP BY cc.id, cc.name, cc.coach_id, cc.color, cc.icon;

COMMENT ON VIEW payment_stats_by_category IS 'Statystyki płatności per kategoria (główna) w bieżącym miesiącu';

-- Widok: Statystyki płatności dla podkategorii (subgrup)
DROP VIEW IF EXISTS payment_stats_by_subcategory;
CREATE OR REPLACE VIEW payment_stats_by_subcategory AS
SELECT 
  cc.id as subcategory_id,
  cc.name as subcategory_name,
  cc.parent_category_id,
  parent.name as parent_category_name,
  cc.coach_id,
  cc.color,
  cc.icon,
  EXTRACT(YEAR FROM NOW())::INTEGER as year,
  EXTRACT(MONTH FROM NOW())::INTEGER as month,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT CASE WHEN mpt.has_paid = TRUE THEN c.id END) as paid_clients,
  COUNT(DISTINCT CASE WHEN mpt.has_paid = FALSE OR mpt.has_paid IS NULL THEN c.id END) as unpaid_clients
FROM client_categories cc
LEFT JOIN client_categories parent ON parent.id = cc.parent_category_id
LEFT JOIN client_category_assignments cca ON cca.category_id = cc.id
LEFT JOIN clients c ON c.id = cca.client_id AND c.active = TRUE
LEFT JOIN monthly_payment_tracking mpt 
  ON mpt.client_id = c.id 
  AND mpt.year = EXTRACT(YEAR FROM NOW())::INTEGER
  AND mpt.month = EXTRACT(MONTH FROM NOW())::INTEGER
WHERE cc.parent_category_id IS NOT NULL
GROUP BY 
  cc.id, 
  cc.name, 
  cc.parent_category_id, 
  parent.name,
  cc.coach_id, 
  cc.color, 
  cc.icon;

COMMENT ON VIEW payment_stats_by_subcategory IS 'Statystyki płatności dla podkategorii (subgrup) w bieżącym miesiącu';

-- ===============================================
-- 6. FUNKCJE POMOCNICZE
-- ===============================================

-- Funkcja: Pobierz nieopłaconych klientów w bieżącym miesiącu
CREATE OR REPLACE FUNCTION get_unpaid_clients_current_month(p_coach_id UUID)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  has_paid BOOLEAN,
  tracking_id UUID,
  categories TEXT[] -- nazwy kategorii klienta
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    COALESCE(mpt.has_paid, FALSE) as has_paid,
    mpt.id as tracking_id,
    ARRAY_AGG(DISTINCT cc.name) FILTER (WHERE cc.name IS NOT NULL) as categories
  FROM clients c
  LEFT JOIN monthly_payment_tracking mpt 
    ON mpt.client_id = c.id 
    AND mpt.year = EXTRACT(YEAR FROM NOW())::INTEGER
    AND mpt.month = EXTRACT(MONTH FROM NOW())::INTEGER
  LEFT JOIN client_category_assignments cca ON cca.client_id = c.id
  LEFT JOIN client_categories cc ON cc.id = cca.category_id
  WHERE 
    c.coach_id = p_coach_id
    AND c.active = TRUE
    AND (mpt.has_paid = FALSE OR mpt.has_paid IS NULL)
  GROUP BY c.id, c.name, c.phone, mpt.has_paid, mpt.id
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_unpaid_clients_current_month IS 'Zwraca listę nieopłaconych klientów w bieżącym miesiącu';

-- Funkcja: Pobierz nieopłaconych klientów w kategorii
CREATE OR REPLACE FUNCTION get_unpaid_clients_in_category(
  p_coach_id UUID,
  p_category_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  has_paid BOOLEAN,
  tracking_id UUID
) AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM NOW())::INTEGER);
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    COALESCE(mpt.has_paid, FALSE) as has_paid,
    mpt.id as tracking_id
  FROM clients c
  INNER JOIN client_category_assignments cca ON cca.client_id = c.id
  LEFT JOIN monthly_payment_tracking mpt 
    ON mpt.client_id = c.id 
    AND mpt.year = v_year
    AND mpt.month = v_month
  WHERE 
    c.coach_id = p_coach_id
    AND c.active = TRUE
    AND cca.category_id = p_category_id
    AND (mpt.has_paid = FALSE OR mpt.has_paid IS NULL)
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_unpaid_clients_in_category IS 'Zwraca nieopłaconych klientów w danej kategorii';

-- Funkcja: Oznacz klienta jako zapłaconego
CREATE OR REPLACE FUNCTION mark_client_paid(
  p_coach_id UUID,
  p_client_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM NOW())::INTEGER);
  v_tracking_id UUID;
BEGIN
  -- Sprawdź czy klient należy do trenera
  IF NOT EXISTS (
    SELECT 1 FROM clients 
    WHERE id = p_client_id AND coach_id = p_coach_id
  ) THEN
    RAISE EXCEPTION 'Client does not belong to this coach';
  END IF;
  
  -- Wstaw lub zaktualizuj
  INSERT INTO monthly_payment_tracking (
    coach_id,
    client_id,
    year,
    month,
    has_paid,
    marked_at,
    notes
  ) VALUES (
    p_coach_id,
    p_client_id,
    v_year,
    v_month,
    TRUE,
    NOW(),
    p_notes
  )
  ON CONFLICT (client_id, year, month)
  DO UPDATE SET
    has_paid = TRUE,
    marked_at = NOW(),
    notes = COALESCE(EXCLUDED.notes, monthly_payment_tracking.notes),
    updated_at = NOW()
  RETURNING id INTO v_tracking_id;
  
  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_client_paid IS 'Oznacza klienta jako zapłaconego za dany miesiąc';

-- Funkcja: Oznacz klienta jako NIEzapłaconego
CREATE OR REPLACE FUNCTION mark_client_unpaid(
  p_coach_id UUID,
  p_client_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM NOW())::INTEGER);
  v_tracking_id UUID;
BEGIN
  -- Sprawdź czy klient należy do trenera
  IF NOT EXISTS (
    SELECT 1 FROM clients 
    WHERE id = p_client_id AND coach_id = p_coach_id
  ) THEN
    RAISE EXCEPTION 'Client does not belong to this coach';
  END IF;
  
  -- Wstaw lub zaktualizuj
  INSERT INTO monthly_payment_tracking (
    coach_id,
    client_id,
    year,
    month,
    has_paid,
    marked_at
  ) VALUES (
    p_coach_id,
    p_client_id,
    v_year,
    v_month,
    FALSE,
    NULL
  )
  ON CONFLICT (client_id, year, month)
  DO UPDATE SET
    has_paid = FALSE,
    marked_at = NULL,
    updated_at = NOW()
  RETURNING id INTO v_tracking_id;
  
  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_client_unpaid IS 'Oznacza klienta jako NIEzapłaconego za dany miesiąc';

-- Funkcja: Pobierz statystyki płatności dla trenera
CREATE OR REPLACE FUNCTION get_payment_stats_for_coach(
  p_coach_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE (
  total_clients BIGINT,
  paid_clients BIGINT,
  unpaid_clients BIGINT,
  payment_rate NUMERIC
) AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_month INTEGER := COALESCE(p_month, EXTRACT(MONTH FROM NOW())::INTEGER);
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id) as total_clients,
    COUNT(DISTINCT CASE WHEN mpt.has_paid = TRUE THEN c.id END) as paid_clients,
    COUNT(DISTINCT CASE WHEN mpt.has_paid = FALSE OR mpt.has_paid IS NULL THEN c.id END) as unpaid_clients,
    CASE 
      WHEN COUNT(DISTINCT c.id) > 0 
      THEN ROUND(
        (COUNT(DISTINCT CASE WHEN mpt.has_paid = TRUE THEN c.id END)::NUMERIC / 
         COUNT(DISTINCT c.id)::NUMERIC) * 100, 
        2
      )
      ELSE 0
    END as payment_rate
  FROM clients c
  LEFT JOIN monthly_payment_tracking mpt 
    ON mpt.client_id = c.id 
    AND mpt.year = v_year
    AND mpt.month = v_month
  WHERE 
    c.coach_id = p_coach_id
    AND c.active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_payment_stats_for_coach IS 'Zwraca statystyki płatności dla trenera w danym miesiącu';

-- ===============================================
-- 7. AUTOMATYCZNE CZYSZCZENIE STARYCH DANYCH
-- ===============================================
-- Opcjonalnie: Funkcja do usuwania danych starszych niż X miesięcy

CREATE OR REPLACE FUNCTION cleanup_old_payment_tracking(months_to_keep INTEGER DEFAULT 12)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM monthly_payment_tracking
  WHERE 
    (year * 12 + month) < 
    (EXTRACT(YEAR FROM NOW())::INTEGER * 12 + EXTRACT(MONTH FROM NOW())::INTEGER - months_to_keep);
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_payment_tracking IS 'Usuwa dane starsze niż X miesięcy (domyślnie 12)';

-- ===============================================
-- 8. TESTY I WERYFIKACJA
-- ===============================================

-- Sprawdź czy tabela została utworzona
DO $$ 
BEGIN 
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_name = 'monthly_payment_tracking'
  ) = 1, 
  'Błąd: Tabela monthly_payment_tracking nie została utworzona';
  
  RAISE NOTICE '✅ Tabela monthly_payment_tracking utworzona pomyślnie';
END $$;

-- Sprawdź czy indeksy zostały utworzone
DO $$ 
BEGIN 
  ASSERT (
    SELECT COUNT(*) FROM pg_indexes 
    WHERE tablename = 'monthly_payment_tracking'
  ) >= 5, 
  'Błąd: Nie wszystkie indeksy zostały utworzone';
  
  RAISE NOTICE '✅ Indeksy utworzone pomyślnie';
END $$;

-- Sprawdź czy RLS jest włączone
DO $$ 
BEGIN 
  ASSERT (
    SELECT COUNT(*) FROM pg_tables 
    WHERE tablename = 'monthly_payment_tracking' AND rowsecurity = true
  ) = 1, 
  'Błąd: RLS nie jest włączone';
  
  RAISE NOTICE '✅ Row Level Security włączone pomyślnie';
END $$;

-- Sprawdź czy funkcje zostały utworzone
DO $$ 
BEGIN 
  ASSERT (
    SELECT COUNT(*) FROM pg_proc 
    WHERE proname IN (
      'get_unpaid_clients_current_month',
      'get_unpaid_clients_in_category',
      'mark_client_paid',
      'mark_client_unpaid',
      'get_payment_stats_for_coach',
      'cleanup_old_payment_tracking'
    )
  ) = 6, 
  'Błąd: Nie wszystkie funkcje zostały utworzone';
  
  RAISE NOTICE '✅ Funkcje pomocnicze utworzone pomyślnie';
END $$;

-- ===============================================
-- MIGRACJA ZAKOŃCZONA ✅
-- ===============================================

-- Podsumowanie:
-- ✅ Utworzono tabelę monthly_payment_tracking
-- ✅ Dodano 5 indeksów dla wydajności
-- ✅ Skonfigurowano RLS (4 polityki bezpieczeństwa)
-- ✅ Utworzono trigger dla updated_at
-- ✅ Utworzono 2 widoki (unpaid_clients_current_month, payment_stats_by_category)
-- ✅ Dodano 6 funkcji pomocniczych
-- ✅ Dodano automatyczne czyszczenie starych danych

-- Następne kroki:
-- 1. Uruchom ten plik w Supabase SQL Editor
-- 2. Zaimplementuj TypeScript interfaces
-- 3. Stwórz service layer (paymentTrackingService.ts)
-- 4. Zaktualizuj PaymentsScreen z nowym wykresem
-- 5. Dodaj przycisk "Mark as Paid" w ClientsScreen

DO $$ 
BEGIN 
  RAISE NOTICE '🎉 System śledzenia płatności miesięcznych zainstalowany pomyślnie!';
  RAISE NOTICE '📊 Możesz teraz śledzić kto zapłacił za treningi w danym miesiącu';
END $$;

