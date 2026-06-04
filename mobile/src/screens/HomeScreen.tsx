import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { mockFields, mockKnowledge } from '../constants/mockData';
import { Field } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ICONS = ['🎣', '💪', '📖', '🎸', '🏃', '✍️', '🎨', '🧘', '🌱'];

function StatusDot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function KnowledgeStatusChart({ fields }: { fields: Field[] }) {
  const all = mockKnowledge;
  const verified = all.filter(k => k.status === 'verified').length;
  const disproved = all.filter(k => k.status === 'disproved').length;
  const hypothesis = all.length - verified - disproved;
  const total = all.length || 1;

  const avgScore = Math.round(
    (all.reduce((s, k) => s + k.confidenceScore, 0) / total) * 100
  );

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>知識の状態（全体）</Text>
      <View style={styles.chartRow}>
        <View style={styles.donutWrap}>
          <View style={styles.donutOuter}>
            <View style={styles.donutInner}>
              <Text style={styles.donutCount}>{total}</Text>
              <Text style={styles.donutLabel}>knowledge</Text>
            </View>
          </View>
        </View>
        <View style={styles.legendWrap}>
          <View style={styles.legendRow}>
            <StatusDot color={colors.primary} />
            <Text style={styles.legendText}>検証済</Text>
            <Text style={styles.legendNum}>{verified}</Text>
            <Text style={styles.legendPct}>{Math.round(verified / total * 100)}%</Text>
          </View>
          <View style={styles.legendRow}>
            <StatusDot color={colors.textMuted} />
            <Text style={styles.legendText}>仮説</Text>
            <Text style={styles.legendNum}>{hypothesis}</Text>
            <Text style={styles.legendPct}>{Math.round(hypothesis / total * 100)}%</Text>
          </View>
          <View style={styles.legendRow}>
            <StatusDot color={colors.danger} />
            <Text style={styles.legendText}>反証</Text>
            <Text style={styles.legendNum}>{disproved}</Text>
            <Text style={styles.legendPct}>{Math.round(disproved / total * 100)}%</Text>
          </View>
        </View>
      </View>
      <View style={styles.avgRow}>
        <Text style={styles.avgLabel}>平均確信度の推移</Text>
        <Text style={styles.avgValue}>{avgScore}%</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [fields, setFields] = useState<Field[]>(mockFields);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🎯');

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  function addField() {
    if (!newName.trim()) return;
    setFields([...fields, { name: newName.trim(), icon: newIcon }]);
    setNewName('');
    setNewIcon('🎯');
    setModalVisible(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>こんにちは</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
        </View>

        {/* アンケートバナー（サンプル） */}
        <View style={styles.surveyCard}>
          <Text style={styles.surveyIcon}>🔔</Text>
          <View style={styles.surveyBody}>
            <Text style={styles.surveyLabel}>アンケート</Text>
            <Text style={styles.surveyQ}>
              前回「濁り×アピール系」を試しましたね。結果はどうでしたか？
            </Text>
          </View>
        </View>
        <View style={styles.surveyButtons}>
          {['効果あり', '変化なし', '逆効果'].map(label => (
            <TouchableOpacity key={label} style={styles.surveyBtn} activeOpacity={0.7}>
              <Text style={styles.surveyBtnText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 知識ステータスチャート */}
        <KnowledgeStatusChart fields={fields} />

        {/* 分野カード */}
        <Text style={styles.sectionTitle}>分野</Text>
        {fields.map(field => {
          const kCount = mockKnowledge.filter(k => k.field === field.name).length;
          return (
            <TouchableOpacity
              key={field.name}
              style={styles.fieldCard}
              onPress={() => navigation.navigate('Record', { field: field.name })}
              activeOpacity={0.7}
            >
              <Text style={styles.fieldIcon}>{field.icon}</Text>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldName}>{field.name}</Text>
                <Text style={styles.fieldMeta}>知識 {kCount}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.addFieldBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addFieldText}>＋ 分野を追加</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 分野追加モーダル */}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>分野を追加</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="分野名（例：水泳）"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.iconRow}>
                {ICONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconChoice, newIcon === ic && styles.iconChoiceActive]}
                    onPress={() => setNewIcon(ic)}
                  >
                    <Text style={styles.iconChoiceText}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtn}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={addField}>
                <Text style={styles.addBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

  header: { paddingTop: 20, paddingBottom: 16 },
  greeting: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  date: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },

  surveyCard: {
    flexDirection: 'row', gap: 10,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, padding: 14, marginBottom: 10,
  },
  surveyIcon: { fontSize: 18, marginTop: 1 },
  surveyBody: { flex: 1 },
  surveyLabel: { fontSize: font.xs, color: colors.amber, fontWeight: '600', marginBottom: 4 },
  surveyQ: { fontSize: font.sm, color: colors.textSub, lineHeight: 18 },
  surveyButtons: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  surveyBtn: {
    flex: 1, backgroundColor: colors.bgCard,
    borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center',
  },
  surveyBtnText: { fontSize: font.sm, color: colors.text, fontWeight: '500' },

  chartCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg, padding: 16, marginBottom: 20,
  },
  chartTitle: { fontSize: font.sm, color: colors.textMuted, marginBottom: 12 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutWrap: { alignItems: 'center', justifyContent: 'center' },
  donutOuter: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 8, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  donutInner: { alignItems: 'center' },
  donutCount: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  donutLabel: { fontSize: 9, color: colors.textMuted },
  legendWrap: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, fontSize: font.sm, color: colors.textSub },
  legendNum: { fontSize: font.sm, color: colors.text, fontWeight: '600', width: 20, textAlign: 'right' },
  legendPct: { fontSize: font.xs, color: colors.textMuted, width: 30, textAlign: 'right' },
  avgRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  avgLabel: { fontSize: font.sm, color: colors.textMuted },
  avgValue: { fontSize: font.sm, color: colors.primary, fontWeight: '600' },

  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.text, marginBottom: 10 },
  fieldCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, padding: 14, marginBottom: 8,
  },
  fieldIcon: { fontSize: 28 },
  fieldBody: { flex: 1 },
  fieldName: { fontSize: font.md, fontWeight: '600', color: colors.text },
  fieldMeta: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },

  addFieldBtn: {
    alignItems: 'center', paddingVertical: 14,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: radius.md, marginTop: 4,
  },
  addFieldText: { fontSize: font.sm, color: colors.textMuted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 24, gap: 16,
  },
  modalTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: radius.md,
    padding: 14, fontSize: font.md, color: colors.text, backgroundColor: colors.bgInput,
  },
  iconRow: { flexDirection: 'row', gap: 4 },
  iconChoice: { padding: 8, borderRadius: radius.sm },
  iconChoiceActive: { backgroundColor: '#1e2a1e' },
  iconChoiceText: { fontSize: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  cancelBtn: { fontSize: font.md, color: colors.textMuted },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: font.md },
});
