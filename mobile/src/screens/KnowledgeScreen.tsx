import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Modal, TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font } from '../constants/theme';
import { mockKnowledge } from '../constants/mockData';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Knowledge'>;
  route: RouteProp<RootStackParamList, 'Knowledge'>;
};

export default function KnowledgeScreen({ navigation, route }: Props) {
  const { field } = route.params;
  const existingCategories = [...new Set(mockKnowledge.filter(k => k.field === field).map(k => k.category))];
  const [categories, setCategories] = useState<string[]>(existingCategories);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  function addCategory() {
    if (!newName.trim()) return;
    setCategories([...categories, newName.trim()]);
    setNewName('');
    setModalVisible(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{field}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.navigate('Web', { field })}>
            <Text style={styles.actionIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Chat', { field })}>
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={[styles.actionIcon, styles.actionIconActive]}>📚</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Plan', { field })}>
            <Text style={styles.actionIcon}>📋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[...categories, '__add__']}
        keyExtractor={(item) => item}
        renderItem={({ item }) =>
          item === '__add__' ? (
            <TouchableOpacity style={styles.linkItem} onPress={() => setModalVisible(true)}>
              <Text style={styles.addText}>＋</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => navigation.navigate('KnowledgeCategory', { field, category: item })}
              activeOpacity={0.6}
            >
              <Text style={styles.linkText}>{item}</Text>
            </TouchableOpacity>
          )
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>カテゴリを追加</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="例：タイミング、場所、道具…"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtn}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={addCategory}>
                <Text style={styles.addBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { fontSize: 20, color: colors.text, marginRight: 16 },
  title: { fontSize: font.lg, fontWeight: '700', flex: 1 },
  actions: { flexDirection: 'row', gap: 4 },
  actionIcon: { fontSize: 20, padding: 6, color: colors.text },
  actionIconActive: { opacity: 0.4 },
  linkItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  linkText: { fontSize: 16, color: colors.link, textDecorationLine: 'underline' },
  addText: { fontSize: 22, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: font.lg, fontWeight: '700' },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 12,
    padding: 14, fontSize: font.md, color: colors.text, backgroundColor: colors.bgInput,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  cancelBtn: { fontSize: font.md, color: colors.textMuted },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: font.md },
});
