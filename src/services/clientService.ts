import { supabase } from '../lib/supabase';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  membership_type: string;
  monthly_fee: number;
  membership_due_date?: string;
  join_date?: string;
  notes?: string;
  active: boolean;
  coach_id: string;
}

export const clientService = {
  // Get all clients for coach
  async getClients(coachId: string): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('coach_id', coachId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  },

  // Get client with attendance rate
  async getClientWithStats(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('client_attendance_rates')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching client stats:', error);
      return null;
    }
  },

  // Create new client
  async createClient(client: Omit<Client, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clients')
        .insert(client);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating client:', error);
      return false;
    }
  },

  // Update client
  async updateClient(clientId: string, updates: Partial<Client>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating client:', error);
      return false;
    }
  },
};



