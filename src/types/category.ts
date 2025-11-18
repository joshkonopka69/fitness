// ===============================================
// TYPY DLA SYSTEMU KATEGORII KLIENTÓW
// ===============================================

export interface ClientCategory {
  id: string;
  coach_id: string;
  name: string;
  location?: string;
  parent_category_id?: string;
  color: string;
  icon: string;
  order_index?: number;
  created_at: string;
  updated_at: string;
  
  // Rozszerzone dane (z JOIN lub VIEW)
  subcategories?: ClientCategory[];
  client_count?: number;
  subcategory_count?: number;
}

export interface ClientCategoryAssignment {
  id: string;
  client_id: string;
  category_id: string;
  assigned_at: string;
  created_at?: string; // Backward compatibility
}

// Pomocnicze typy dla UI
export interface CategoryFormData {
  name: string;
  location?: string;
  icon: string;
  color: string;
  parent_category_id?: string;
}

export const DEFAULT_CATEGORY_ICONS = [
  '📍', // Lokalizacja
  '🏋️', // Siłownia
  '🧘', // Yoga
  '⚽', // Sport
  '🏊', // Pływanie
  '🚴', // Rower
  '🥊', // Boks
  '🤸', // Gimnastyka
  '🏃', // Bieganie
  '💪', // Trening
];

export const DEFAULT_CATEGORY_COLORS = [
  '#007AFF', // Niebieski
  '#34C759', // Zielony
  '#FF9500', // Pomarańczowy
  '#FF3B30', // Czerwony
  '#AF52DE', // Fioletowy
  '#5856D6', // Indygo
  '#FF2D55', // Różowy
  '#64D2FF', // Jasny niebieski
];

