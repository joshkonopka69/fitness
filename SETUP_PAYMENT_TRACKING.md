# 🚀 SETUP: Monthly Payment Tracking

## ⚡ Quick Start (3 kroki):

### 1. **Uruchom migrację SQL w Supabase**

```sql
-- Otwórz Supabase Dashboard:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Skopiuj i wklej CAŁĄ zawartość pliku:
database/add_monthly_payment_tracking.sql

-- Kliknij "RUN" ✅
```

**Oczekiwany output:**
```
✅ Tabela monthly_payment_tracking utworzona pomyślnie
✅ Indeksy utworzone pomyślnie
✅ Row Level Security włączone pomyślnie
✅ Funkcje pomocnicze utworzone pomyślnie
🎉 System śledzenia płatności miesięcznych zainstalowany pomyślnie!
```

### 2. **Restart aplikacji**

```powershell
# W PowerShell:
.\START-APP.ps1
```

### 3. **Gotowe! Zacznij używać:**

#### A) **Oznacz klienta jako zapłaconego:**
1. Otwórz **ClientsScreen** (zakładka "Clients")
2. **Long press** (przytrzymaj) na kliencie
3. Potwierdź w alertcie
4. ✅ Badge zmienia się na zielony checkmark

#### B) **Zobacz wykres nieopłaconych:**
1. Otwórz **StatsScreen** (zakładka "Statistics")
2. Scroll w dół do sekcji **"Nieopłaceni Klienci"**
3. **Toggle** między widokami:
   - **Grupy** = kategorie z liczbą nieopłaconych
   - **Osoby** = lista wszystkich nieopłaconych
4. **Kliknij kategorię** = zobacz klientów z tej kategorii

---

## 📋 Checklist przed uruchomieniem:

- [ ] Połączenie z Supabase działa
- [ ] Masz dostęp do Supabase Dashboard
- [ ] Migracja SQL została uruchomiona pomyślnie
- [ ] Aplikacja została zrestartowana
- [ ] Widzisz sekcję "Nieopłaceni Klienci" w StatsScreen

---

## 🧪 Test czy działa:

### Test 1: Badge na karcie klienta
```
1. Otwórz ClientsScreen
2. Sprawdź czy każdy klient ma badge (✅ zielony lub ❌ czerwony)
3. ✅ DZIAŁA jeśli widzisz badge
4. ❌ NIE DZIAŁA jeśli brak badge → sprawdź console.log
```

### Test 2: Long press toggle
```
1. Long press na kliencie z ❌ (czerwony)
2. Potwierdź alert
3. Badge zmienia się na ✅ (zielony)
4. ✅ DZIAŁA
```

### Test 3: Wykres w StatsScreen
```
1. Przejdź do StatsScreen
2. Scroll do sekcji "Nieopłaceni Klienci"
3. ✅ DZIAŁA jeśli widzisz wykres
4. ❌ NIE DZIAŁA jeśli błąd lub brak sekcji
```

### Test 4: Drill-down w wykresie
```
1. Ustaw toggle na "Grupy"
2. Kliknij na kategorię
3. Widzisz listę klientów z tej kategorii
4. Kliknij "Wstecz" (←)
5. Wracasz do widoku kategorii
6. ✅ DZIAŁA
```

---

## 🔍 Troubleshooting:

### Błąd: "No such function: mark_client_paid"
**Przyczyna:** Migracja SQL nie została uruchomiona
**Rozwiązanie:** 
```
1. Otwórz Supabase Dashboard → SQL Editor
2. Uruchom database/add_monthly_payment_tracking.sql
3. Restart aplikacji
```

### Błąd: "Permission denied for table monthly_payment_tracking"
**Przyczyna:** RLS nie został poprawnie skonfigurowany
**Rozwiązanie:** 
```
1. Sprawdź czy zalogowany użytkownik jest trenerem (coaches table)
2. Sprawdź polityki RLS w Supabase Dashboard
3. Re-run migracja SQL
```

### Badge nie pojawia się na kartach klientów
**Przyczyna:** Błąd podczas fetchowania statusu płatności
**Rozwiązanie:** 
```
1. Otwórz Metro Terminal
2. Sprawdź console.log dla "Client X - has_paid: Y"
3. Jeśli brak logów → problem z paymentTrackingService
4. Sprawdź network tab w Supabase Dashboard
```

### Wykres nie ładuje się w StatsScreen
**Przyczyna:** Błąd w fetchPaymentData()
**Rozwiązanie:** 
```
1. Sprawdź console.log: "Error fetching payment data"
2. Sprawdź czy widoki SQL zostały utworzone:
   - unpaid_clients_current_month
   - payment_stats_by_category
3. Re-run migracja SQL
```

### "Wszyscy zapłacili! 🎉" ale to nieprawda
**Przyczyna:** Wszyscy klienci mają has_paid = TRUE lub brak klientów
**Rozwiązanie:** 
```
1. Sprawdź w Supabase Dashboard:
   SELECT * FROM monthly_payment_tracking 
   WHERE year = 2024 AND month = 11;
2. Jeśli puste → oznacz kogoś jako nieopłaconego (long press → toggle)
```

---

## 📊 Struktura plików:

```
FitnessGuru/
├─ database/
│  └─ add_monthly_payment_tracking.sql ← 1️⃣ URUCHOM TO PIERWSZE
│
├─ src/
│  ├─ types/
│  │  └─ paymentTracking.ts ← TypeScript types
│  │
│  ├─ services/
│  │  └─ paymentTrackingService.ts ← Service layer
│  │
│  ├─ components/
│  │  └─ stats/
│  │     └─ UnpaidClientsChart.tsx ← Komponent wykresu
│  │
│  └─ screens/
│     ├─ stats/
│     │  └─ StatsScreen.tsx ← 📊 Wykres nieopłaconych
│     │
│     └─ clients/
│        └─ ClientsScreen.tsx ← 💳 Mark as paid (long press)
│
└─ MONTHLY_PAYMENT_TRACKING_DOCUMENTATION.md ← 📖 Pełna dokumentacja
```

---

## 🎯 Co możesz teraz robić:

### 1. **Śledzenie płatności miesięcznych**
- Long press na kliencie → toggle paid/unpaid
- Badge pokazuje status (✅ zapłacił / ❌ nie zapłacił)

### 2. **Wykres nieopłaconych w StatsScreen**
- Zobacz ile osób nie zapłaciło w tym miesiącu
- Grupuj po kategoriach lub zobacz wszystkich

### 3. **Drill-down per kategoria**
- Kliknij kategorię → zobacz kto nie zapłacił w tej grupie
- Łatwe zarządzanie dużą liczbą klientów

### 4. **Automatyczny reset co miesiąc**
- 1 grudnia → wszyscy mają status "nie zapłacił"
- Dane z listopada zachowane w bazie
- Możesz wrócić do historii (funkcja do implementacji)

---

## 🎉 Gotowe!

**Wszystko zainstalowane i gotowe do użycia!**

**Jeśli masz pytania:**
- Przeczytaj `MONTHLY_PAYMENT_TRACKING_DOCUMENTATION.md`
- Sprawdź console.log w Metro Terminal
- Sprawdź Supabase logs

**Enjoy! 💰✅**


