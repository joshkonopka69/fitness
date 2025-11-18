// ===============================================
// MODAL Z OPCJAMI KATEGORII
// ===============================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClientCategory } from '../../types/category';

interface Props {
  visible: boolean;
  onClose: () => void;
  category: ClientCategory | null;
  onEdit: () => void;
  onAddSubcategory: () => void;
  onAddClients: () => void;
  onAddNewClient: () => void;
  onDelete: () => void;
}

export default function CategoryOptionsModal({
  visible,
  onClose,
  category,
  onEdit,
  onAddSubcategory,
  onAddClients,
  onAddNewClient,
  onDelete,
}: Props) {
  if (!category) return null;

  const isMainCategory = !category.parent_category_id;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modal}>
          {/* Nagłówek */}
          <View style={styles.header}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <View>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.location && (
                  <Text style={styles.categoryLocation}>{category.location}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Opcje */}
          <View style={styles.options}>
            {/* Edytuj nazwę */}
            <TouchableOpacity style={styles.option} onPress={onEdit}>
              <View style={styles.optionLeft}>
                <Ionicons name="pencil" size={20} color="#007AFF" />
                <Text style={styles.optionText}>Edytuj kategorię</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            {/* Dodaj NOWEGO klienta */}
            <TouchableOpacity style={styles.option} onPress={onAddNewClient}>
              <View style={styles.optionLeft}>
                <Ionicons name="person-add" size={20} color="#34C759" />
                <Text style={styles.optionText}>Dodaj nowego klienta</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            {/* Przypisz istniejących klientów */}
            <TouchableOpacity style={styles.option} onPress={onAddClients}>
              <View style={styles.optionLeft}>
                <Ionicons name="people" size={20} color="#007AFF" />
                <Text style={styles.optionText}>Przypisz istniejących</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            {/* Dodaj podkategorię (tylko dla głównej kategorii) */}
            {isMainCategory && (
              <TouchableOpacity style={styles.option} onPress={onAddSubcategory}>
                <View style={styles.optionLeft}>
                  <Ionicons name="add-circle" size={20} color="#FF9500" />
                  <Text style={styles.optionText}>Dodaj podkategorię</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            )}

            {/* Separator */}
            <View style={styles.separator} />

            {/* Usuń */}
            <TouchableOpacity style={styles.option} onPress={onDelete}>
              <View style={styles.optionLeft}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
                <Text style={[styles.optionText, styles.dangerText]}>
                  Usuń kategorię
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryLocation: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  options: {
    gap: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dangerText: {
    color: '#FF3B30',
  },
  separator: {
    height: 12,
  },
});

