import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useField } from '../context/FieldContext';
import { colors, font, radius } from '../constants/theme';
import { Cog6ToothIcon } from 'react-native-heroicons/outline';
import { knowledgeApi, planApi } from '../services/api';
import { Knowledge, Plan } from '../types';
import { mockExperiences } from '../constants/mockData';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_COLOR: Record<Knowledge['status'], string> = {
  verified:   colors.primary,
  hypothesis: colors.textSecondary,
  disproved:  colors.danger,
};

const STATUS_LABEL: Record<Knowledge['status'], string> = {
  verified:   '検証済',
  hypothesis: '仮説',
  disproved:  '反証',
};

const SURVEY_Q: Record<string, string> = {
  '釣り':  '前回「朝マズメ×中層レンジ」を試しましたね。結果はどうでしたか？',
  '筋トレ':'前回のベンチプレスでフォームを意識しましたか？',
  '読書':  '前回の読書で気づいたことを実践しましたか？',
};
const SURVEY_OPTS = ['効果あり', '変化なし', '逆効果'] as const;

// ─── サブコンポーネント ─────────────────────────────────────────────────

function FieldTabs() {
  const { activeField, setActiveField, fields } = useField();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={ft.row}
    >
      {fields.map(f => {
        const active = f.name === activeField;
        return (
          <TouchableOpacity
            key={f.name}
            style={[ft.chip, active && ft.chipActive]}
            onPress={() => setActiveField(f.name)}
            activeOpacity={0.7}
          >
            <Text style={ft.icon}>{f.icon}</Text>
            <Text style={[ft.label, active && ft.labelActive]}>{f.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const ft = StyleSheet.create({
  row:       { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.border },
  chipActive:{ borderColor: colors.primary, backgroundColor: '#0d2a1f' },
  icon:      { fontSize: 14 },
  label:     { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  labelActive:{ color: colors.primary, fontWeight: '700' },
});

function KnowledgeStatus({ items }: { items: Knowledge[] }) {
  const verified  = items.filter(k => k.status === 'verified').length;
  const hypo      = items.filter(k => k.status === 'hypothesis').length;
  const disproved = items.filter(k => k.status === 'disproved').length;
  const total     = items.length || 1;
  return (
    <View style={ks.card}>
      <Text style={ks.title}>知識の状態</Text>
      <View style={ks.row}>
        {[
          { label: '検証済', count: verified,  color: colors.primary },
          { label: '仮説',   count: hypo,      color: colors.textSecondary },
          { label: '反証',   count: disproved, color: colors.danger },
        ].map(({ label, count, color }) => (
          <View key={label} style={ks.item}>
            <Text style={[ks.count, { color }]}>{count}</Text>
            <Text style={ks.itemLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={ks.bar}>
        {verified  > 0 && <View style={{ flex: verified,  backgroundColor: colors.primary,       borderRadius: 2 }} />}
        {hypo      > 0 && <View style={{ flex: hypo,      backgroundColor: colors.textSecondary, borderRadius: 2 }} />}
        {disproved > 0 && <View style={{ flex: disproved, backgroundColor: colors.danger,        borderRadius: 2 }} />}
        {total     === 0 && <View style={{ flex: 1, backgroundColor: colors.border }} />}
      </View>
    </View>
  );
}

const ks = StyleSheet.create({
  card:      { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 14, gap: 10 },
  title:     { fontSize: font.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  row:       { flexDirection: 'row', gap: 0 },
  item:      { flex: 1, alignItems: 'center', gap: 2 },
  count:     { fontSize: font.xl, fontWeight: '700' },
  itemLabel: { fontSize: font.xs, color: colors.textMuted },
  bar:       { flexDirection: 'row', height: 4, borderRadius: 2, gap: 2, overflow: 'hidden' },
});

function SurveyCard({ field }: { field: string }) {
  const q = SURVEY_Q[field];
  if (!q) return null;
  const [answered, setAnswered] = useState<string | null>(null);

  if (answered) {
    return (
      <View style={sv.card}>
        <Text style={sv.thanks}>✓ 回答済み —「{answered}」</Text>
      </View>
    );
  }
  return (
    <View style={sv.card}>
      <View style={sv.top}>
        <Text style={sv.badge}>アンケート</Text>
        <Text style={sv.q}>{q}</Text>
      </View>
      <View style={sv.btns}>
        {SURVEY_OPTS.map(opt => (
          <TouchableOpacity key={opt} style={sv.btn} onPress={() => setAnswered(opt)} activeOpacity={0.7}>
            <Text style={sv.btnText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const sv = StyleSheet.create({
  card:   { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 14, gap: 10 },
  top:    { gap: 6 },
  badge:  { fontSize: font.xs, color: colors.amber, fontWeight: '700' },
  q:      { fontSize: font.sm, color: colors.text, lineHeight: 20 },
  btns:   { flexDirection: 'row', gap: 8 },
  btn:    { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnText:{ fontSize: font.sm, color: colors.text, fontWeight: '500' },
  thanks: { fontSize: font.sm, color: colors.primary, textAlign: 'center', paddingVertical: 4 },
});

// ─── メインスクリーン ──────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { activeField } = useField();
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [nextPlan,  setNextPlan]  = useState<Plan | null>(null);
  const [loading,   setLoading]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [knowledgeData, plans] = await Promise.all([
        knowledgeApi.list({ field: activeField }),
        planApi.list(activeField),
      ]);
      setKnowledge(knowledgeData);
      setNextPlan(plans.find(p => p.reviewedAt === null) ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeField]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const previewKnowledge = knowledge.slice(0, 4);

  return (
    <SafeAreaView style={styles.container}>
      {/* 分野タブ */}
      <View style={styles.tabRow}>
        <View style={styles.fieldTabsWrap}>
          <FieldTabs />
        </View>
        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.tabLoader}
          />
        )}
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Cog6ToothIcon size={20} color={colors.textMuted} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* 知識の状態 */}
        <KnowledgeStatus items={knowledge} />

        {/* アンケート */}
        <SurveyCard key={activeField} field={activeField} />

          {/* 知識ウィジェット */}
          <View style={styles.widget}>
            <View style={styles.widgetHeader}>
              <Text style={styles.widgetTitle}>📚 知識</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Knowledge')}>
                <Text style={styles.widgetLink}>すべて見る →</Text>
              </TouchableOpacity>
            </View>
            {previewKnowledge.length === 0 ? (
              <Text style={styles.widgetEmpty}>まだ知識がありません</Text>
            ) : (
              previewKnowledge.map((k, i) => {
                const color = STATUS_COLOR[k.status];
                const pct   = Math.round(k.confidenceScore * 100);
                return (
                  <TouchableOpacity
                    key={k._id ?? i}
                    style={styles.knowledgeRow}
                    onPress={() => navigation.navigate('Knowledge')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                    <View style={styles.knowledgeBody}>
                      <Text style={styles.knowledgeContent} numberOfLines={1}>{k.content}</Text>
                      <View style={styles.knowledgeMeta}>
                        <Text style={[styles.statusLabel, { color }]}>{STATUS_LABEL[k.status]}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                        </View>
                        <Text style={[styles.pct, { color }]}>{pct}%</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* 実行中のプラン */}
          {nextPlan && (
            <TouchableOpacity
              style={styles.planCard}
              onPress={() => navigation.navigate('Plan')}
              activeOpacity={0.7}
            >
              <Text style={styles.planLabel}>📋 実行中のプラン</Text>
              <Text style={styles.planText} numberOfLines={3}>{nextPlan.proposal}</Text>
            </TouchableOpacity>
          )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  tabRow:        { flexDirection: 'row', alignItems: 'center' },
  fieldTabsWrap: { flex: 1 },
  tabLoader:     { marginRight: 8 },
  settingsBtn:   { padding: 10, marginRight: 4 },
  scroll:    { padding: 16, gap: 14, paddingBottom: 24 },

  widget: { backgroundColor: colors.bgCard, borderRadius: radius.md, overflow: 'hidden' },
  widgetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  widgetTitle:  { fontSize: font.sm, fontWeight: '700', color: colors.text },
  widgetLink:   { fontSize: font.xs, color: colors.primary, fontWeight: '600' },
  widgetEmpty:  { fontSize: font.sm, color: colors.textMuted, padding: 16, textAlign: 'center' },

  knowledgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statusDot:    { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  knowledgeBody:{ flex: 1, gap: 4 },
  knowledgeContent: { fontSize: font.sm, color: colors.text, lineHeight: 18 },
  knowledgeMeta:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel:  { fontSize: 10, fontWeight: '600', width: 36 },
  barTrack:     { flex: 1, height: 3, backgroundColor: colors.border, borderRadius: 2 },
  barFill:      { height: 3, borderRadius: 2 },
  pct:          { fontSize: 10, fontWeight: '700', width: 30, textAlign: 'right' },

  planCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 14,
    borderLeftWidth: 3, borderLeftColor: colors.primary, gap: 6,
  },
  planLabel: { fontSize: font.xs, color: colors.primary, fontWeight: '700', letterSpacing: 0.5 },
  planText:  { fontSize: font.sm, color: colors.text, lineHeight: 20 },
});
