import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { knowledgeApi, planApi } from '../services/api';
import { Knowledge, Plan } from '../types';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  ChatBubbleOvalLeftIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
} from 'react-native-heroicons/outline';

const FIELD_ICONS: Record<string, string> = {
  釣り: '🎣', 筋トレ: '💪', 読書: '📖', 料理: '🍳', 音楽: '🎵',
  英語: '🌍', ゴルフ: '⛳', ランニング: '🏃',
};

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

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
  route: RouteProp<RootStackParamList, 'Dashboard'>;
};

export default function DashboardScreen({ navigation, route }: Props) {
  const { field } = route.params;
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [nextPlan, setNextPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [knowledgeData, plans] = await Promise.all([
        knowledgeApi.list({ field }),
        planApi.list(field),
      ]);
      setKnowledge(knowledgeData.slice(0, 4));
      setNextPlan(plans.find(p => p.reviewedAt === null) ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [field]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeftIcon size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.fieldLabel}>
          <Text style={styles.fieldIconText}>{FIELD_ICONS[field] ?? '📌'}</Text>
          <Text style={styles.title}>{field}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.navigate('Log', { field })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.actionBtn}>
            <PencilSquareIcon size={22} color={colors.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Tabs', { screen: 'Chat', params: { field } })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.actionBtn}>
            <ChatBubbleOvalLeftIcon size={22} color={colors.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Knowledge', { field })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.actionBtn}>
            <BookOpenIcon size={22} color={colors.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Tabs', { screen: 'Plan', params: { field } })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.actionBtn}>
            <ClipboardDocumentListIcon size={22} color={colors.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* 知識ウィジェット */}
          <View style={styles.widget}>
            <View style={styles.widgetHeader}>
              <Text style={styles.widgetTitle}>📚 知識</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Knowledge', { field })}>
                <Text style={styles.widgetLink}>すべて見る →</Text>
              </TouchableOpacity>
            </View>

            {knowledge.length === 0 ? (
              <Text style={styles.widgetEmpty}>まだ知識がありません</Text>
            ) : (
              knowledge.map((k, i) => {
                const color = STATUS_COLOR[k.status];
                const pct = Math.round(k.confidenceScore * 100);
                return (
                  <TouchableOpacity
                    key={k._id ?? i}
                    style={styles.knowledgeRow}
                    onPress={() => navigation.navigate('Knowledge', { field })}
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
              onPress={() => navigation.navigate('Tabs', { screen: 'Plan', params: { field } })}
              activeOpacity={0.7}
            >
              <Text style={styles.planLabel}>📋 実行中のプラン</Text>
              <Text style={styles.planText} numberOfLines={3}>{nextPlan.proposal}</Text>
            </TouchableOpacity>
          )}

          {/* 記録ボタン */}
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => navigation.navigate('Log', { field })}
            activeOpacity={0.8}
          >
            <Text style={styles.logBtnIcon}>✏️</Text>
            <Text style={styles.logBtnText}>記録を残す</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
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
  back:         { marginRight: 16 },
  fieldLabel:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldIconText:{ fontSize: 20 },
  title:        { fontSize: font.lg, fontWeight: '700', color: colors.text },
  actions:   { flexDirection: 'row', gap: 2 },
  actionBtn: { padding: 6 },

  scroll: { padding: 16, gap: 16 },

  widget: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
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

  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.md, padding: 16,
  },
  logBtnIcon: { fontSize: 18 },
  logBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
});
