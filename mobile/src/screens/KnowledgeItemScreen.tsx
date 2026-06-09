import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { ArrowLeftIcon, TrashIcon, XMarkIcon, PlusIcon } from 'react-native-heroicons/outline';
import { knowledgeApi } from '../services/api';
import { Knowledge } from '../types';
import { knowledgeColor, knowledgeLabel } from '../utils/knowledge';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'KnowledgeItem'>;
  route: RouteProp<RootStackParamList, 'KnowledgeItem'>;
};

export default function KnowledgeItemScreen({ navigation, route }: Props) {
  const { id } = route.params;

  const [knowledge, setKnowledge] = useState<Knowledge | null>(null);
  const [loading, setLoading]     = useState(true);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag]       = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await knowledgeApi.get(id);
      setKnowledge(data);
    } catch (e) {
      Alert.alert('エラー', '知識の読み込みに失敗しました');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addTag() {
    if (!newTag.trim() || !knowledge || saving) return;
    const updated = [...knowledge.tags, newTag.trim()];
    setSaving(true);
    try {
      const patched = await knowledgeApi.patch(id, { tags: updated });
      setKnowledge(patched);
      setNewTag('');
      setAddingTag(false);
    } catch {
      Alert.alert('エラー', 'タグの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function removeTag(index: number) {
    if (!knowledge || saving) return;
    const updated = knowledge.tags.filter((_, i) => i !== index);
    setSaving(true);
    try {
      const patched = await knowledgeApi.patch(id, { tags: updated });
      setKnowledge(patched);
    } catch {
      Alert.alert('エラー', 'タグの削除に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('削除', 'この知識を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          try {
            await knowledgeApi.remove(id);
            navigation.goBack();
          } catch {
            Alert.alert('エラー', '削除に失敗しました');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 80 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!knowledge) return null;

  const pct   = Math.round(knowledge.confidenceScore * 100);
  const color = knowledgeColor(knowledge);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeftIcon size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerCategory}>{knowledge.category}</Text>
          <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <TrashIcon size={20} color={colors.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* 知識内容 */}
          <Text style={styles.content}>{knowledge.content}</Text>

          {/* ステータス・確信度 */}
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <View style={[styles.statusBadge, { borderColor: color }]}>
                <Text style={[styles.statusText, { color }]}>{knowledgeLabel(knowledge)}</Text>
              </View>
              <Text style={[styles.pct, { color }]}>{pct}%</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
            </View>
          </View>

          {/* 支持する経験 */}
          {knowledge.supportingExperiences.length > 0 && (
            <Section title="支持する経験" accent={colors.primary}>
              {knowledge.supportingExperiences.map((e, i) => (
                <ExperienceRow key={e._id ?? i} date={e.date} memo={e.memo} />
              ))}
            </Section>
          )}

          {/* 反証する経験 */}
          {knowledge.contradictingExperiences.length > 0 && (
            <Section title="反証する経験" accent={colors.danger}>
              {knowledge.contradictingExperiences.map((e, i) => (
                <ExperienceRow key={e._id ?? i} date={e.date} memo={e.memo} />
              ))}
            </Section>
          )}

          {/* Webソース */}
          {knowledge.webSources.length > 0 && (
            <Section title="Webソース" accent={colors.blue}>
              {knowledge.webSources.map((src, i) => (
                <View key={i} style={styles.sourceItem}>
                  <Text style={styles.sourceQuery}>「{src.query}」</Text>
                  {src.results.slice(0, 2).map((r, j) => (
                    <View key={j} style={styles.sourceResult}>
                      <Text style={styles.sourceTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={styles.sourceSnippet}>{r.snippet}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </Section>
          )}

          {/* タグ */}
          <Section title="メモ・タグ" accent={colors.textSecondary}>
            <View style={styles.tagWrap}>
              {knowledge.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <XMarkIcon size={12} color={colors.textMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))}

              {addingTag ? (
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={styles.tagInput}
                    placeholder="タグを入力…"
                    placeholderTextColor={colors.textMuted}
                    value={newTag}
                    onChangeText={setNewTag}
                    autoFocus
                    onSubmitEditing={addTag}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={addTag} disabled={saving} style={styles.tagConfirm}>
                    {saving
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Text style={styles.tagConfirmText}>追加</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setAddingTag(false); setNewTag(''); }}>
                    <XMarkIcon size={16} color={colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addTagBtn} onPress={() => setAddingTag(true)}>
                  <PlusIcon size={14} color={colors.textMuted} strokeWidth={2.5} />
                  <Text style={styles.addTagText}>追加</Text>
                </TouchableOpacity>
              )}
            </View>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <View style={[sectionStyles.dot, { backgroundColor: accent }]} />
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ExperienceRow({ date, memo }: { date: string; memo: string }) {
  return (
    <View style={expStyles.row}>
      <Text style={expStyles.date}>{date}</Text>
      <Text style={expStyles.memo}>{memo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 12,
  },
  headerCategory: { flex: 1, fontSize: font.sm, color: colors.textMuted, fontWeight: '600' },

  scroll: { padding: 16, gap: 16, paddingBottom: 48 },

  content: {
    fontSize: font.lg, fontWeight: '700', color: colors.text,
    lineHeight: 28,
  },

  metaCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: 14, gap: 10,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: {
    borderWidth: 1.5, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText:   { fontSize: font.xs, fontWeight: '700' },
  pct:          { fontSize: font.md, fontWeight: '700', marginLeft: 'auto' },
  barTrack:     { height: 4, backgroundColor: colors.border, borderRadius: 2 },
  barFill:      { height: 4, borderRadius: 2 },

  // Webソース
  sourceItem:   { gap: 6 },
  sourceQuery:  { fontSize: font.xs, color: colors.textMuted },
  sourceResult: { gap: 2, paddingLeft: 8 },
  sourceTitle:  { fontSize: font.xs, color: colors.blue },
  sourceSnippet:{ fontSize: font.xs, color: colors.textMuted, lineHeight: 16 },

  // タグ
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgCard,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  tagText: { fontSize: font.xs, color: colors.textSub },

  tagInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.borderInput, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: colors.bgCard,
  },
  tagInput: { flex: 1, fontSize: font.xs, color: colors.text },
  tagConfirm: {},
  tagConfirmText: { fontSize: font.xs, color: colors.primary, fontWeight: '700' },

  addTagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1,
    borderStyle: 'dashed', borderColor: colors.border,
  },
  addTagText: { fontSize: font.xs, color: colors.textMuted },
});

const sectionStyles = StyleSheet.create({
  container: { gap: 10 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  title:     { fontSize: font.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
});

const expStyles = StyleSheet.create({
  row:  { flexDirection: 'row', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  date: { fontSize: font.xs, color: colors.textMuted, width: 42, flexShrink: 0 },
  memo: { flex: 1, fontSize: font.sm, color: colors.textSub, lineHeight: 19 },
});
