// ===============================================
// SERVICE DLA ZARZĄDZANIA KATEGORIAMI KLIENTÓW
// ===============================================

import { supabase } from '../lib/supabase';
import { ClientCategory, ClientCategoryAssignment } from '../types/category';

export const categoryService = {
  /**
   * Pobierz kategorie w strukturze drzewa (używa funkcji SQL)
   * Zawiera hierarchię: główne kategorie + podkategorie
   */
  async getCategoriesTree(coachId: string) {
    const { data, error } = await supabase
      .rpc('get_coach_categories_tree', { p_coach_id: coachId });
    
    return { data: data as ClientCategory[] | null, error };
  },

  /**
   * Pobierz wszystkie kategorie główne trenera (bez parent)
   */
  async getMainCategories(coachId: string) {
    const { data, error } = await supabase
      .from('categories_with_counts')
      .select('*')
      .eq('coach_id', coachId)
      .is('parent_category_id', null)
      .order('order_index, name');
    
    return { data: data as ClientCategory[] | null, error };
  },

  /**
   * Pobierz wszystkie kategorie (główne + podkategorie)
   */
  async getAllCategories(coachId: string) {
    const { data, error } = await supabase
      .from('categories_with_counts')
      .select('*')
      .eq('coach_id', coachId)
      .order('order_index, name');
    
    return { data: data as ClientCategory[] | null, error };
  },

  /**
   * Pobierz podkategorie dla danej kategorii
   */
  async getSubcategories(parentCategoryId: string) {
    const { data, error } = await supabase
      .from('categories_with_counts')
      .select('*')
      .eq('parent_category_id', parentCategoryId)
      .order('order_index, name');
    
    return { data: data as ClientCategory[] | null, error };
  },

  /**
   * Utwórz nową kategorię
   */
  async createCategory(category: {
    coach_id: string;
    name: string;
    location?: string;
    parent_category_id?: string;
    color?: string;
    icon?: string;
  }) {
    const { data, error } = await supabase
      .from('client_categories')
      .insert([{
        coach_id: category.coach_id,
        name: category.name,
        location: category.location,
        parent_category_id: category.parent_category_id,
        color: category.color || '#007AFF',
        icon: category.icon || '📍',
      }])
      .select()
      .single();
    
    return { data: data as ClientCategory | null, error };
  },

  /**
   * Aktualizuj kategorię
   */
  async updateCategory(categoryId: string, updates: {
    name?: string;
    location?: string;
    color?: string;
    icon?: string;
  }) {
    const { data, error } = await supabase
      .from('client_categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();
    
    return { data: data as ClientCategory | null, error };
  },

  /**
   * Usuń kategorię
   */
  async deleteCategory(categoryId: string) {
    const { error } = await supabase
      .from('client_categories')
      .delete()
      .eq('id', categoryId);
    
    return { error };
  },

  /**
   * Przypisz klienta do kategorii
   */
  async assignClientToCategory(clientId: string, categoryId: string) {
    const { data, error } = await supabase
      .from('client_category_assignments')
      .insert([{ client_id: clientId, category_id: categoryId }])
      .select()
      .single();
    
    return { data: data as ClientCategoryAssignment | null, error };
  },

  /**
   * Usuń klienta z kategorii
   */
  async removeClientFromCategory(clientId: string, categoryId: string) {
    const { error } = await supabase
      .from('client_category_assignments')
      .delete()
      .eq('client_id', clientId)
      .eq('category_id', categoryId);
    
    return { error };
  },

  /**
   * Pobierz wszystkie kategorie dla danego klienta
   */
  async getClientCategories(clientId: string) {
    const { data, error } = await supabase
      .from('client_category_assignments')
      .select(`
        category_id,
        client_categories (*)
      `)
      .eq('client_id', clientId);
    
    if (error) return { data: null, error };
    
    // Przekształć dane do prostszej struktury
    const categories = data
      ?.map(item => (item as any).client_categories)
      .filter(Boolean) as ClientCategory[] | null;
    
    return { data: categories, error: null };
  },

  /**
   * Pobierz klientów w danej kategorii
   */
  async getClientsInCategory(categoryId: string) {
    const { data, error } = await supabase
      .from('client_category_assignments')
      .select(`
        client_id,
        clients (*)
      `)
      .eq('category_id', categoryId);
    
    if (error) return { data: null, error };
    
    // Przekształć dane do prostszej struktury
    const clients = data
      ?.map(item => (item as any).clients)
      .filter(Boolean);
    
    return { data: clients, error: null };
  },

  /**
   * Sprawdź czy klient jest w kategorii
   */
  async isClientInCategory(clientId: string, categoryId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('client_category_assignments')
      .select('id')
      .eq('client_id', clientId)
      .eq('category_id', categoryId)
      .single();
    
    return !error && data !== null;
  },

  /**
   * Pobierz ID wszystkich kategorii dla klienta (do szybkiego sprawdzania)
   */
  async getClientCategoryIds(clientId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('client_category_assignments')
      .select('category_id')
      .eq('client_id', clientId);
    
    if (error || !data) return [];
    
    return data.map(item => item.category_id);
  },

  /**
   * Przełącz przynależność klienta do kategorii (toggle)
   */
  async toggleClientCategory(clientId: string, categoryId: string) {
    // Sprawdź czy jest już przypisany
    const isAssigned = await this.isClientInCategory(clientId, categoryId);
    
    if (isAssigned) {
      // Usuń przypisanie
      return await this.removeClientFromCategory(clientId, categoryId);
    } else {
      // Dodaj przypisanie
      return await this.assignClientToCategory(clientId, categoryId);
    }
  },
};

