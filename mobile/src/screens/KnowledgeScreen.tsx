import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius } from '../constants/theme';
import { mockKnowledge, mockFields } from '../constants/mockData';
import { Knowledge } from '../types';

const STATUS_COLOR: Record<Knowledge['status'], string> = {
  verified:   colors.primary,
  hypothesis: colors.textSecondary,
  disproved:  colors.danger,
};

// 分野タブ
function FieldTab({ label, icon, count, active, onPress }: {
  label: string; icon: string; count: number; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      <Text style={[styles.tabCount, active && styles.tabCountActive]}>{count}</Text>
    </TouchableOpacity>
  );
}

// ステータスサマリー
function StatusSummary({ items }: { items: Knowledge[] }) {
  const verified  = items.filter(k => k.status === 'verified').length;
  const hypo      = items.filter(k => k.status === 'hypothesis').length;
  const disproved = items.filter(k => k.status === 'disproved').length;
  const total = items.length || 1;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.summaryLabel}>検証済</Text>
          <Text style={styles.summaryNum}>{verified}</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.textSecondary }]} />
          <Text style={styles.summaryLabel}>仮説</Text>
          <Text style={styles.summaryNum}>{hypo}</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.danger }]} />
          <Text style={styles.summaryLabel}>反証</Text>
          <Text style={styles.summaryNum}>{disproved}</Text>
        </View>
      </View>
      {/* 三色バー */}
      <View style={styles.triBar}>
        <View style={{ flex: verified,  backgroundColor: colors.primary,       borderRadius: 2 }} />
        <View style={{ flex: hypo,      backgroundColor: colors.textSecondary, borderRadius: 2 }} />
        <View style={{ flex: disproved, backgroundColor: colors.danger,        borderRadius: 2 }} />
        {total === 0 && <View style={{ flex: 1, backgroundColor: colors.border }} />}
      </View>
    </View>
  );
}

// 知識アイテム
function KnowledgeItem({ item }: { item: Knowledge }) {
  const pct   = Math.round(item.confidenceScore * 100);
  const color = STATUS_COLOR[item.status];
  return (
    <View style={styles.item}>
      {/* 上段：ドット・テキスト・パーセント */}
      <View style={styles.itemRow}>
        <View style={[styles.itemDot, { backgroundColor: color }]} />
        <Text style={[styles.itemText, { color }]} numberOfLines={2}>{item.content}</Text>
        <Text style={[styles.itemPct, { color }]}>{pct}%</Text>
      </View>
      {/* 底面水平バー */}
      <View style={styles.itemBarTrack}>
        <View style={[styles.itemBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// カテゴリセクション（折りたたみ）
function CategorySection({ category, items }: { category: string; items: Knowledge[] }) {
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
      {open && items.map((item, i) => <KnowledgeItem key={i} item={item} />)}
    </View>
  );
}

export default function KnowledgeScreen() {
  const allFields = mockFields.map(f => f.name);
  const [selectedField, setSelectedField] = useState(allFields[0] ?? '釣り');

  const filtered   = mockKnowledge.filter(k => k.field === selectedField);
  const categories = [...new Set(filtered.map(k => k.category))];

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>知識ツリー</Text>
        <Text style={styles.subtitle}>カテゴリ・知識</Text>
      </View>

      {/* 分野タブ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
      >
        {mockFields.map(f => (
          <FieldTab
            key={f.name}
            label={f.name}
            icon={f.icon}
            count={mockKnowledge.filter(k => k.field === f.name).length}
            active={selectedField === f.name}
            onPress={() => setSelectedField(f.name)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ステータスサマリー */}
        <StatusSummary items={filtered} />

        {/* カテゴリ別ツリー */}
        {categories.map(cat => (
          <CategorySection
            key={cat}
            category={cat}
            items={filtered.filter(k => k.category === cat)}
          />
        ))}

        {filtered.length === 0 && (
          <Text style={styles.empty}>この分野の知識はまだありません</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 },
  title:    { fontSize: font.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.xs, color: colors.textMuted, marginTop: 1 },

  tabsContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.xl, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: 'transparent',
    alignSelf: 'flex-start',
  },
  tabActive:      { borderColor: colors.primary },
  tabIcon:        { fontSize: 13 },
  tabText:        { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  tabTextActive:  { color: colors.primary, fontWeight: '700' },
  tabCount:       { fontSize: font.xs, color: colors.textSecondary },
  tabCountActive: { color: colors.primary },

  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

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
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
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
});
