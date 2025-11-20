// ===============================================
// PAYMENT TRACKING TYPES
// ===============================================
// Typy dla systemu śledzenia płatności miesięcznych

export interface MonthlyPaymentTracking {
  id: string;
  coach_id: string;
  client_id: string;
  year: number;
  month: number; // 1-12
  has_paid: boolean;
  marked_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UnpaidClient {
  client_id: string;
  client_name: string;
  client_phone?: string;
  has_paid: boolean;
  tracking_id?: string;
  categories?: string[]; // nazwy kategorii
}

export interface UnpaidClientInCategory {
  client_id: string;
  client_name: string;
  client_phone?: string;
  has_paid: boolean;
  tracking_id?: string;
}

export interface PaymentStatsByCategory {
  category_id: string;
  category_name: string;
  coach_id: string;
  color: string;
  icon: string;
  year: number;
  month: number;
  total_clients: number;
  paid_clients: number;
  unpaid_clients: number;
}

export interface PaymentStatsBySubcategory {
  subcategory_id: string;
  subcategory_name: string;
  parent_category_id: string;
  parent_category_name: string | null;
  coach_id: string;
  color: string;
  icon: string;
  year: number;
  month: number;
  total_clients: number;
  paid_clients: number;
  unpaid_clients: number;
}

export interface PaymentStats {
  total_clients: number;
  paid_clients: number;
  unpaid_clients: number;
  payment_rate: number; // 0-100
}

// Typy dla wykresów
export interface PaymentChartData {
  label: string; // nazwa grupy lub klienta
  value: number; // liczba nieopłaconych osób
  color: string;
  icon?: string;
  id: string; // category_id lub client_id
  type?: 'category' | 'subcategory' | 'client';
  parentId?: string;
}

export type PaymentChartViewMode = 'categories' | 'individuals';

// Helpers
export interface MonthYear {
  year: number;
  month: number; // 1-12
}

export const getCurrentMonthYear = (): MonthYear => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // JS months are 0-indexed
  };
};

export const getMonthName = (month: number): string => {
  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];
  return months[month - 1] || '';
};

export const formatMonthYear = (year: number, month: number): string => {
  return `${getMonthName(month)} ${year}`;
};


