// ===============================================
// MODAL DO TWORZENIA/EDYCJI KATEGORII KLIENTÓW
// ===============================================

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ClientCategory,
  DEFAULT_CATEGORY_COLORS,
  DEFAULT_CATEGORY_ICONS,
} from '../../types/category';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    location?: string;
    icon: string;
    color: string;
  }) => void;
  parentCategory?: ClientCategory | null;
  editingCategory?: ClientCategory | null;
}

export default function CreateCategoryModal({
  visible,
  onClose,
  onSave,
  parentCategory,
  editingCategory,
}: Props) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📍');
  const [selectedColor, setSelectedColor] = useState('#007AFF');

  // Załaduj dane przy edycji
  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setLocation(editingCategory.location || '');
      setSelectedIcon(editingCategory.icon);
      setSelectedColor(editingCategory.color);
    } else {
      // Reset dla nowej kategorii
      setName('');
      setLocation('');
      setSelectedIcon('📍');
      setSelectedColor('#007AFF');
    }
  }, [editingCategory, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Błąd', 'Wpisz nazwę kategorii');
      return;
    }

    onSave({
      name: name.trim(),
      location: location.trim() || undefined,
      icon: selectedIcon,
      color: selectedColor,
    });

    // Reset tylko jeśli nie edytujemy
    if (!editingCategory) {
      setName('');
      setLocation('');
      setSelectedIcon('📍');
      setSelectedColor('#007AFF');
    }
    
    onClose();
  };

  const getTitle = () => {
    if (editingCategory) {
      return 'Edytuj kategorię';
    }
    if (parentCategory) {
      return `Podkategoria: ${parentCategory.name}`;
    }
    return 'Nowa kategoria';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Nagłówek */}
            <View style={styles.header}>
              <Text style={styles.title}>{getTitle()}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Nazwa */}
            <Text style={styles.label}>Nazwa *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={
                parentCategory
                  ? 'np. Grupa A - poniedziałek 18:00'
                  : 'np. Gym FitZone'
              }
              autoFocus
            />

            {/* Lokalizacja (tylko dla głównej kategorii) */}
            {!parentCategory && !editingCategory?.parent_category_id && (
              <>
                <Text style={styles.label}>Lokalizacja (opcjonalnie)</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="np. ul. Sportowa 15, Warszawa"
                />
              </>
            )}

            {/* Ikona */}
            <Text style={styles.label}>Ikona</Text>
            <View style={styles.iconGrid}>
              {DEFAULT_CATEGORY_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconButton,
                    selectedIcon === icon && styles.iconButtonSelected,
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Kolor */}
            <Text style={styles.label}>Kolor</Text>
            <View style={styles.colorGrid}>
              {DEFAULT_CATEGORY_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorButtonSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            {/* Przyciski */}
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>
                  {editingCategory ? 'Zapisz' : 'Utwórz'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#f5f5f5',
  },
  iconButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  iconText: {
    fontSize: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#333',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});







