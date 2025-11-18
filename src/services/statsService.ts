import { supabase } from '../lib/supabase';

export interface CoachStats {
  totalClients: number;
  activeClients: number;
  avgAttendanceRate: number;
  monthlyRevenue: number;
  totalSessions: number;
}

export interface WeeklyData {
  day: string;
  sessions: number;
  attendance: number;
}

export interface MembershipDistribution {
  type: string;
  count: number;
  color: string;
}

export const statsService = {
  // Get coach statistics
  async getCoachStats(coachId: string): Promise<CoachStats> {
    try {
      const { data, error } = await supabase
        .from('coach_statistics')
        .select('*')
        .eq('coach_id', coachId)
        .maybeSingle(); // Changed from .single() to handle 0 rows gracefully

      // If no data, return zeros (coach exists but has no stats yet)
      if (!data) {
        console.log('No stats found for coach, returning zeros (this is normal for new coaches)');
        return {
          totalClients: 0,
          activeClients: 0,
          avgAttendanceRate: 0,
          monthlyRevenue: 0,
          totalSessions: 0,
        };
      }

      if (error) {
        console.error('Error fetching coach stats:', error);
        return {
          totalClients: 0,
          activeClients: 0,
          avgAttendanceRate: 0,
          monthlyRevenue: 0,
          totalSessions: 0,
        };
      }

      return {
        totalClients: data.total_clients || 0,
        activeClients: data.active_clients || 0,
        avgAttendanceRate: data.avg_attendance_rate || 0,
        monthlyRevenue: data.monthly_revenue || 0,
        totalSessions: data.total_sessions || 0,
      };
    } catch (error) {
      console.error('Error fetching coach stats:', error);
      return {
        totalClients: 0,
        activeClients: 0,
        avgAttendanceRate: 0,
        monthlyRevenue: 0,
        totalSessions: 0,
      };
    }
  },

  // Get weekly attendance data
  async getWeeklyAttendanceData(coachId: string): Promise<WeeklyData[]> {
    try {
      // Get sessions and attendance for the last 7 days
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select(`
          id,
          session_date,
          attendance (
            id,
            present
          )
        `)
        .eq('coach_id', coachId)
        .gte('session_date', sevenDaysAgo.toISOString().split('T')[0])
        .lte('session_date', today.toISOString().split('T')[0]);

      if (error) throw error;

      // Group by day of week
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dataByDay: { [key: string]: { sessions: number; attendance: number } } = {};

      // Initialize all days
      weekDays.forEach(day => {
        dataByDay[day] = { sessions: 0, attendance: 0 };
      });

      // Count sessions and attendance
      sessions?.forEach((session: any) => {
        const date = new Date(session.session_date);
        const dayName = weekDays[date.getDay()];
        dataByDay[dayName].sessions++;
        dataByDay[dayName].attendance += session.attendance?.filter(
          (a: any) => a.present
        ).length || 0;
      });

      return weekDays.map(day => ({
        day,
        sessions: dataByDay[day].sessions,
        attendance: dataByDay[day].attendance,
      }));
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      return [];
    }
  },

  // Get membership distribution
  async getMembershipDistribution(coachId: string): Promise<MembershipDistribution[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('membership_type')
        .eq('coach_id', coachId)
        .eq('active', true);

      if (error) throw error;

      const distribution: { [key: string]: number } = {};
      data?.forEach((client: any) => {
        const type = client.membership_type || 'Basic';
        distribution[type] = (distribution[type] || 0) + 1;
      });

      const colors: { [key: string]: string } = {
        'Basic': '#9CA3AF',
        'Standard': '#3B82F6',
        'Premium': '#8B5CF6',
        'Personal Training': '#F59E0B',
      };

      return Object.entries(distribution).map(([type, count]) => ({
        type,
        count,
        color: colors[type] || '#9CA3AF',
      }));
    } catch (error) {
      console.error('Error fetching membership distribution:', error);
      return [];
    }
  },
};

