// ===============================================
// PAYMENT TRACKING SERVICE
// ===============================================
// Service dla śledzenia płatności miesięcznych

import { supabase } from '../lib/supabase';
import { 
  MonthlyPaymentTracking, 
  UnpaidClient, 
  UnpaidClientInCategory,
  PaymentStatsByCategory,
  PaymentStats,
  getCurrentMonthYear 
} from '../types/paymentTracking';

export const paymentTrackingService = {
  // ===== POBIERANIE DANYCH =====
  
  /**
   * Pobiera listę nieopłaconych klientów w bieżącym miesiącu
   */
  async getUnpaidClientsCurrentMonth(coachId: string) {
    const { data, error } = await supabase
      .rpc('get_unpaid_clients_current_month', { p_coach_id: coachId });
    
    return { data: data as UnpaidClient[] | null, error };
  },

  /**
   * Pobiera nieopłaconych klientów w danej kategorii
   */
  async getUnpaidClientsInCategory(
    coachId: string, 
    categoryId: string,
    year?: number,
    month?: number
  ) {
    const { data, error } = await supabase
      .rpc('get_unpaid_clients_in_category', { 
        p_coach_id: coachId,
        p_category_id: categoryId,
        p_year: year,
        p_month: month
      });
    
    return { data: data as UnpaidClientInCategory[] | null, error };
  },

  /**
   * Pobiera statystyki płatności per kategoria
   */
  async getPaymentStatsByCategory(coachId: string) {
    const { data, error } = await supabase
      .from('payment_stats_by_category')
      .select('*')
      .eq('coach_id', coachId)
      .order('category_name');
    
    return { data: data as PaymentStatsByCategory[] | null, error };
  },

  /**
   * Pobiera statystyki płatności dla trenera
   */
  async getPaymentStatsForCoach(
    coachId: string,
    year?: number,
    month?: number
  ) {
    const { data, error } = await supabase
      .rpc('get_payment_stats_for_coach', { 
        p_coach_id: coachId,
        p_year: year,
        p_month: month
      });
    
    if (data && data.length > 0) {
      return { data: data[0] as PaymentStats, error };
    }
    
    return { 
      data: { 
        total_clients: 0, 
        paid_clients: 0, 
        unpaid_clients: 0, 
        payment_rate: 0 
      } as PaymentStats, 
      error 
    };
  },

  /**
   * Pobiera status płatności dla konkretnego klienta
   */
  async getClientPaymentStatus(
    clientId: string,
    year?: number,
    month?: number
  ) {
    const { year: currentYear, month: currentMonth } = getCurrentMonthYear();
    
    const { data, error } = await supabase
      .from('monthly_payment_tracking')
      .select('*')
      .eq('client_id', clientId)
      .eq('year', year || currentYear)
      .eq('month', month || currentMonth)
      .maybeSingle();
    
    return { 
      data: data as MonthlyPaymentTracking | null, 
      error,
      has_paid: data?.has_paid || false
    };
  },

  // ===== OZNACZANIE PŁATNOŚCI =====
  
  /**
   * Oznacza klienta jako zapłaconego
   */
  async markClientAsPaid(
    coachId: string,
    clientId: string,
    notes?: string,
    year?: number,
    month?: number
  ) {
    const { data, error } = await supabase
      .rpc('mark_client_paid', { 
        p_coach_id: coachId,
        p_client_id: clientId,
        p_year: year,
        p_month: month,
        p_notes: notes
      });
    
    return { data, error };
  },

  /**
   * Oznacza klienta jako NIEzapłaconego
   */
  async markClientAsUnpaid(
    coachId: string,
    clientId: string,
    year?: number,
    month?: number
  ) {
    const { data, error } = await supabase
      .rpc('mark_client_unpaid', { 
        p_coach_id: coachId,
        p_client_id: clientId,
        p_year: year,
        p_month: month
      });
    
    return { data, error };
  },

  /**
   * Toggle payment status (zapłacił ↔ nie zapłacił)
   */
  async toggleClientPaymentStatus(
    coachId: string,
    clientId: string,
    currentStatus: boolean,
    year?: number,
    month?: number
  ) {
    if (currentStatus) {
      // Jeśli już zapłacił → oznacz jako NIEzapłaconego
      return await this.markClientAsUnpaid(coachId, clientId, year, month);
    } else {
      // Jeśli NIE zapłacił → oznacz jako zapłaconego
      return await this.markClientAsPaid(coachId, clientId, undefined, year, month);
    }
  },

  // ===== MASOWE OPERACJE =====
  
  /**
   * Oznacza wszystkich klientów w kategorii jako zapłaconych
   */
  async markAllClientsInCategoryAsPaid(
    coachId: string,
    categoryId: string,
    year?: number,
    month?: number
  ) {
    // Najpierw pobierz nieopłaconych klientów w kategorii
    const { data: unpaidClients, error: fetchError } = 
      await this.getUnpaidClientsInCategory(coachId, categoryId, year, month);
    
    if (fetchError || !unpaidClients) {
      return { data: null, error: fetchError };
    }

    // Oznacz każdego jako zapłaconego
    const promises = unpaidClients.map(client => 
      this.markClientAsPaid(coachId, client.client_id, undefined, year, month)
    );

    try {
      await Promise.all(promises);
      return { data: true, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  // ===== CZYSZCZENIE =====
  
  /**
   * Usuwa stare dane (starsze niż X miesięcy)
   */
  async cleanupOldData(monthsToKeep: number = 12) {
    const { data, error } = await supabase
      .rpc('cleanup_old_payment_tracking', { months_to_keep: monthsToKeep });
    
    return { data, error };
  },

  // ===== HELPERS =====
  
  /**
   * Sprawdza czy wszyscy klienci w kategorii zapłacili
   */
  async hasAllClientsInCategoryPaid(
    coachId: string,
    categoryId: string,
    year?: number,
    month?: number
  ): Promise<boolean> {
    const { data } = await this.getUnpaidClientsInCategory(
      coachId, 
      categoryId, 
      year, 
      month
    );
    
    return (data?.length || 0) === 0;
  },

  /**
   * Pobiera procent zapłaconych klientów w kategorii
   */
  async getCategoryPaymentRate(
    coachId: string,
    categoryId: string
  ): Promise<number> {
    const { data: stats } = await this.getPaymentStatsByCategory(coachId);
    
    if (!stats) return 0;
    
    const categoryStats = stats.find(s => s.category_id === categoryId);
    
    if (!categoryStats || categoryStats.total_clients === 0) return 0;
    
    return Math.round(
      (categoryStats.paid_clients / categoryStats.total_clients) * 100
    );
  },
};


