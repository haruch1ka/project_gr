import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { mockFields, mockKnowledge, mockExperiences } from '../constants/mockData';
import { Field } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ICONS = ['🎣', '💪', '📖', '🎸', '🏃', '✍️', '🎨', '🧘', '🌱'];

function StatusDot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const DONUT_R = 38;
const DONUT_SIZE = 96;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_R;
const CENTER = DONUT_SIZE / 2;

function DonutChart({ verified, hypothesis, disproved, total }: {
  verified: number; hypothesis: number; disproved: number; total: number;
}) {
  const segments = [
    { value: verified,    color: colors.primary },
    { value: hypothesis,  color: colors.textSecondary },
    { value: disproved,   color: colors.danger },
  ];

  let offset = 0;
  // -90度から開始（上から描画）
  const startAngle = -90;

  return (
    <View style={{ width: DONUT_SIZE, height: DONUT_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE} style={{ position: 'absolute' }}>
        {/* 背景トラック */}
        <Circle
          cx={CENTER} cy={CENTER} r={DONUT_R}
          fill="none" stroke={colors.border} strokeWidth={8}
        />
        {segments.map((seg, i) => {
          if (seg.value === 0) { offset += 0; return null; }
          const len = (seg.value / total) * CIRCUMFERENCE;
          const dash = `${len} ${CIRCUMFERENCE - len}`;
          const rotation = startAngle + (offset / total) * 360;
          offset += seg.value;
          return (
            <G key={i} rotation={rotation} origin={`${CENTER}, ${CENTER}`}>
              <Circle
                cx={CENTER} cy={CENTER} r={DONUT_R}
                fill="none"
                stroke={seg.color}
                strokeWidth={8}
                strokeDasharray={dash}
                strokeLinecap="butt"
              />
            </G>
          );
        })}
      </Svg>
      <Text style={styles.donutCount}>{total}</Text>
      <Text style={styles.donutLabel}>knowledge</Text>
    </View>
  );
}

// ダミーの確信度推移データ（過去6週）
const AVG_TREND = [52, 55, 58, 60, 62, 64];

function Sparkline({ data, color, width = 60, height = 28 }: {
  data: number[]; color: string; width?: number; height?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
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
  const prevScore = AVG_TREND[AVG_TREND.length - 2];
  const trend = avgScore - prevScore;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>知識の状態（全体）</Text>
      <View style={styles.chartRow}>
        <DonutChart verified={verified} hypothesis={hypothesis} disproved={disproved} total={total} />
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
        <View style={styles.avgRight}>
          <Text style={styles.avgValue}>{avgScore}%</Text>
          <Text style={[styles.avgTrend, { color: trend >= 0 ? colors.primary : colors.danger }]}>
            {trend >= 0 ? '▲' : '▼'}{Math.abs(trend)}
          </Text>
        </View>
      </View>
      <View style={styles.sparklineRow}>
        <Sparkline data={AVG_TREND} color={colors.blue} width={280} height={36} />
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
            <Text style={styles.greeting}>project gr</Text>
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
          const fieldKnowledge = mockKnowledge.filter(k => k.field === field.name);
          const kCount = fieldKnowledge.length;
          const verifiedCount = fieldKnowledge.filter(k => k.status === 'verified').length;
          const exps = mockExperiences[field.name] ?? [];
          const lastDate = exps[0]?.date ?? '—';
          // スパークライン用：各知識の確信度を並べる
          const sparkData = fieldKnowledge.length >= 2
            ? fieldKnowledge.map(k => k.confidenceScore * 100)
            : [0, 30, 50, 60, 70, 80];
          return (
            <TouchableOpacity
              key={field.name}
              style={styles.fieldCard}
              onPress={() => navigation.navigate('Dashboard', { field: field.name })}
              activeOpacity={0.7}
            >
              <Text style={styles.fieldIcon}>{field.icon}</Text>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldName}>{field.name}</Text>
                <Text style={styles.fieldMeta}>
                  知識 {kCount}{'  '}検証 {verifiedCount}{'  '}最終 {lastDate}
                </Text>
              </View>
              <Sparkline data={sparkData} color={colors.primary} width={56} height={28} />
              <Text style={styles.fieldChevron}>›</Text>
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
    </SafeAreaView>
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
  donutCount: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  donutLabel: { fontSize: 9, color: colors.textMuted },
  legendWrap: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, fontSize: font.sm, color: colors.textSub },
  legendNum: { fontSize: font.sm, color: colors.text, fontWeight: '600', width: 20, textAlign: 'right' },
  legendPct: { fontSize: font.xs, color: colors.textMuted, width: 30, textAlign: 'right' },
  avgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  avgLabel: { fontSize: font.sm, color: colors.textMuted },
  avgRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avgValue: { fontSize: font.sm, color: colors.primary, fontWeight: '600' },
  avgTrend: { fontSize: font.xs, fontWeight: '600' },
  sparklineRow: { marginTop: 8, alignItems: 'center' },

  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.text, marginBottom: 10 },
  fieldCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, padding: 14, marginBottom: 8,
  },
  fieldIcon: { fontSize: 28 },
  fieldBody: { flex: 1 },
  fieldName: { fontSize: font.md, fontWeight: '600', color: colors.text },
  fieldMeta: { fontSize: font.xs, color: colors.textMuted, marginTop: 3 },
  fieldChevron: { fontSize: 22, color: colors.textSecondary, marginLeft: 4 },

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
