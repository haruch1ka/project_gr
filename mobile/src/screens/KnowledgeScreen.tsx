import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, font, radius } from '../constants/theme';
import { knowledgeApi } from '../services/api';
import { Knowledge } from '../types';
import { RootStackParamList } from '../../App';
import { useField } from '../context/FieldContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_COLOR: Record<Knowledge['status'], string> = {
  verified:   colors.primary,
  hypothesis: colors.textSecondary,
  disproved:  colors.danger,
};

function StatusSummary({ items }: { items: Knowledge[] }) {
  const verified  = items.filter(k => k.status === 'verified').length;
  const hypo      = items.filter(k => k.status === 'hypothesis').length;
  const disproved = items.filter(k => k.status === 'disproved').length;
  const total = items.length || 1;
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        {[
          { label: '検証済', count: verified,  color: colors.primary },
          { label: '仮説',   count: hypo,      color: colors.textSecondary },
          { label: '反証',   count: disproved, color: colors.danger },
        ].map(({ label, count, color }) => (
          <View key={label} style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: color }]} />
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryNum}>{count}</Text>
          </View>
        ))}
      </View>
      <View style={styles.triBar}>
        <View style={{ flex: verified,  backgroundColor: colors.primary,       borderRadius: 2 }} />
        <View style={{ flex: hypo,      backgroundColor: colors.textSecondary, borderRadius: 2 }} />
        <View style={{ flex: disproved, backgroundColor: colors.danger,        borderRadius: 2 }} />
        {total === 0 && <View style={{ flex: 1, backgroundColor: colors.border }} />}
      </View>
    </View>
  );
}

function KnowledgeItem({ item }: { item: Knowledge }) {
  const pct   = Math.round(item.confidenceScore * 100);
  const color = STATUS_COLOR[item.status];
  return (
    <View style={styles.item}>
      <View style={styles.itemRow}>
        <View style={[styles.itemDot, { backgroundColor: color }]} />
        <Text style={[styles.itemText, { color }]} numberOfLines={2}>{item.content}</Text>
        <Text style={[styles.itemPct, { color }]}>{pct}%</Text>
      </View>
      <View style={styles.itemBarTrack}>
        <View style={[styles.itemBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function CategorySection({ category, items, onNavigate }: {
  category: string; items: Knowledge[]; onNavigate: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionArrow}>{open ? '∨' : '›'}</Text>
        <Text style={styles.sectionTitle}>{category}</Text>
        <Text style={styles.sectionCount}>{items.length}</Text>
      </TouchableOpacity>
      {open && items.map((item, i) => <KnowledgeItem key={item._id ?? i} item={item} />)}
    </View>
  );
}

export default function KnowledgeScreen() {
  const navigation   = useNavigation<Nav>();
  const { activeField: field } = useField();

  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await knowledgeApi.list({ field });
      setKnowledge(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [field]);

  useEffect(() => { fetch(); }, [fetch]);

  const categories = [...new Set(knowledge.map(k => k.category))];

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>知識</Text>
          <StatusSummary items={knowledge} />

          {categories.map(cat => (
            <CategorySection
              key={cat}
              category={cat}
              items={knowledge.filter(k => k.category === cat)}
              onNavigate={() => navigation.navigate('KnowledgeCategory', { field, category: cat })}
            />
          ))}

          {knowledge.length === 0 && (
            <Text style={styles.empty}>この分野の知識はまだありません</Text>
          )}

          <TouchableOpacity
            style={styles.addCategoryBtn}
            onPress={() => navigation.navigate('KnowledgeCategory', { field, category: '新しいカテゴリ' })}
          >
            <Text style={styles.addCategoryText}>＋ カテゴリを追加</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  scroll:     { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12 },
  pageTitle:  { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: 16 },

  summaryCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: 12, marginBottom: 16, gap: 8,
  },
  summaryRow:   { flexDirection: 'row', gap: 16 },
  summaryItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryDot:   { width: 8, height: 8, borderRadius: 4 },
  summaryLabel: { fontSize: font.xs, color: colors.textMuted },
  summaryNum:   { fontSize: font.xs, color: colors.text, fontWeight: '600' },
  triBar:       { flexDirection: 'row', height: 3, borderRadius: 2, gap: 2, overflow: 'hidden' },

  section:       { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 6 },
  sectionArrow:  { fontSize: font.sm, color: colors.textMuted, width: 14 },
  sectionTitle:  { flex: 1, fontSize: font.sm, fontWeight: '700', color: colors.textSub },
  sectionCount:  { fontSize: font.xs, color: colors.textMuted },

  item: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingTop: 10, paddingHorizontal: 12,
    marginBottom: 4, overflow: 'hidden',
  },
  itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 },
  itemDot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  itemText:     { flex: 1, fontSize: font.sm, lineHeight: 18 },
  itemPct:      { fontSize: font.xs, fontWeight: '700', width: 34, textAlign: 'right' },
  itemBarTrack: { height: 3, backgroundColor: colors.border },
  itemBarFill:  { height: 3 },

  empty: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center', marginTop: 40 },

  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon:   { fontSize: 48 },
  emptyText:   { fontSize: font.md, color: colors.textMuted, fontWeight: '500' },
  emptySub:    { fontSize: font.sm, color: colors.textSecondary },

  addCategoryBtn: {
    marginTop: 16, borderRadius: radius.md, borderWidth: 1.5,
    borderStyle: 'dashed', borderColor: colors.border,
    padding: 14, alignItems: 'center',
  },
  addCategoryText: { color: colors.textMuted, fontSize: font.sm },
});
