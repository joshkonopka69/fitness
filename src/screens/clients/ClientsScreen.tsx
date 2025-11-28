import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import CategoryOptionsModal from '../../components/ui/CategoryOptionsModal';
import CreateCategoryModal from '../../components/ui/CreateCategoryModal';
import { useAuth } from '../../contexts/AuthContext';
import { categoryService } from '../../services/categoryService';
import { clientService } from '../../services/clientService';
import { paymentTrackingService } from '../../services/paymentTrackingService';
import { colors } from '../../theme/colors';
import { ClientCategory } from '../../types/category';
import { formatMonthYear, getCurrentMonthYear } from '../../types/paymentTracking';

interface Client {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  active: boolean;
  has_paid?: boolean; // Status płatności w bieżącym miesiącu
}

export default function ClientsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // State dla kategorii
  const [categories, setCategories] = useState<ClientCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [clientCategoryIds, setClientCategoryIds] = useState<Map<string, string[]>>(new Map());

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [selectedCategoryForAction, setSelectedCategoryForAction] = useState<ClientCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<ClientCategory | null>(null);
  const [parentForSubcategory, setParentForSubcategory] = useState<ClientCategory | null>(null);

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchCategories();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchClients();
        fetchCategories();
      }
    }, [user])
  );

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    const data = await clientService.getClients(user.id);
    
    // Pobierz kategorie i status płatności dla każdego klienta
    const categoryMap = new Map<string, string[]>();
    const clientsWithPaymentStatus = await Promise.all(
      data.map(async (client) => {
        // Kategorie
      const categoryIds = await categoryService.getClientCategoryIds(client.id);
      categoryMap.set(client.id, categoryIds);
        
        // Status płatności
        const { has_paid } = await paymentTrackingService.getClientPaymentStatus(client.id);
        
        console.log(`Client "${client.name}" - categories:`, categoryIds, 'has_paid:', has_paid);
        
        return {
          ...client,
          has_paid,
        };
      })
    );
    
    setClients(clientsWithPaymentStatus);
    setClientCategoryIds(categoryMap);
    
    console.log('Total clients:', clientsWithPaymentStatus.length);
    console.log('Category map size:', categoryMap.size);
    
    setLoading(false);
  };

  const fetchCategories = async () => {
    if (!user) return;
    // Pobierz WSZYSTKIE kategorie (główne + podkategorie)
    const { data } = await categoryService.getAllCategories(user.id);
    if (data) {
      // Grupuj po głównych kategoriach
      const mainCats = data.filter(cat => !cat.parent_category_id);
      const subCats = data.filter(cat => cat.parent_category_id);
      
      // Dodaj podkategorie do głównych kategorii
      mainCats.forEach(main => {
        main.subcategories = subCats.filter(sub => sub.parent_category_id === main.id);
      });
      
      setCategories(mainCats);
    }
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'This client does not have a phone number.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  };

  // ===== KATEGORIE =====

  const handleCreateCategory = async (data: {
    name: string;
    location?: string;
    icon: string;
    color: string;
  }) => {
    if (!user) return;

    const { error } = await categoryService.createCategory({
      coach_id: user.id,
      name: data.name,
      location: data.location,
      parent_category_id: parentForSubcategory?.id,
      icon: data.icon,
      color: data.color,
    });

    if (error) {
      Alert.alert('Błąd', 'Nie udało się utworzyć kategorii');
    } else {
      Alert.alert('Sukces', 'Kategoria utworzona!');
      fetchCategories();
      setParentForSubcategory(null);
    }
  };

  const handleEditCategory = async (data: {
    name: string;
    location?: string;
    icon: string;
    color: string;
  }) => {
    if (!editingCategory) return;

    const { error } = await categoryService.updateCategory(editingCategory.id, data);

    if (error) {
      Alert.alert('Błąd', 'Nie udało się zaktualizować kategorii');
    } else {
      Alert.alert('Sukces', 'Kategoria zaktualizowana!');
      fetchCategories();
      setEditingCategory(null);
    }
  };

  const handleDeleteCategory = () => {
    if (!selectedCategoryForAction) return;

    Alert.alert(
      'Usuń kategorię',
      `Czy na pewno chcesz usunąć "${selectedCategoryForAction.name}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            const { error } = await categoryService.deleteCategory(selectedCategoryForAction.id);
            if (error) {
              Alert.alert('Błąd', 'Nie udało się usunąć kategorii');
            } else {
              Alert.alert('Sukces', 'Kategoria usunięta');
              fetchCategories();
              setShowOptionsModal(false);
              setSelectedCategoryForAction(null);
              if (selectedCategory === selectedCategoryForAction.id) {
                setSelectedCategory(null);
              }
            }
          },
        },
      ]
    );
  };

  const handleToggleClientCategory = async (clientId: string, categoryId: string) => {
    const { error } = await categoryService.toggleClientCategory(clientId, categoryId);
    if (error) {
      Alert.alert('Błąd', 'Nie udało się zaktualizować');
    } else {
      fetchClients();
      fetchCategories();
    }
  };

  // ===== PŁATNOŚCI =====

  const handleTogglePaymentStatus = async (client: Client) => {
    if (!user) return;
    
    const { year, month } = getCurrentMonthYear();
    const currentStatus = client.has_paid || false;
    const newStatus = !currentStatus;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      newStatus ? 'Oznacz jako zapłacone' : 'Oznacz jako nieopłacone',
      `Czy na pewno chcesz oznaczyć ${client.name} jako ${newStatus ? 'zapłaconego' : 'nieopłaconego'} za ${formatMonthYear(year, month)}?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Potwierdź',
          onPress: async () => {
            const { error } = await paymentTrackingService.toggleClientPaymentStatus(
              user.id,
              client.id,
              currentStatus
            );
            
            if (error) {
              Alert.alert('Błąd', 'Nie udało się zaktualizować statusu płatności');
            } else {
              Alert.alert('Sukces', `${client.name} został oznaczony jako ${newStatus ? 'zapłacony' : 'nieopłacony'}`);
              fetchClients(); // Odśwież listę
            }
          },
        },
      ]
    );
  };

  // Filtruj klientów
  const filteredClients = clients.filter((client: Client) => {
    // Filtr wyszukiwania
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        client.name.toLowerCase().includes(query) ||
        (client.phone && client.phone.includes(query));
      if (!matchesSearch) return false;
    }

    // Filtr kategorii
    if (selectedCategory) {
      // Wybrana kategoria - pokaż tylko klientów z tej kategorii
      const clientCategories = clientCategoryIds.get(client.id) || [];
      return clientCategories.includes(selectedCategory);
    }
    
    // "Wszystkie" - pokaż WSZYSTKICH klientów
    return true;
  });

  // Grupuj klientów według kategorii dla wyświetlania
  const getClientsGroupedByCategory = () => {
    if (selectedCategory) {
      // Wybrana kategoria - zwróć tylko filtrowanych klientów
      return [{ category: null, clients: filteredClients }];
    }

    // "Wszystkie" - grupuj klientów według kategorii
    const grouped: { category: ClientCategory | null; clients: Client[] }[] = [];
    
    // Najpierw klienci bez kategorii
    const uncategorizedClients = clients.filter((client: Client) => {
      const clientCategories = clientCategoryIds.get(client.id) || [];
      return clientCategories.length === 0;
    }).filter((client: Client) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return client.name.toLowerCase().includes(query) ||
        (client.phone && client.phone.includes(query));
    });
    
    if (uncategorizedClients.length > 0) {
      grouped.push({ category: null, clients: uncategorizedClients });
    }

    // Następnie klienci pogrupowani według kategorii
    categories.forEach((category: ClientCategory) => {
      const categoryClients = clients.filter((client: Client) => {
        const clientCategories = clientCategoryIds.get(client.id) || [];
        return clientCategories.includes(category.id);
      }).filter((client: Client) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return client.name.toLowerCase().includes(query) ||
          (client.phone && client.phone.includes(query));
      });
      
      if (categoryClients.length > 0) {
        grouped.push({ category, clients: categoryClients });
      }
      
      // Dodaj także klientów z podkategorii
      category.subcategories?.forEach((subcategory: ClientCategory) => {
        const subClients = clients.filter((client: Client) => {
          const clientCategories = clientCategoryIds.get(client.id) || [];
          return clientCategories.includes(subcategory.id);
        }).filter((client: Client) => {
          if (!searchQuery.trim()) return true;
          const query = searchQuery.toLowerCase();
          return client.name.toLowerCase().includes(query) ||
            (client.phone && client.phone.includes(query));
        });
        
        if (subClients.length > 0) {
          grouped.push({ category: subcategory, clients: subClients });
        }
      });
    });

    return grouped;
  };

  const groupedClients = getClientsGroupedByCategory();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clients</Text>
          <Text style={styles.subtitle}>{clients.length} total clients</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => {
              setParentForSubcategory(null);
              setEditingCategory(null);
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="grid-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddClient')}
          >
            <Ionicons name="add" size={28} color={colors.background} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Kategorie */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {/* Wszystkie */}
          <TouchableOpacity
            style={[
              styles.categoryTile,
              !selectedCategory && styles.categoryTileSelected,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={styles.categoryName}>Wszystkie</Text>
            <Text style={styles.categoryCount}>{clients.length}</Text>
          </TouchableOpacity>

          {/* TYLKO Kategorie Główne (bez podkategorii) */}
          {categories.map((category: ClientCategory) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryTile,
                { borderColor: category.color },
                selectedCategory === category.id && styles.categoryTileSelected,
              ]}
              onPress={() => setSelectedCategory(category.id)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSelectedCategoryForAction(category);
                setShowOptionsModal(true);
              }}
            >
              <Text style={styles.categoryName} numberOfLines={1}>
                {category.name}
              </Text>
              {category.location && (
                <Text style={styles.categoryLocation} numberOfLines={1}>
                  {category.location}
                </Text>
              )}
              <Text style={styles.categoryCount}>{category.client_count || 0}</Text>
              
              {/* Badge z liczbą podkategorii */}
              {(category.subcategories?.length || 0) > 0 && (
                <View style={styles.subcategoryBadge}>
                  <Text style={styles.subcategoryBadgeText}>
                    +{category.subcategories?.length}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.categoryOptionsButton}
                onPress={() => {
                  setSelectedCategoryForAction(category);
                  setShowOptionsModal(true);
                }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color="#666" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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

      {/* Podkategorie jako Lista Kafelków (gdy wybrana kategoria główna) */}
      {selectedCategory && (() => {
        const selectedCat = categories.find((c: ClientCategory) => c.id === selectedCategory);
        const subcategories = selectedCat?.subcategories || [];
        
        if (subcategories.length > 0) {
          return (
            <View style={styles.subcategoriesGrid}>
              <Text style={styles.subcategoriesTitle}>Grupy w tej kategorii:</Text>
              {subcategories.map((sub: ClientCategory) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.subcategoryCardLarge,
                    { borderLeftColor: sub.color },
                  ]}
                  onPress={() => setSelectedCategory(sub.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subcategoryCardContent}>
                    <View style={styles.subcategoryCardInfo}>
                      <Text style={styles.subcategoryCardNameLarge} numberOfLines={2}>
                        {sub.name}
                      </Text>
                      <Text style={styles.subcategoryCardCountLarge}>
                        {sub.client_count || 0} klientów
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.subcategoryCardOptions}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategoryForAction(sub);
                      setShowOptionsModal(true);
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          );
        }
        return null;
      })()}


      {/* Clients List */}
      <ScrollView
        style={styles.clientsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.clientsListContent}
      >
        {filteredClients.length > 0 ? (
          // Gdy wybrana kategoria - pokaż bez grupowania
          selectedCategory ? (
            filteredClients.map((client: Client, index: number) => (
              <Animated.View key={client.id} entering={FadeInUp.delay(index * 30).springify()}>
                <TouchableOpacity
                  style={styles.clientCard}
                  onPress={() => navigation.navigate('ClientDetail', { clientId: client.id })}
                  onLongPress={() => handleTogglePaymentStatus(client)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={styles.clientAvatar}
                  >
                    <Text style={styles.clientAvatarText}>
                      {client.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={styles.clientInfo}>
                    <View style={styles.clientNameRow}>
                      <Text style={styles.clientName} numberOfLines={1}>{client.name}</Text>
                      {client.has_paid ? (
                        <View style={styles.paidBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        </View>
                      ) : (
                        <View style={styles.unpaidBadge}>
                          <Ionicons name="alert-circle" size={16} color={colors.destructive} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.clientPhone} numberOfLines={1}>
                      {client.phone || 'No phone number'}
                    </Text>
                  </View>
                  {client.phone && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={(e: any) => { e.stopPropagation(); handleCall(client.phone); }}
                    >
                      <Ionicons name="call" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            // "Wszystkie" - pokaż pogrupowanych klientów
            groupedClients.map((group: { category: ClientCategory | null; clients: Client[] }, groupIndex: number) => (
              <View key={group.category?.id || 'uncategorized'}>
                {/* Section Header */}
                <View style={[
                  styles.sectionHeader,
                  group.category && { borderLeftColor: group.category.color, borderLeftWidth: 4 }
                ]}>
                  <Ionicons 
                    name={group.category ? 'folder' : 'person'} 
                    size={18} 
                    color={group.category?.color || colors.textSecondary} 
                  />
                  <Text style={styles.sectionTitle}>
                    {group.category?.name || 'Prywatne lekcje'}
                  </Text>
                  <View style={styles.sectionCount}>
                    <Text style={styles.sectionCountText}>{group.clients.length}</Text>
                  </View>
                </View>
                
                {/* Clients in this group */}
                {group.clients.map((client: Client, index: number) => (
                  <Animated.View key={client.id} entering={FadeInUp.delay((groupIndex * 10 + index) * 20).springify()}>
                    <TouchableOpacity
                      style={styles.clientCard}
                      onPress={() => navigation.navigate('ClientDetail', { clientId: client.id })}
                      onLongPress={() => handleTogglePaymentStatus(client)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[group.category?.color || colors.primary, colors.secondary]}
                        style={styles.clientAvatar}
                      >
                        <Text style={styles.clientAvatarText}>
                          {client.name.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                      <View style={styles.clientInfo}>
                        <View style={styles.clientNameRow}>
                          <Text style={styles.clientName} numberOfLines={1}>{client.name}</Text>
                          {client.has_paid ? (
                            <View style={styles.paidBadge}>
                              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                            </View>
                          ) : (
                            <View style={styles.unpaidBadge}>
                              <Ionicons name="alert-circle" size={16} color={colors.destructive} />
                            </View>
                          )}
                        </View>
                        <Text style={styles.clientPhone} numberOfLines={1}>
                          {client.phone || 'No phone number'}
                        </Text>
                      </View>
                      {client.phone && (
                        <TouchableOpacity
                          style={styles.callButton}
                          onPress={(e: any) => { e.stopPropagation(); handleCall(client.phone); }}
                        >
                          <Ionicons name="call" size={20} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            ))
          )
        ) : (
          <Animated.View entering={FadeInUp.delay(100)} style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedCategory ? 'No clients found' : 'No clients yet'}
            </Text>
            {!searchQuery && !selectedCategory && (
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('AddClient')}
              >
                <Ionicons name="add" size={16} color={colors.background} />
                <Text style={styles.emptyStateButtonText}>Add Your First Client</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* MODALS */}
      
      {/* Create/Edit Category Modal */}
      <CreateCategoryModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setParentForSubcategory(null);
          setEditingCategory(null);
        }}
        onSave={editingCategory ? handleEditCategory : handleCreateCategory}
        parentCategory={parentForSubcategory}
        editingCategory={editingCategory}
      />

      {/* Category Options Modal */}
      <CategoryOptionsModal
        visible={showOptionsModal}
        onClose={() => {
          setShowOptionsModal(false);
          setSelectedCategoryForAction(null);
        }}
        category={selectedCategoryForAction}
        onEdit={() => {
          setEditingCategory(selectedCategoryForAction);
          setShowOptionsModal(false);
          setShowCreateModal(true);
        }}
        onAddSubcategory={() => {
          setParentForSubcategory(selectedCategoryForAction);
          setShowOptionsModal(false);
          setShowCreateModal(true);
        }}
        onAddNewClient={() => {
          // Przekieruj do AddClient z pre-selected category
          setShowOptionsModal(false);
          navigation.navigate('AddClient', { 
            preSelectedCategoryId: selectedCategoryForAction?.id 
          });
        }}
        onAddClients={() => {
          setShowOptionsModal(false);
          setShowClientPicker(true);
        }}
        onDelete={handleDeleteCategory}
      />

      {/* Client Picker Modal */}
      <Modal visible={showClientPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                Przypisz klientów: {selectedCategoryForAction?.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowClientPicker(false);
                  setSelectedCategoryForAction(null);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerList}>
              {clients.map((client: Client) => {
                const isAssigned = clientCategoryIds
                  .get(client.id)
                  ?.includes(selectedCategoryForAction?.id || '') || false;

                return (
                  <TouchableOpacity
                    key={client.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      if (selectedCategoryForAction) {
                        handleToggleClientCategory(client.id, selectedCategoryForAction.id);
                      }
                    }}
                  >
                    <Text style={styles.pickerItemText}>{client.name}</Text>
                    <Ionicons
                      name={isAssigned ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={isAssigned ? colors.primary : '#ccc'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesScroll: {
    maxHeight: 140,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryTile: {
    width: 120,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  categoryTileSelected: {
    backgroundColor: '#F0F8FF',
  },
  categoryName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  categoryLocation: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryCount: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: colors.primary,
  },
  categoryOptionsButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  // Style dla podkategorii
  subcategoryTile: {
    width: 100,
    padding: 10,
    opacity: 0.95,
  },
  subcategoryName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 14,
  },
  subcategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  subcategoryBadgeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 10,
    color: 'white',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  sectionCount: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionCountText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
    color: colors.primary,
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
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  clientName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  paidBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.success}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unpaidBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.destructive}20`,
    alignItems: 'center',
    justifyContent: 'center',
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  pickerList: {
    flex: 1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  pickerItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: colors.textPrimary,
  },
  // Podkategorie Grid
  subcategoriesGrid: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  subcategoriesTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  // Duże kafelki podkategorii (pełna szerokość)
  subcategoryCardLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subcategoryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subcategoryCardInfo: {
    flex: 1,
  },
  subcategoryCardNameLarge: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subcategoryCardCountLarge: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  subcategoryCardOptions: {
    padding: 8,
    marginLeft: 8,
  },
});

