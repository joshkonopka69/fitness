# 🏋️ FitnessGuru - Kompletna Analiza Aplikacji

## 📱 O CO CHODZI W APLIKACJI?

**FitnessGuru** to aplikacja mobilna dla trenerów personalnych i instruktorów fitness do zarządzania klientami, treningami i płatnościami.

---

## ✨ GŁÓWNE FUNKCJE

### 1. **Zarządzanie Klientami** 👥
- Dodawanie i edycja klientów
- Informacje kontaktowe (telefon, email)
- Typy członkostwa (Basic, Standard, Premium, Personal Training)
- Miesięczna opłata i termin płatności
- Notatki o kliencie
- Status aktywny/nieaktywny

### 2. **Kalendarz i Sesje Treningowe** 📅
- Tworzenie sesji treningowych
- Typy treningów: strength, cardio, hiit, yoga, pilates, crossfit, personal, general
- Widok kalendarza (miesięczny i dzienny)
- Godziny rozpoczęcia i zakończenia
- Notatki do sesji
- Kolory sesji

### 3. **Lista Obecności** ✅
- Szybkie oznaczanie obecności/nieobecności
- Wyszukiwanie klientów
- Statystyki obecności
- Notatki dla każdego uczestnika

### 4. **Płatności** 💰
- Historia płatności od klientów
- Tracking zaległych płatności
- Alerty o zaległościach
- Różne metody płatności
- Automatyczne przypomnienia

### 5. **Statystyki** 📊
- Liczba klientów
- Przychody miesięczne
- Średnia obecność
- Wykresy i raporty

### 6. **System Subskrypcji (Premium)** 💳
- 30-dniowy darmowy trial dla nowych użytkowników
- Płatne plany: miesięczny (39 zł) i roczny (390 zł)
- Integracja ze Stripe
- Obsługa Apple Pay, Google Pay, BLIK
- Status subskrypcji (trial, active, expired, cancelled)

### 7. **Profil** 👤
- Dane trenera
- Nazwa siłowni
- Ustawienia konta
- Upgrade do Premium

---

## 🗄️ STRUKTURA BAZY DANYCH

### Główne Tabele:

#### 1. **`coaches`** (Trenerzy)
```sql
- id (UUID) - ID użytkownika z auth.users
- email (TEXT)
- name (TEXT)
- gym_name (TEXT)
- phone (TEXT)
- created_at, updated_at

+ Dodatkowe kolumny w coach_profiles (jeśli istnieje):
- trial_ends_at (TIMESTAMPTZ) - koniec darmowego trialu
- subscription_status (VARCHAR) - status subskrypcji
- subscription_ends_at (TIMESTAMPTZ) - koniec płatnej subskrypcji
- stripe_customer_id (VARCHAR)
- stripe_subscription_id (VARCHAR)
- beta_tester (BOOLEAN)
```

#### 2. **`clients`** (Klienci trenera)
```sql
- id (UUID)
- coach_id (UUID) → coaches.id
- name (TEXT)
- email (TEXT)
- phone (TEXT)
- membership_type (TEXT) - Basic/Standard/Premium/Personal Training
- monthly_fee (INTEGER) - opłata miesięczna
- membership_due_date (DATE) - termin płatności
- join_date (DATE)
- notes (TEXT)
- active (BOOLEAN)
- created_at, updated_at
```

#### 3. **`training_sessions`** (Sesje treningowe)
```sql
- id (UUID)
- coach_id (UUID) → coaches.id
- title (TEXT)
- session_date (DATE)
- start_time (TIME)
- end_time (TIME)
- session_type (TEXT) - strength/cardio/hiit/yoga/pilates/crossfit/personal/general
- notes (TEXT)
- color (TEXT) - dodatkowa kolumna dla kolorów
- created_at, updated_at
```

#### 4. **`attendance`** (Obecności)
```sql
- id (UUID)
- session_id (UUID) → training_sessions.id
- client_id (UUID) → clients.id
- present (BOOLEAN)
- notes (TEXT)
- created_at
- UNIQUE(session_id, client_id) - jeden wpis per klient per sesja
```

#### 5. **`payment_history`** (Historia płatności od klientów)
```sql
- id (UUID)
- client_id (UUID) → clients.id
- amount (INTEGER)
- payment_date (DATE)
- payment_method (TEXT)
- notes (TEXT)
- created_at
```

#### 6. **`payments`** (Płatności za subskrypcje Premium)
```sql
- id (UUID)
- coach_id (UUID) → coach_profiles.id
- amount (DECIMAL)
- currency (VARCHAR) - PLN
- status (VARCHAR) - pending/succeeded/failed/refunded
- stripe_payment_intent_id (VARCHAR)
- stripe_invoice_id (VARCHAR)
- payment_method (VARCHAR) - card/google_pay/apple_pay
- description (TEXT)
- created_at, updated_at
```

### Widoki (Views):

1. **`overdue_payments`** - klienci z zaległymi płatnościami
2. **`client_attendance_rates`** - statystyki obecności klientów
3. **`coach_statistics`** - ogólne statystyki trenera
4. **`session_attendance_summary`** - podsumowanie obecności na sesjach

### Funkcje:

1. **`check_subscription_status(coach_id)`** - sprawdza status subskrypcji
2. **`calculate_next_due_date(current_date)`** - oblicza następny termin płatności
3. **`record_payment(...)`** - zapisuje płatność
4. **`activate_subscription(...)`** - aktywuje subskrypcję

---

## 🏗️ ARCHITEKTURA APLIKACJI

```
FitnessGuru/
├── src/
│   ├── components/ui/          # Komponenty UI
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── SessionNotesModal.tsx
│   │   └── ...
│   │
│   ├── contexts/               # Context API (state management)
│   │   ├── AuthContext.tsx    # Autentykacja użytkownika
│   │   ├── SubscriptionContext.tsx  # Status subskrypcji
│   │   └── ThemeContext.tsx   # Motyw aplikacji
│   │
│   ├── screens/                # Ekrany aplikacji
│   │   ├── auth/              # Login, Signup, Welcome
│   │   ├── clients/           # Lista klientów, szczegóły, dodawanie
│   │   ├── calendar/          # Kalendarz, tworzenie sesji, dzień
│   │   ├── attendance/        # Lista obecności
│   │   ├── payments/          # Alerty płatności
│   │   ├── stats/             # Statystyki
│   │   ├── subscription/      # Ekran subskrypcji/płatności
│   │   └── profile/           # Profil użytkownika
│   │
│   ├── services/               # Logika biznesowa
│   │   ├── clientService.ts   # Operacje na klientach
│   │   ├── sessionService.ts  # Operacje na sesjach
│   │   ├── attendanceService.ts
│   │   └── paymentService.ts
│   │
│   ├── lib/
│   │   └── supabase.ts        # Konfiguracja Supabase
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx   # React Navigation
│   │
│   └── theme/
│       └── colors.ts          # Kolory aplikacji
│
├── supabase/
│   └── functions/
│       └── create-payment-intent/  # Edge Function dla Stripe
│           └── index.ts
│
├── database/                   # Migracje SQL
│   ├── database_schema_complete.sql
│   ├── add_subscription_system.sql
│   └── ...
│
└── docs/                      # Dokumentacja
    ├── deployment/
    ├── features/
    └── legal/
```

---

## 🔄 PRZEPŁYW DANYCH

### 1. Logowanie użytkownika:
```
LoginScreen → AuthContext → Supabase Auth → coaches table
```

### 2. Dodawanie klienta:
```
AddClientScreen → clientService.ts → Supabase (clients table)
```

### 3. Tworzenie sesji:
```
CreateSessionScreen → sessionService.ts → Supabase (training_sessions table)
```

### 4. Zapisywanie obecności:
```
AttendanceScreen → supabase.from('attendance') → attendance table
```

### 5. Płatność subskrypcji:
```
SubscriptionScreen 
  → Edge Function (create-payment-intent)
  → Stripe API
  → Stripe Payment Sheet
  → Webhook → activate_subscription()
```

---

## 💡 JAK DODAĆ NOWE FUNKCJE?

### Przykład: Dodanie systemu ćwiczeń (exercises)

#### Krok 1: Baza danych
```sql
-- Nowa tabela
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id),
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relacja sesja-ćwiczenie
CREATE TABLE session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id),
  exercise_id UUID REFERENCES exercises(id),
  sets INTEGER,
  reps INTEGER,
  weight DECIMAL
);
```

#### Krok 2: TypeScript interfaces
```typescript
// src/types/exercise.ts
export interface Exercise {
  id: string;
  coach_id: string;
  name: string;
  description?: string;
  muscle_group?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
```

#### Krok 3: Service
```typescript
// src/services/exerciseService.ts
export const exerciseService = {
  async getExercises(coachId: string) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('coach_id', coachId);
    return { data, error };
  },
  // ... więcej funkcji
};
```

#### Krok 4: Ekrany
```typescript
// src/screens/exercises/ExercisesScreen.tsx
// src/screens/exercises/AddExerciseScreen.tsx
```

#### Krok 5: Nawigacja
Dodaj do `AppNavigator.tsx`

---

## 🔐 BEZPIECZEŃSTWO (RLS)

Wszystkie tabele mają **Row Level Security** (RLS):

- Trener widzi tylko **swoje** dane
- Nie może zobaczyć danych innych trenerów
- Polityki są egzekwowane na poziomie bazy danych
- Bazują na `auth.uid()` (ID zalogowanego użytkownika)

---

## 💳 MONETYZACJA

### Model biznesowy:
1. **30-dniowy FREE trial** dla nowych użytkowników
2. Po trialu: **39 zł/miesiąc** lub **390 zł/rok**
3. Płatności przez **Stripe**
4. Metody płatności: karta, Apple Pay, Google Pay, BLIK

### Przychody (przykład):
- 100 płacących użytkowników × 39 zł = **3,900 zł/miesiąc**
- 1,000 użytkowników × 39 zł = **39,000 zł/miesiąc**

---

## 📱 TECHNOLOGIE

- **Framework**: React Native + Expo
- **Język**: TypeScript
- **Baza danych**: Supabase (PostgreSQL)
- **Autentykacja**: Supabase Auth
- **Płatności**: Stripe
- **Nawigacja**: React Navigation
- **State Management**: React Context API
- **Animacje**: React Native Reanimated
- **UI**: Custom components

---

## 🚀 STATUS PROJEKTU

✅ **Gotowe:**
- System logowania/rejestracji
- Zarządzanie klientami
- Kalendarz i sesje treningowe
- Lista obecności
- Historia płatności (od klientów)
- Statystyki podstawowe
- System subskrypcji (30-day trial)
- Integracja Stripe
- Edge Function dla płatności
- RLS security

⏳ **Do rozważenia:**
- System ćwiczeń i planów treningowych
- Czat z klientami
- Powiadomienia push
- Eksport raportów PDF
- Integracja z kalendarzem
- Multijęzyczność (PL/EN)
- Dark mode
- Backup/restore danych

---

## 📊 ANALIZA BAZY DANYCH

Uruchom plik **`UNDERSTAND_DATABASE.sql`** w Supabase SQL Editor, aby:
- Zobaczyć wszystkie tabele
- Sprawdzić strukturę każdej tabeli
- Zobaczyć relacje między tabelami
- Sprawdzić statystyki (ile klientów, sesji, etc.)
- Przetestować widoki i funkcje

---

## 🎯 NASTĘPNE KROKI

1. **Zaloguj się do Supabase:**
   https://supabase.com/dashboard/project/qkkmurwntbkhvbezbhcz/sql

2. **Uruchom `UNDERSTAND_DATABASE.sql`** - zrozumiesz całą strukturę

3. **Zdecyduj jakie funkcje chcesz dodać**

4. **Zaplanuj zmiany w bazie:**
   - Jakie nowe tabele?
   - Jakie nowe kolumny?
   - Jakie relacje?

5. **Stwórz migrację SQL**

6. **Zaktualizuj TypeScript interfaces**

7. **Dodaj services**

8. **Stwórz ekrany**

---

## 🤝 WSPARCIE

Jeśli potrzebujesz pomocy przy dodawaniu nowych funkcji:
1. Opisz dokładnie co chcesz dodać
2. Pomogę zaprojektować strukturę bazy danych
3. Stworzę migracje SQL
4. Pomogę z implementacją w TypeScript/React Native

---

**FitnessGuru - Zbudowana dla trenerów personalnych 💪**







