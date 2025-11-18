import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/clientService';
import { colors } from '../../theme/colors';

interface Client {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  active: boolean;
}

export default function ClientsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  // Refresh clients when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchClients();
      }
    }, [user])
  );

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    const data = await clientService.getClients(user.id);
    setClients(data);
    setLoading(false);
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'This client does not have a phone number.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  };

  // Filter clients based on search
  const filteredClients = clients.filter((client) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      (client.phone && client.phone.includes(query))
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clients</Text>
          <Text style={styles.subtitle}>{clients.length} total clients</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddClient')}
        >
          <Ionicons name="add" size={28} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search clients..."
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Clients List */}
      <ScrollView
        style={styles.clientsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.clientsListContent}
      >
        {filteredClients.length > 0 ? (
          filteredClients.map((client, index) => (
            <Animated.View key={client.id} entering={FadeInUp.delay(index * 30).springify()}>
              <TouchableOpacity
                style={styles.clientCard}
                onPress={() => navigation.navigate('ClientDetail', { clientId: client.id })}
                activeOpacity={0.8}
              >
                {/* Avatar */}
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.clientAvatar}
                >
                  <Text style={styles.clientAvatarText}>
                    {client.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>

                {/* Info */}
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName} numberOfLines={1}>
                    {client.name}
                  </Text>
                  <Text style={styles.clientPhone} numberOfLines={1}>
                    {client.phone || 'No phone number'}
                  </Text>
                  {client.active && (
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Active</Text>
                    </View>
                  )}
                </View>

                {/* Call Button */}
                {client.phone && (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCall(client.phone);
                    }}
                  >
                    <Ionicons name="call" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          ))
        ) : (
          <Animated.View entering={FadeInUp.delay(100)} style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No clients found' : 'No clients yet'}
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('AddClient')}
            >
              <Ionicons name="add" size={16} color={colors.background} />
              <Text style={styles.emptyStateButtonText}>Add Your First Client</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textPrimary,
  },
  clientsList: {
    flex: 1,
  },
  clientsListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: colors.background,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  clientPhone: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: colors.primary,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyStateText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: colors.background,
  },
});
