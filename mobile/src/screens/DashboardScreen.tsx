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
  chipActive:{ borderColor: colors.blue, backgroundColor: '#0d1e40' },
  icon:      { fontSize: 14 },
  label:     { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  labelActive:{ color: colors.blue, fontWeight: '700' },
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
