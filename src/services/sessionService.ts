import { supabase } from '../lib/supabase';

export interface Session {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  session_type: string;
  notes?: string;
  coach_id: string;
}

export const sessionService = {
  // Get all sessions for coach
  async getSessions(coachId: string): Promise<Session[]> {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('coach_id', coachId)
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  },

  // Create new session
  async createSession(session: {
    title: string;
    session_date: string;
    start_time: string;
    end_time?: string;
    session_type: string;
    notes?: string;
    coach_id: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('training_sessions')
        .insert(session);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      return false;
    }
  },

  // Get session with attendance
  async getSessionWithAttendance(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          *,
          attendance (
            id,
            client_id,
            present,
            clients (
              id,
              name
            )
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching session with attendance:', error);
      return null;
    }
  },
};



