import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, ActivityIndicator, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useField } from '../context/FieldContext';

type PlanNav = NativeStackNavigationProp<RootStackParamList>;
import { colors, font, radius } from '../constants/theme';
import { planApi } from '../services/api';
import { Plan } from '../types';

function PlanCard({ item }: { item: Plan }) {
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '';
  const reviewed = item.reviewedAt != null;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={[styles.badge, reviewed ? styles.badgeDone : styles.badgePending]}>
          {reviewed ? '済' : '未'}
        </Text>
        <Text style={styles.cardDate}>{date}</Text>
      </View>
      <Text style={styles.cardContent} numberOfLines={3}>{item.proposal}</Text>
      {item.reviewNote ? (
        <Text style={styles.cardNote} numberOfLines={2}>📝 {item.reviewNote}</Text>
      ) : null}
    </View>
  );
}

export default function PlanScreen() {
  const navigation = useNavigation<PlanNav>();
  const { activeField: field } = useField();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [proposal, setProposal] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await planApi.list(field);
      setPlans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [field]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  async function addPlan() {
    if (!proposal.trim() || saving || !field) return;
    setSaving(true);
    try {
      const created = await planApi.create({
        field,
        proposal: proposal.trim(),
        dialogHistory: [],
        reviewedAt: null,
        reviewNote: null,
      });
      setPlans(prev => [created, ...prev]);
      setProposal('');
      setModalVisible(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>プラン</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={plans}
          keyExtractor={item => item._id ?? item.proposal}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.placeholder}>
              <Text style={styles.icon}>📋</Text>
              <Text style={styles.emptyText}>プランがまだありません</Text>
              <Text style={styles.sub}>AI対話から生成、または手動で追加</Text>
            </View>
          }
          ListFooterComponent={
            field ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.addBtnText}>＋ プランを追加</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => <PlanCard item={item} />}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>プランを追加</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="例：次回は朝マズメにバイブレーション中層で試す"
              placeholderTextColor={colors.textMuted}
              value={proposal}
              onChangeText={setProposal}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setModalVisible(false); setProposal(''); }}>
                <Text style={styles.cancelBtn}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addPlan} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>追加</Text>
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
  container:   { flex: 1, backgroundColor: colors.bg },
  screenTitle: { fontSize: font.xl, fontWeight: '700', color: colors.text, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },

  list: { padding: 16, gap: 12 },

  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: 14, gap: 8,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:      { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgePending: { backgroundColor: '#fff3cd', color: '#856404' },
  badgeDone:    { backgroundColor: '#d1e7dd', color: '#0f5132' },
  cardDate:   { fontSize: font.xs, color: colors.textMuted },
  cardContent: { fontSize: font.sm, color: colors.text, lineHeight: 20 },
  cardNote:   { fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  icon:        { fontSize: 48 },
  emptyText:   { fontSize: font.md, fontWeight: '500', color: '#bbb' },
  sub:         { fontSize: font.sm, color: '#ccc' },

  addBtn: {
    marginTop: 8, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.primary, padding: 14, alignItems: 'center',
  },
  addBtnText: { color: colors.primary, fontWeight: '700', fontSize: font.md },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: font.lg, fontWeight: '700' },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 12,
    padding: 14, fontSize: font.md, color: colors.text, backgroundColor: colors.bgInput,
    textAlignVertical: 'top', height: 100,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  cancelBtn: { fontSize: font.md, color: colors.textMuted },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, minWidth: 60, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: font.md },
});
