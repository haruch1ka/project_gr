import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
  Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, font, radius } from '../constants/theme';
import { TrashIcon, LightBulbIcon } from 'react-native-heroicons/outline';
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

const DELETE_BTN_W = 72;

function KnowledgeItem({ item, onDelete }: { item: Knowledge; onDelete: (id: string) => void }) {
  const translateX  = useRef(new Animated.Value(0)).current;
  const startX      = useRef(0);
  const revealedRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {
        startX.current = revealedRef.current ? -DELETE_BTN_W : 0;
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        translateX.setValue(Math.min(0, Math.max(-DELETE_BTN_W, startX.current + gs.dx)));
      },
      onPanResponderRelease: (_, gs) => {
        const x    = Math.min(0, Math.max(-DELETE_BTN_W, startX.current + gs.dx));
        const open = x < -(DELETE_BTN_W / 2);
        revealedRef.current = open;
        Animated.spring(translateX, { toValue: open ? -DELETE_BTN_W : 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    })
  ).current;

  const handleDelete = () => {
    if (!item._id) return;
    Animated.timing(translateX, { toValue: -500, duration: 180, useNativeDriver: true }).start(async () => {
      try { await knowledgeApi.remove(item._id!); } catch {}
      onDelete(item._id!);
    });
  };

  const pct   = Math.round(item.confidenceScore * 100);
  const color = STATUS_COLOR[item.status];

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteAction}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.75}>
          <TrashIcon size={20} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.item, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <View style={styles.itemRow}>
          <View style={[styles.itemDot, { backgroundColor: color }]} />
          <Text style={[styles.itemText, { color }]} numberOfLines={2}>{item.content}</Text>
          <Text style={[styles.itemPct, { color }]}>{pct}%</Text>
        </View>
        <View style={styles.itemBarTrack}>
          <View style={[styles.itemBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
      </Animated.View>
    </View>
  );
}

function SubcategorySection({ subcategory, items, onDelete }: {
  subcategory: string; items: Knowledge[]; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.subsection}>
      <TouchableOpacity
        style={styles.subsectionHeader}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.subsectionArrow}>{open ? '∨' : '›'}</Text>
        <Text style={styles.subsectionTitle}>{subcategory}</Text>
        <Text style={styles.sectionCount}>{items.length}</Text>
      </TouchableOpacity>
      {open && items.map((item, i) => (
        <KnowledgeItem key={item._id ?? i} item={item} onDelete={onDelete} />
      ))}
    </View>
  );
}

function CategorySection({ category, items, onDelete }: {
  category: string; items: Knowledge[]; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const subcategories = [...new Set(
    items.filter(k => k.subcategory).map(k => k.subcategory!)
  )];
  const ungrouped = items.filter(k => !k.subcategory);

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
      {open && (
        <>
          {subcategories.map(sub => (
            <SubcategorySection
              key={sub}
              subcategory={sub}
              items={items.filter(k => k.subcategory === sub)}
              onDelete={onDelete}
            />
          ))}
          {ungrouped.map((item, i) => (
            <KnowledgeItem key={item._id ?? i} item={item} onDelete={onDelete} />
          ))}
        </>
      )}
    </View>
  );
}

export default function KnowledgeScreen() {
  const navigation   = useNavigation<Nav>();
  const { activeField: field } = useField();

  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDelete = useCallback((id: string) => {
    setKnowledge(prev => prev.filter(k => k._id !== id));
  }, []);

  const load = useCallback(async () => {
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

  useEffect(() => { load(); }, [load]);

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
              onDelete={handleDelete}
            />
          ))}

          {knowledge.length === 0 && (
            <Text style={styles.empty}>この分野の知識はまだありません</Text>
          )}

          <TouchableOpacity
            style={styles.hypothesisBtn}
            onPress={() => navigation.navigate('Hypothesis', { field })}
            activeOpacity={0.8}
          >
            <LightBulbIcon size={16} color="#000" strokeWidth={2} />
            <Text style={styles.hypothesisBtnText}>気になることから仮説を生成</Text>
          </TouchableOpacity>

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

  // カテゴリ（第1層）
  section:       { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 6 },
  sectionArrow:  { fontSize: font.sm, color: colors.textMuted, width: 14 },
  sectionTitle:  { flex: 1, fontSize: font.sm, fontWeight: '700', color: colors.textSub },
  sectionCount:  { fontSize: font.xs, color: colors.textMuted },

  // サブカテゴリ（第2層）
  subsection:       { marginLeft: 14, marginBottom: 4 },
  subsectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 6 },
  subsectionArrow:  { fontSize: font.xs, color: colors.textSecondary, width: 12 },
  subsectionTitle:  { flex: 1, fontSize: font.xs, fontWeight: '600', color: colors.textMuted },

  // スワイプ削除
  swipeContainer: { marginBottom: 4, borderRadius: radius.md, overflow: 'hidden' },
  deleteAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_BTN_W,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: colors.danger, borderRadius: radius.md,
    padding: 10, justifyContent: 'center', alignItems: 'center',
  },

  item: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingTop: 10, paddingHorizontal: 12, overflow: 'hidden',
  },
  itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 },
  itemDot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  itemText:     { flex: 1, fontSize: font.sm, lineHeight: 18 },
  itemPct:      { fontSize: font.xs, fontWeight: '700', width: 34, textAlign: 'right' },
  itemBarTrack: { height: 3, backgroundColor: colors.border },
  itemBarFill:  { height: 3 },

  empty: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center', marginTop: 40 },

  hypothesisBtn: {
    marginTop: 16, borderRadius: radius.md, backgroundColor: colors.primary,
    padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  hypothesisBtnText: { color: '#000', fontSize: font.sm, fontWeight: '700' },

  addCategoryBtn: {
    marginTop: 8, borderRadius: radius.md, borderWidth: 1.5,
    borderStyle: 'dashed', borderColor: colors.border,
    padding: 14, alignItems: 'center',
  },
  addCategoryText: { color: colors.textMuted, fontSize: font.sm },
});
