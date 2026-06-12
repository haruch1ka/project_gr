import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, FieldTabParamList } from '../../App';
import { useField } from '../context/FieldContext';
import { colors, font, radius } from '../constants/theme';
import { Cog6ToothIcon } from 'react-native-heroicons/outline';
import { knowledgeApi, planApi, proposalApi } from '../services/api';
import { Knowledge, KnowledgeProposal, Plan } from '../types';
import { knowledgeColor, knowledgeLabel } from '../utils/knowledge';
import { cacheRead, cacheWrite } from '../utils/dataCache';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<FieldTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const PROPOSAL_CACHE_KEY = (field: string) => `proposal_cache_${field}`;

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
  row:        { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { borderColor: colors.blue, backgroundColor: '#0d1e40' },
  icon:       { fontSize: 14 },
  label:      { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  labelActive:{ color: colors.blue, fontWeight: '700' },
});


// ─── メインスクリーン ──────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { activeField } = useField();
  const [knowledge,  setKnowledge]  = useState<Knowledge[]>([]);
  const [nextPlan,   setNextPlan]   = useState<Plan | null>(null);
  const [proposal,   setProposal]   = useState<KnowledgeProposal | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // AsyncStorageからキャッシュ済みのproposalを読み込む
  // なければAPIを叩く
  const loadProposal = useCallback(async (field: string) => {
    const cacheKey = PROPOSAL_CACHE_KEY(field);
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      setProposal(JSON.parse(cached));
      return;
    }
    try {
      const { proposal: fetched } = await proposalApi.fetch(field);
      if (fetched) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(fetched));
        setProposal(fetched);
      }
    } catch {
      // proposal取得失敗はサイレントに無視
    }
  }, []);

  const fetchData = useCallback(async (refresh = false) => {
    if (!refresh) {
      const [cachedKnowledge, cachedPlans] = await Promise.all([
        cacheRead<Knowledge[]>('knowledge', activeField),
        cacheRead<Plan[]>('plan', activeField),
      ]);
      if (cachedKnowledge && cachedPlans) {
        setKnowledge(cachedKnowledge);
        setNextPlan(cachedPlans.find(p => p.reviewedAt === null) ?? null);
        await loadProposal(activeField);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const [knowledgeData, plans] = await Promise.all([
        knowledgeApi.list({ field: activeField }),
        planApi.list(activeField),
      ]);
      setKnowledge(knowledgeData);
      setNextPlan(plans.find(p => p.reviewedAt === null) ?? null);
      await Promise.all([
        cacheWrite('knowledge', activeField, knowledgeData),
        cacheWrite('plan', activeField, plans),
        loadProposal(activeField),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeField, loadProposal]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // proposal確認：Knowledge登録 → キャッシュ削除
  const handleConfirmProposal = useCallback(async () => {
    if (!proposal) return;
    try {
      await knowledgeApi.create({
        field:                    activeField,
        type:                     'distilled',
        category:                 '発見',
        content:                  proposal.content,
        webSources:               [],
        supportingExperiences:    [],
        contradictingExperiences: [],
        confidenceScore:          proposal.confidenceScore,
        noveltyScore:             proposal.noveltyScore ?? null,
        sourceKnowledgeId:        proposal.sourceKnowledgeId,
        tags:                     [],
      });
      await AsyncStorage.removeItem(PROPOSAL_CACHE_KEY(activeField));
      setProposal(null);
      const updated = await knowledgeApi.list({ field: activeField });
      setKnowledge(updated);
      await cacheWrite('knowledge', activeField, updated);
    } catch {
      Alert.alert('エラー', '知識の保存に失敗しました');
    }
  }, [proposal, activeField]);

  // proposal却下：API削除 → キャッシュ削除
  const handleRejectProposal = useCallback(async () => {
    if (!proposal) return;
    await proposalApi.reject(proposal._id);
    await AsyncStorage.removeItem(PROPOSAL_CACHE_KEY(activeField));
    setProposal(null);
  }, [proposal, activeField]);

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

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >

        {/* distilled提案カード */}
        {proposal && (
          <View style={styles.proposalCard}>
            <Text style={styles.proposalLabel}>✨ Geminiの発見</Text>
            <Text style={styles.proposalContent}>{proposal.content}</Text>
            <View style={styles.proposalActions}>
              <TouchableOpacity
                style={styles.proposalConfirm}
                onPress={handleConfirmProposal}
                activeOpacity={0.7}
              >
                <Text style={styles.proposalConfirmText}>知識として保存</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.proposalReject}
                onPress={handleRejectProposal}
                activeOpacity={0.7}
              >
                <Text style={styles.proposalRejectText}>却下</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
              const color = knowledgeColor(k);
              const label = knowledgeLabel(k);
              const pct   = Math.round(k.confidenceScore * 100);
              return (
                <TouchableOpacity
                  key={k._id ?? i}
                  style={styles.knowledgeRow}
                  onPress={() => navigation.navigate('Knowledge')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.typeDot, { backgroundColor: color }]} />
                  <View style={styles.knowledgeBody}>
                    <Text style={styles.knowledgeContent} numberOfLines={1}>{k.content}</Text>
                    <View style={styles.knowledgeMeta}>
                      <Text style={[styles.typeLabel, { color }]}>{label}</Text>
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
  scroll:        { padding: 16, gap: 14, paddingBottom: 24 },

  proposalCard: {
    backgroundColor: '#0d2040',
    borderRadius: radius.md,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
    gap: 8,
  },
  proposalLabel:       { fontSize: font.xs, color: colors.blue, fontWeight: '700', letterSpacing: 0.5 },
  proposalContent:     { fontSize: font.sm, color: colors.text, lineHeight: 20 },
  proposalActions:     { flexDirection: 'row', gap: 8, marginTop: 4 },
  proposalConfirm:     { flex: 1, backgroundColor: colors.blue, borderRadius: radius.sm, paddingVertical: 8, alignItems: 'center' },
  proposalConfirmText: { fontSize: font.sm, color: '#fff', fontWeight: '700' },
  proposalReject:      { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  proposalRejectText:  { fontSize: font.sm, color: colors.textMuted },

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
  typeDot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  knowledgeBody:{ flex: 1, gap: 4 },
  knowledgeContent: { fontSize: font.sm, color: colors.text, lineHeight: 18 },
  knowledgeMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeLabel:    { fontSize: 10, fontWeight: '600', width: 36 },
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
