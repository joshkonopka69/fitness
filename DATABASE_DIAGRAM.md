# 🗄️ FitnessGuru - Diagram Bazy Danych

## Wizualna Struktura Tabel i Relacji

```
┌─────────────────────────────────────────────────────────────────┐
│                      SYSTEM AUTENTYKACJI                        │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   auth.users     │  (Supabase Auth)
    │──────────────────│
    │ • id (UUID)      │
    │ • email          │
    │ • password_hash  │
    └────────┬─────────┘
             │
             │ 1:1
             ▼
    ┌──────────────────┐
    │     COACHES      │  (Trenerzy/Właściciele aplikacji)
    │──────────────────│
    │ • id (UUID) PK   │ ◄─────────┐
    │ • email          │            │
    │ • name           │            │
    │ • gym_name       │            │
    │ • phone          │            │
    │ • created_at     │            │
    │ • updated_at     │            │
    └────────┬─────────┘            │
             │                      │
             │ 1:N                  │
             │                      │
┌────────────┴────────────┐         │
│                         │         │
│                         │         │
▼                         ▼         │
┌──────────────────┐   ┌──────────────────┐
│     CLIENTS      │   │ TRAINING_SESSIONS│
│──────────────────│   │──────────────────│
│ • id (UUID) PK   │   │ • id (UUID) PK   │
│ • coach_id FK ───┼───│ • coach_id FK ───┘
│ • name           │   │ • title          │
│ • email          │   │ • session_date   │
│ • phone          │   │ • start_time     │
│ • membership_type│   │ • end_time       │
│ • monthly_fee    │   │ • session_type   │
│ • due_date       │   │ • notes          │
│ • join_date      │   │ • color          │
│ • notes          │   │ • created_at     │
│ • active         │   │ • updated_at     │
│ • created_at     │   └────────┬─────────┘
│ • updated_at     │            │
└────────┬─────────┘            │
         │                      │
         │                      │
         │ 1:N                  │ 1:N
         │                      │
         │    ┌─────────────────┘
         │    │
         │    │
         ▼    ▼
    ┌──────────────────┐
    │   ATTENDANCE     │  (Lista obecności)
    │──────────────────│
    │ • id (UUID) PK   │
    │ • session_id FK ─┼──┐
    │ • client_id FK ──┼──┘
    │ • present        │
    │ • notes          │
    │ • created_at     │
    │                  │
    │ UNIQUE(session,  │
    │        client)   │
    └──────────────────┘


┌────────────────────────────────────────────────────────────────┐
│                    SYSTEM PŁATNOŚCI                            │
└────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │     CLIENTS      │
    │──────────────────│
    │ • id (UUID) PK   │ ◄─────┐
    └──────────────────┘        │
                                │
                                │ 1:N
                                │
                    ┌───────────┴────────┐
                    │  PAYMENT_HISTORY   │  (Płatności od klientów)
                    │────────────────────│
                    │ • id (UUID) PK     │
                    │ • client_id FK     │
                    │ • amount           │
                    │ • payment_date     │
                    │ • payment_method   │
                    │ • notes            │
                    │ • created_at       │
                    └────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│              SYSTEM SUBSKRYPCJI PREMIUM                        │
└────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │     COACHES      │
    │──────────────────│
    │ • id (UUID) PK   │ ◄─────┐
    └──────────────────┘        │
                                │
      (opcjonalnie)             │
           │                    │
           │ 1:1                │
           ▼                    │
    ┌──────────────────┐        │
    │ COACH_PROFILES   │        │
    │──────────────────│        │
    │ • id (UUID) PK   │        │
    │ • trial_ends_at  │        │ 1:N
    │ • subscription_  │        │
    │   status         │        │
    │ • subscription_  │   ┌────┴────────┐
    │   ends_at        │   │  PAYMENTS   │  (Płatności za Premium)
    │ • stripe_        │   │─────────────│
    │   customer_id    │   │ • id PK     │
    │ • stripe_        │   │ • coach_id ─┘
    │   subscription_  │   │ • amount    │
    │   id             │   │ • currency  │
    │ • beta_tester    │   │ • status    │
    │ • premium_       │   │ • stripe_   │
    │   started_at     │   │   payment_  │
    └──────────────────┘   │   intent_id │
                           │ • stripe_   │
                           │   invoice_id│
                           │ • payment_  │
                           │   method    │
                           │ • created_at│
                           │ • updated_at│
                           └─────────────┘


┌────────────────────────────────────────────────────────────────┐
│                         WIDOKI (VIEWS)                         │
└────────────────────────────────────────────────────────────────┘

📊 OVERDUE_PAYMENTS
   ↳ Klienci z zaległymi płatnościami
   ↳ SELECT FROM clients WHERE due_date < TODAY

📊 CLIENT_ATTENDANCE_RATES  
   ↳ Statystyki frekwencji klientów
   ↳ % obecności dla każdego klienta

📊 COACH_STATISTICS
   ↳ Ogólne statystyki trenera
   ↳ Liczba klientów, sesji, przychody

📊 SESSION_ATTENDANCE_SUMMARY
   ↳ Podsumowanie obecności na sesjach
   ↳ Liczba obecnych/nieobecnych per sesja


┌────────────────────────────────────────────────────────────────┐
│                    FUNKCJE (FUNCTIONS)                         │
└────────────────────────────────────────────────────────────────┘

⚙️ update_updated_at_column()
   ↳ Automatycznie aktualizuje updated_at przy UPDATE

⚙️ calculate_next_due_date(date)
   ↳ Oblicza następny termin płatności (+30 dni)

⚙️ check_subscription_status(coach_id)
   ↳ Zwraca status subskrypcji i dni pozostałe

⚙️ record_payment(...)
   ↳ Zapisuje płatność za subskrypcję

⚙️ activate_subscription(coach_id, subscription_id)
   ↳ Aktywuje płatną subskrypcję


┌────────────────────────────────────────────────────────────────┐
│                  BEZPIECZEŃSTWO (RLS)                          │
└────────────────────────────────────────────────────────────────┘

🔒 Wszystkie tabele mają Row Level Security (RLS)

ZASADA: Trener widzi tylko SWOJE dane

✅ coaches → auth.uid() = id
✅ clients → auth.uid() = coach_id  
✅ training_sessions → auth.uid() = coach_id
✅ attendance → poprzez session.coach_id
✅ payment_history → poprzez client.coach_id
✅ payments → auth.uid() = coach_id


┌────────────────────────────────────────────────────────────────┐
│                      INDEKSY                                   │
└────────────────────────────────────────────────────────────────┘

📌 idx_clients_coach_id → clients(coach_id)
📌 idx_clients_active → clients(active)
📌 idx_sessions_coach_date → training_sessions(coach_id, session_date)
📌 idx_attendance_session → attendance(session_id)
📌 idx_attendance_client → attendance(client_id)
📌 idx_payment_history_client → payment_history(client_id)
📌 idx_payments_coach_id → payments(coach_id)
📌 idx_payments_status → payments(status)


┌────────────────────────────────────────────────────────────────┐
│                  PRZEPŁYW DANYCH                               │
└────────────────────────────────────────────────────────────────┘

1️⃣ REJESTRACJA TRENERA:
   auth.users → coaches → coach_profiles (trial 30 dni)

2️⃣ DODANIE KLIENTA:
   coaches → clients

3️⃣ UTWORZENIE SESJI:
   coaches → training_sessions

4️⃣ LISTA OBECNOŚCI:
   training_sessions + clients → attendance

5️⃣ PŁATNOŚĆ OD KLIENTA:
   clients → payment_history

6️⃣ UPGRADE DO PREMIUM:
   coaches → Stripe → payments → coach_profiles.subscription_status


┌────────────────────────────────────────────────────────────────┐
│              PRZYKŁADOWE ZAPYTANIA                             │
└────────────────────────────────────────────────────────────────┘

💡 Wszyscy aktywni klienci trenera:
SELECT * FROM clients 
WHERE coach_id = 'xxx' AND active = true;

💡 Sesje z ostatnich 7 dni:
SELECT * FROM training_sessions 
WHERE coach_id = 'xxx' 
AND session_date >= CURRENT_DATE - 7;

💡 Frekwencja klienta:
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE present = true) as present
FROM attendance
WHERE client_id = 'xxx';

💡 Miesięczny przychód:
SELECT SUM(monthly_fee) 
FROM clients 
WHERE coach_id = 'xxx' 
AND active = true;

💡 Najbardziej aktywni klienci:
SELECT c.name, COUNT(a.id) as attendance_count
FROM clients c
JOIN attendance a ON a.client_id = c.id
WHERE c.coach_id = 'xxx' AND a.present = true
GROUP BY c.id
ORDER BY attendance_count DESC;


┌────────────────────────────────────────────────────────────────┐
│                 ROZSZERZENIA (MOŻLIWE)                         │
└────────────────────────────────────────────────────────────────┘

Łatwe do dodania:

🏋️ EXERCISES (Ćwiczenia)
   ├─ exercises (baza ćwiczeń)
   ├─ session_exercises (ćwiczenia w sesji)
   └─ client_exercise_results (wyniki klienta)

📏 BODY_MEASUREMENTS (Pomiary)
   └─ body_measurements (waga, BMI, wymiary)

🎯 GOALS (Cele)
   └─ client_goals (cele klientów)

💬 MESSAGES (Czat)
   └─ messages (wiadomości trenera z klientami)

📦 PACKAGES (Pakiety)
   ├─ packages (definicje pakietów)
   └─ client_packages (wykupione pakiety)

🍎 NUTRITION (Dieta)
   ├─ meal_plans (plany żywieniowe)
   └─ client_meals (posiłki klienta)


┌────────────────────────────────────────────────────────────────┐
│                     ROZMIARY                                   │
└────────────────────────────────────────────────────────────────┘

Szacunkowe rozmiary dla 1000 aktywnych trenerów:

📊 coaches: ~50 KB (1000 rekordów)
📊 clients: ~5 MB (50,000 klientów, 50/trener)
📊 training_sessions: ~20 MB (200,000 sesji)
📊 attendance: ~100 MB (1,000,000 wpisów)
📊 payment_history: ~10 MB (100,000 płatności)
📊 payments: ~1 MB (10,000 subskrypcji)

TOTAL: ~136 MB (bez załączników/zdjęć)

Supabase Free Tier: 500 MB ✅
Spokojnie wystarczy dla 1000+ użytkowników!


┌────────────────────────────────────────────────────────────────┐
│                  BACKUP & RESTORE                              │
└────────────────────────────────────────────────────────────────┘

Supabase automatycznie tworzy:
✅ Daily backups (7 dni wstecz)
✅ Point-in-time recovery (7 dni)

Własny backup (opcjonalnie):
```sql
-- Export wszystkich danych
COPY (SELECT * FROM coaches) TO 'coaches.csv' CSV HEADER;
COPY (SELECT * FROM clients) TO 'clients.csv' CSV HEADER;
-- itd.
```
```

---

## 🎓 Jak Czytać Ten Diagram?

### Symbole:
- `PK` = Primary Key (klucz główny)
- `FK` = Foreign Key (klucz obcy, relacja)
- `1:1` = Relacja jeden do jednego
- `1:N` = Relacja jeden do wielu
- `→` = Wskazuje relację
- `◄─` = Odniesienie do tabeli

### Przykład Relacji:

```
COACHES (1) ───→ (N) CLIENTS
```
Znaczy: Jeden trener ma wielu klientów

```
TRAINING_SESSIONS (1) ───→ (N) ATTENDANCE
CLIENTS (1) ───→ (N) ATTENDANCE  
```
Znaczy: Jedna sesja ma wiele wpisów obecności
        Jeden klient ma wiele wpisów obecności
        
---

**Ten diagram pomoże Ci zrozumieć całą strukturę bazy danych! 🚀**

**Następny krok:** Uruchom `QUICK_DATABASE_CHECK.sql` aby zobaczyć rzeczywiste dane!







