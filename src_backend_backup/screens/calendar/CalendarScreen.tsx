import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Session {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
}

export default function CalendarScreen({ navigation }: any) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('coach_id', user.id)
        .order('session_date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    
    sessions.forEach(session => {
      const date = session.session_date;
      marked[date] = {
        marked: true,
        dotColor: '#00FF88',
      };
    });

    // Highlight selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#00FF88',
      };
    }

    return marked;
  };

  const getSessionsForDate = (date: string) => {
    return sessions.filter(session => session.session_date === date);
  };

  const handleSessionPress = (session: Session) => {
    navigation.navigate('Attendance', { session });
  };

  const renderSessionItem = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => handleSessionPress(item)}
    >
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle}>{item.title}</Text>
        <Text style={styles.sessionTime}>{item.start_time}</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );

  const selectedDateSessions = getSessionsForDate(selectedDate);

  return (
    <View style={styles.container}>
      <Calendar
        style={styles.calendar}
        theme={{
          backgroundColor: '#0A0A0A',
          calendarBackground: '#0A0A0A',
          textSectionTitleColor: '#FFFFFF',
          selectedDayBackgroundColor: '#00FF88',
          selectedDayTextColor: '#000000',
          todayTextColor: '#00FF88',
          dayTextColor: '#FFFFFF',
          textDisabledColor: '#666666',
          dotColor: '#00FF88',
          selectedDotColor: '#000000',
          arrowColor: '#00FF88',
          monthTextColor: '#FFFFFF',
          indicatorColor: '#00FF88',
        }}
        markedDates={getMarkedDates()}
        onDayPress={(day) => setSelectedDate(day.dateString)}
      />

      <View style={styles.sessionsContainer}>
        <Text style={styles.sessionsTitle}>
          Sessions for {new Date(selectedDate).toLocaleDateString()}
        </Text>
        
        {selectedDateSessions.length > 0 ? (
          <FlatList
            data={selectedDateSessions}
            renderItem={renderSessionItem}
            keyExtractor={(item) => item.id}
            style={styles.sessionsList}
          />
        ) : (
          <Text style={styles.noSessions}>No sessions scheduled</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateSession')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  calendar: {
    marginBottom: 16,
  },
  sessionsContainer: {
    flex: 1,
    padding: 16,
  },
  sessionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  sessionsList: {
    flex: 1,
  },
  sessionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  arrow: {
    fontSize: 18,
    color: '#00FF88',
  },
  noSessions: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00FF88',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 24,
    color: '#000000',
    fontWeight: 'bold',
  },
});

