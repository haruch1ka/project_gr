import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Modal, TextInput, ActivityIndicator, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font } from '../constants/theme';
import { knowledgeApi } from '../services/api';
import { Knowledge } from '../types';
import { ArrowLeftIcon } from 'react-native-heroicons/outline';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'KnowledgeCategory'>;
  route: RouteProp<RootStackParamList, 'KnowledgeCategory'>;
};

export default function KnowledgeCategoryScreen({ navigation, route }: Props) {
  const { field, category } = route.params;
  const [items, setItems] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const data = await knowledgeApi.list({ field });
      setItems(data.filter(k => k.category === category));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [field, category]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function addItem() {
    if (!newContent.trim() || saving) return;
    setSaving(true);
    try {
      const created = await knowledgeApi.create({
        field, category,
        content: newContent.trim(),
        webSources: [], supportingExperiences: [], contradictingExperiences: [],
        confidenceScore: 0.2, status: 'hypothesis', tags: [],
      });
      setItems(prev => [...prev, created]);
      setNewContent('');
      setModalVisible(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeftIcon size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>{category}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={[...items, null]}
          keyExtractor={(item, i) => item?._id ?? String(i)}
          renderItem={({ item }) =>
            item === null ? (
              <TouchableOpacity style={styles.linkItem} onPress={() => setModalVisible(true)}>
                <Text style={styles.addText}>＋</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.linkItem}
                onPress={() => navigation.navigate('KnowledgeItem', { field, category, id: item._id! })}
                activeOpacity={0.6}
              >
                <Text style={styles.linkText}>{item.content}</Text>
              </TouchableOpacity>
            )
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>知識を追加</Text>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="例：朝マズメは中層レンジが基本"
              placeholderTextColor={colors.textMuted}
              value={newContent}
              onChangeText={setNewContent}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setModalVisible(false); setNewContent(''); }}>
                <Text style={styles.cancelBtn}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.addBtnText}>追加</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </TouchableWithoutFeedback>
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
  linkItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  linkText: { fontSize: 16, color: colors.link, textDecorationLine: 'underline' },
  addText: { fontSize: 22, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: font.lg, fontWeight: '700' },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 12,
    padding: 14, fontSize: font.md, color: colors.text, backgroundColor: colors.bgInput,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  cancelBtn: { fontSize: font.md, color: colors.textMuted },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, minWidth: 60, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: font.md },
});
