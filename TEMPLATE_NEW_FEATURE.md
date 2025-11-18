# 🚀 Szablon Dodawania Nowych Funkcji

Użyj tego szablonu gdy chcesz dodać nową funkcjonalność do FitnessGuru.

---

## 📝 PRZYKŁAD: System Ćwiczeń i Planów Treningowych

### Krok 1: Planowanie

#### Co chcemy dodać?
- Bazę ćwiczeń (exercises)
- Przypisywanie ćwiczeń do sesji treningowych
- Zapisywanie wyników (serie, powtórzenia, ciężar)
- Śledzenie postępów klienta

#### Jakie dane będziemy przechowywać?
- Nazwa ćwiczenia
- Grupa mięśniowa
- Poziom trudności
- Instrukcje/opis
- Serie, powtórzenia, ciężar

---

### Krok 2: Projektowanie Bazy Danych

#### Nowe tabele:

```sql
-- ===============================================
-- DODAJ DO PLIKU: database/add_exercises_system.sql
-- ===============================================

-- 1. Tabela ćwiczeń
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT, -- 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ćwiczenia przypisane do sesji
CREATE TABLE IF NOT EXISTS session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sets INTEGER DEFAULT 3,
  reps INTEGER DEFAULT 10,
  weight DECIMAL(5, 2), -- np. 75.5 kg
  rest_seconds INTEGER DEFAULT 60,
  notes TEXT,
  order_index INTEGER DEFAULT 0, -- kolejność ćwiczeń
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Wyniki klienta (tracking postępów)
CREATE TABLE IF NOT EXISTS client_exercise_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps_completed INTEGER,
  weight_used DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla wydajności
CREATE INDEX idx_exercises_coach ON exercises(coach_id);
CREATE INDEX idx_session_exercises_session ON session_exercises(session_id);
CREATE INDEX idx_session_exercises_exercise ON session_exercises(exercise_id);
CREATE INDEX idx_client_results_client ON client_exercise_results(client_id);
CREATE INDEX idx_client_results_exercise ON client_exercise_results(exercise_id);

-- RLS Policies
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_exercise_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own exercises" ON exercises
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can manage session exercises" ON session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM training_sessions 
      WHERE training_sessions.id = session_exercises.session_id 
      AND training_sessions.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view client results" ON client_exercise_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_exercise_results.client_id 
      AND clients.coach_id = auth.uid()
    )
  );

-- Trigger dla updated_at
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Krok 3: TypeScript Interfaces

```typescript
// ===============================================
// DODAJ DO PLIKU: src/types/exercise.ts
// ===============================================

export type MuscleGroup = 
  | 'chest' 
  | 'back' 
  | 'legs' 
  | 'shoulders' 
  | 'arms' 
  | 'core' 
  | 'cardio';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  coach_id: string;
  name: string;
  description?: string;
  muscle_group?: MuscleGroup;
  difficulty?: Difficulty;
  video_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  weight?: number;
  rest_seconds: number;
  notes?: string;
  order_index: number;
  exercise?: Exercise; // Joined data
}

export interface ClientExerciseResult {
  id: string;
  client_id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number;
  weight_used?: number;
  notes?: string;
  created_at: string;
}
```

---

### Krok 4: Service Layer

```typescript
// ===============================================
// DODAJ DO PLIKU: src/services/exerciseService.ts
// ===============================================

import { supabase } from '../lib/supabase';
import { Exercise, SessionExercise, ClientExerciseResult } from '../types/exercise';

export const exerciseService = {
  // Pobierz wszystkie ćwiczenia trenera
  async getExercises(coachId: string) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('coach_id', coachId)
      .order('name');
    
    return { data: data as Exercise[] | null, error };
  },

  // Dodaj nowe ćwiczenie
  async createExercise(exercise: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('exercises')
      .insert([exercise])
      .select()
      .single();
    
    return { data: data as Exercise | null, error };
  },

  // Przypisz ćwiczenie do sesji
  async addExerciseToSession(sessionExercise: Omit<SessionExercise, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('session_exercises')
      .insert([sessionExercise])
      .select()
      .single();
    
    return { data: data as SessionExercise | null, error };
  },

  // Pobierz ćwiczenia dla sesji
  async getSessionExercises(sessionId: string) {
    const { data, error } = await supabase
      .from('session_exercises')
      .select(`
        *,
        exercise:exercise_id (*)
      `)
      .eq('session_id', sessionId)
      .order('order_index');
    
    return { data: data as SessionExercise[] | null, error };
  },

  // Zapisz wynik klienta
  async recordClientResult(result: Omit<ClientExerciseResult, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('client_exercise_results')
      .insert([result])
      .select()
      .single();
    
    return { data: data as ClientExerciseResult | null, error };
  },

  // Pobierz historię wyników klienta dla ćwiczenia
  async getClientExerciseHistory(clientId: string, exerciseId: string) {
    const { data, error } = await supabase
      .from('client_exercise_results')
      .select('*')
      .eq('client_id', clientId)
      .eq('exercise_id', exerciseId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    return { data: data as ClientExerciseResult[] | null, error };
  },
};
```

---

### Krok 5: Ekrany (Screens)

#### A. Lista ćwiczeń

```typescript
// ===============================================
// DODAJ PLIK: src/screens/exercises/ExercisesScreen.tsx
// ===============================================

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { exerciseService } from '../../services/exerciseService';
import { Exercise } from '../../types/exercise';

export default function ExercisesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await exerciseService.getExercises(user.id);
    
    if (data) {
      setExercises(data);
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('AddExercise')}
        style={{ backgroundColor: '#007AFF', padding: 16, borderRadius: 8 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>
          Dodaj ćwiczenie
        </Text>
      </TouchableOpacity>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={{ 
              padding: 16, 
              backgroundColor: 'white', 
              marginTop: 8, 
              borderRadius: 8 
            }}
            onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
            <Text style={{ color: '#666' }}>{item.muscle_group}</Text>
            <Text style={{ color: '#999' }}>{item.difficulty}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

#### B. Dodawanie ćwiczenia

```typescript
// ===============================================
// DODAJ PLIK: src/screens/exercises/AddExerciseScreen.tsx
// ===============================================

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { exerciseService } from '../../services/exerciseService';
import { MuscleGroup, Difficulty } from '../../types/exercise';

export default function AddExerciseScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('chest');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');

  const handleSave = async () => {
    if (!user || !name.trim()) {
      Alert.alert('Błąd', 'Wprowadź nazwę ćwiczenia');
      return;
    }

    const { data, error } = await exerciseService.createExercise({
      coach_id: user.id,
      name: name.trim(),
      description: description.trim(),
      muscle_group: muscleGroup,
      difficulty,
    });

    if (error) {
      Alert.alert('Błąd', error.message);
    } else {
      Alert.alert('Sukces', 'Ćwiczenie dodane!');
      navigation.goBack();
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 16, marginBottom: 8 }}>Nazwa ćwiczenia</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="np. Wyciskanie sztangi"
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}
      />

      <Text style={{ fontSize: 16, marginBottom: 8 }}>Opis</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Opis techniki..."
        multiline
        numberOfLines={4}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}
      />

      {/* Tutaj dodaj picker dla muscle_group i difficulty */}

      <TouchableOpacity
        onPress={handleSave}
        style={{
          backgroundColor: '#007AFF',
          padding: 16,
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>
          Zapisz
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

### Krok 6: Nawigacja

```typescript
// ===============================================
// AKTUALIZUJ: src/navigation/AppNavigator.tsx
// ===============================================

// Dodaj do Stack.Navigator:

<Stack.Screen 
  name="Exercises" 
  component={ExercisesScreen}
  options={{ title: 'Baza ćwiczeń' }}
/>
<Stack.Screen 
  name="AddExercise" 
  component={AddExerciseScreen}
  options={{ title: 'Dodaj ćwiczenie' }}
/>
<Stack.Screen 
  name="ExerciseDetail" 
  component={ExerciseDetailScreen}
  options={{ title: 'Szczegóły ćwiczenia' }}
/>
```

---

### Krok 7: Dodaj do głównego menu

W `ProfileScreen.tsx` lub odpowiednim miejscu:

```typescript
<TouchableOpacity onPress={() => navigation.navigate('Exercises')}>
  <Text>🏋️ Baza ćwiczeń</Text>
</TouchableOpacity>
```

---

## ✅ CHECKLIST DODAWANIA NOWEJ FUNKCJI

- [ ] Zaprojektuj strukturę bazy danych
- [ ] Stwórz plik migracji SQL (`database/add_*.sql`)
- [ ] Uruchom migrację w Supabase SQL Editor
- [ ] Stwórz TypeScript interfaces (`src/types/*.ts`)
- [ ] Stwórz service layer (`src/services/*.ts`)
- [ ] Stwórz ekrany (`src/screens/*/`)
- [ ] Dodaj nawigację (`src/navigation/AppNavigator.tsx`)
- [ ] Dodaj link w menu/profilu
- [ ] Przetestuj na urządzeniu
- [ ] Sprawdź czy RLS działa poprawnie
- [ ] Zaktualizuj dokumentację

---

## 💡 PORADY

1. **Zawsze zacznij od bazy danych** - dobrze zaprojektowana struktura to podstawa
2. **Używaj RLS** - zabezpieczaj dane na poziomie bazy
3. **Twórz indeksy** - dla często używanych kolumn
4. **Testuj na żywych danych** - dodaj przykładowe dane i testuj
5. **Używaj TypeScript** - typy pomogą uniknąć błędów
6. **Konsekwentny naming** - używaj snake_case w SQL, camelCase w TS
7. **Error handling** - zawsze obsługuj błędy z API

---

## 🎯 GOTOWE POMYSŁY NA NOWE FUNKCJE

### 1. **System Ćwiczeń** (jak wyżej)
- Baza ćwiczeń
- Plany treningowe
- Tracking postępów

### 2. **Czat z Klientami**
- Tabela: `messages`
- Real-time z Supabase Realtime
- Powiadomienia push

### 3. **Pomiary Ciała**
- Waga, BMI, % tłuszczu
- Wymiary (talia, biodra, biceps)
- Wykresy postępów

### 4. **Cele i Osiągnięcia**
- Tabela: `client_goals`
- Milestone tracking
- Powiadomienia o osiągnięciach

### 5. **Harmonogram Dostępności**
- Godziny pracy trenera
- Blokowanie terminów
- Rezerwacje online

### 6. **Pakiety i Karnety**
- Różne rodzaje karnetów (np. 10 wejść)
- Ważność pakietów
- Automatyczne odliczanie

### 7. **Dieta i Makroskładniki**
- Plany żywieniowe
- Kalkulatory TDEE
- Tracking makroskładników

### 8. **Raporty PDF**
- Miesięczne raporty dla klientów
- Faktury
- Podsumowania treningów

---

**Powiedz mi którą funkcję chcesz dodać, a pomogę Ci ją zaimplementować!** 🚀







