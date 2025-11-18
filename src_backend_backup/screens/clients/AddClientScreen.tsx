import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  membership_due_date: string | null;
  monthly_fee: number;
  active: boolean;
}

export default function AddClientScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { client } = route.params || {};
  const isEditing = !!client;

  const [name, setName] = useState(client?.name || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [monthlyFee, setMonthlyFee] = useState(client?.monthly_fee?.toString() || '200');
  const [dueDate, setDueDate] = useState(
    client?.membership_due_date 
      ? new Date(client.membership_due_date) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const dueDateString = dueDate.toISOString().split('T')[0];
      const fee = parseInt(monthlyFee) || 200;

      if (isEditing) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            name: name.trim(),
            phone: phone.trim() || null,
            monthly_fee: fee,
            membership_due_date: dueDateString,
          })
          .eq('id', client.id);

        if (error) throw error;
        Alert.alert('Success', 'Client updated successfully!');
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            name: name.trim(),
            phone: phone.trim() || null,
            monthly_fee: fee,
            membership_due_date: dueDateString,
            coach_id: user.id,
            active: true,
          });

        if (error) throw error;
        Alert.alert('Success', 'Client added successfully!');
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditing ? 'Edit Client' : 'Add Client'}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter client name"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          placeholderTextColor="#666"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Monthly Fee</Text>
        <TextInput
          style={styles.input}
          placeholder="200"
          placeholderTextColor="#666"
          value={monthlyFee}
          onChangeText={setMonthlyFee}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Next Payment Due</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.pickerText}>{formatDate(dueDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : (isEditing ? 'Update Client' : 'Add Client')}
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dueDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDueDate(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    color: '#00FF88',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  form: {
    flex: 1,
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  pickerButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  pickerText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

