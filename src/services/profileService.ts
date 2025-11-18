import { supabase } from '../lib/supabase';

export interface CoachProfile {
  id: string;
  name: string;
  email: string;
  gymName?: string;
  phone?: string;
  since: string;
}

export interface ProfileStats {
  totalSessions: number;
  totalClients: number;
  avgAttendanceRate: number;
}

export interface SubscriptionStatus {
  status: 'trial' | 'active' | 'expired';
  isActive: boolean;
  daysLeft: number;
}

export const profileService = {
  // Get coach profile
  async getCoachProfile(userId: string): Promise<CoachProfile | null> {
    try {
      // First, try to get the coach profile
      let { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('id', userId)
        .single();

      // If coach doesn't exist, create it
      if (error && error.code === 'PGRST116') {
        console.log('Coach profile not found, creating one...');
        
        // Get user info from auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Create coach record
          const { error: insertError } = await supabase
            .from('coaches')
            .insert({
              id: userId,
              name: user.email?.split('@')[0] || 'Coach',
              email: user.email || '',
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('Error creating coach profile:', insertError);
            return null;
          }

          // Try fetching again
          const result = await supabase
            .from('coaches')
            .select('*')
            .eq('id', userId)
            .single();
          
          data = result.data;
          error = result.error;
        }
      }

      if (error || !data) {
        console.error('Error fetching coach profile:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        gymName: data.gym_name,
        phone: data.phone,
        since: new Date(data.created_at).getFullYear().toString(),
      };
    } catch (error) {
      console.error('Error fetching coach profile:', error);
      return null;
    }
  },

  // Get profile stats
  async getProfileStats(userId: string): Promise<ProfileStats> {
    try {
      const { data, error } = await supabase
        .from('coach_statistics')
        .select('*')
        .eq('coach_id', userId)
        .maybeSingle(); // Changed from .single() to handle 0 rows gracefully

      // If no data, return zeros (coach exists but has no stats yet)
      if (!data) {
        console.log('No profile stats found, returning zeros (this is normal for new coaches)');
        return {
          totalSessions: 0,
          totalClients: 0,
          avgAttendanceRate: 0,
        };
      }

      if (error) {
        console.error('Error fetching profile stats:', error);
        return {
          totalSessions: 0,
          totalClients: 0,
          avgAttendanceRate: 0,
        };
      }

      return {
        totalSessions: data.total_sessions || 0,
        totalClients: data.total_clients || 0,
        avgAttendanceRate: data.avg_attendance_rate || 0,
      };
    } catch (error) {
      console.error('Error fetching profile stats:', error);
      return {
        totalSessions: 0,
        totalClients: 0,
        avgAttendanceRate: 0,
      };
    }
  },

  // Update coach profile
  async updateProfile(
    userId: string,
    updates: {
      name?: string;
      gymName?: string;
      phone?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('coaches')
        .update({
          name: updates.name,
          gym_name: updates.gymName,
          phone: updates.phone,
        })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  },

  // Get subscription status
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('subscription_status, trial_ends_at, subscription_ends_at')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching subscription status:', error);
        return {
          status: 'trial',
          isActive: true,
          daysLeft: 30,
        };
      }

      const now = new Date();
      let status: 'trial' | 'active' | 'expired' = 'trial';
      let isActive = false;
      let daysLeft = 0;

      // Check if user has active subscription
      if (data.subscription_status === 'active' && data.subscription_ends_at) {
        const subscriptionEnd = new Date(data.subscription_ends_at);
        if (subscriptionEnd > now) {
          status = 'active';
          isActive = true;
          daysLeft = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          status = 'expired';
          isActive = false;
          daysLeft = 0;
        }
      }
      // Check if user is on trial
      else if (data.subscription_status === 'trial' && data.trial_ends_at) {
        const trialEnd = new Date(data.trial_ends_at);
        if (trialEnd > now) {
          status = 'trial';
          isActive = true;
          daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          status = 'expired';
          isActive = false;
          daysLeft = 0;
        }
      }
      // Expired or no subscription
      else {
        status = 'expired';
        isActive = false;
        daysLeft = 0;
      }

      return {
        status,
        isActive,
        daysLeft,
      };
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      return {
        status: 'trial',
        isActive: true,
        daysLeft: 30,
      };
    }
  },
};

