-- ===============================================
-- SYSTEM KATEGORII KLIENTÓW
-- ===============================================
-- Pozwala trenerom kategoryzować klientów według
-- lokalizacji i grup treningowych
-- ===============================================

-- Tabela kategorii klientów (główne i podkategorie)
CREATE TABLE IF NOT EXISTS client_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  parent_category_id UUID REFERENCES client_categories(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#007AFF',
  icon TEXT DEFAULT '📍',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela przypisań klientów do kategorii (Many-to-Many)
CREATE TABLE IF NOT EXISTS client_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES client_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, category_id)
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_categories_coach ON client_categories(coach_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON client_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_assignments_client ON client_category_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_category ON client_category_assignments(category_id);

-- Row Level Security
ALTER TABLE client_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_category_assignments ENABLE ROW LEVEL SECURITY;

-- Polityki RLS dla kategorii
CREATE POLICY "Coaches can view own categories" ON client_categories
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own categories" ON client_categories
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own categories" ON client_categories
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own categories" ON client_categories
  FOR DELETE USING (auth.uid() = coach_id);

-- Polityki RLS dla przypisań
CREATE POLICY "Coaches can view own assignments" ON client_category_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_category_assignments.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert own assignments" ON client_category_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_category_assignments.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete own assignments" ON client_category_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_category_assignments.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

-- Trigger dla updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON client_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Funkcja pomocnicza: pobierz kategorie z liczbą klientów
CREATE OR REPLACE VIEW categories_with_client_count AS
SELECT 
  cc.*,
  COUNT(cca.client_id) as client_count
FROM client_categories cc
LEFT JOIN client_category_assignments cca ON cca.category_id = cc.id
GROUP BY cc.id;

-- ===============================================
-- PRZYKŁADOWE UŻYCIE
-- ===============================================

-- Stwórz kategorię główną (lokalizacja):
-- INSERT INTO client_categories (coach_id, name, location, icon, color)
-- VALUES ('your-coach-id', 'Gym FitZone', 'ul. Sportowa 15', '🏋️', '#007AFF');

-- Stwórz podkategorię (grupa):
-- INSERT INTO client_categories (coach_id, name, parent_category_id, icon, color)
-- VALUES ('your-coach-id', 'Yoga - poniedziałek 18:00', 'parent-category-id', '🧘', '#34C759');

-- Przypisz klienta do kategorii:
-- INSERT INTO client_category_assignments (client_id, category_id)
-- VALUES ('client-id', 'category-id');

-- Pobierz kategorie z liczbą klientów:
-- SELECT * FROM categories_with_client_count WHERE coach_id = 'your-coach-id';

-- ===============================================
-- GOTOWE! ✅
-- ===============================================







