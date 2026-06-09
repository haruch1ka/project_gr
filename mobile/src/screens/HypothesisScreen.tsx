import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { ArrowLeftIcon, CheckIcon } from 'react-native-heroicons/outline';
import { searchByQuery, extractFromUrl, isYouTubeUrl, TavilyResult } from '../services/tavily';
import { generateHypotheses, findRelatedKnowledge, HypothesisCandidate } from '../services/gemini';
import { knowledgeApi } from '../services/api';
import { Knowledge } from '../types';
import { knowledgeColor, knowledgeLabel } from '../utils/knowledge';

type Props = NativeStackScreenProps<RootStackParamList, 'Hypothesis'>;

export default function HypothesisScreen({ navigation, route }: Props) {
  const { field } = route.params;

  const [query, setQuery]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [candidates, setCandidates]     = useState<HypothesisCandidate[]>([]);
  const [selected, setSelected]         = useState<Set<number>>(new Set());
  const [saving, setSaving]             = useState(false);
  const [sources, setSources]           = useState<TavilyResult[]>([]);
  const [relatedKnowledge, setRelatedKnowledge] = useState<Knowledge[]>([]);

  async function generate() {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setCandidates([]);
    setSelected(new Set());
    setRelatedKnowledge([]);

    try {
      let youtubeUrl: string | undefined;
      let sourcesPromise: Promise<TavilyResult[]>;

      if (isYouTubeUrl(trimmed)) {
        youtubeUrl = trimmed;
        sourcesPromise = Promise.resolve([]);
      } else if (trimmed.startsWith('http')) {
        sourcesPromise = extractFromUrl(trimmed);
      } else {
        sourcesPromise = searchByQuery(`${field} ${trimmed}`);
      }

      // Tavily検索と既存知識の取得を並列実行
      const [fetchedSources, allKnowledge] = await Promise.all([
        sourcesPromise,
        knowledgeApi.list({ field }),
      ]);

      setSources(fetchedSources);

      const existingCategories = [...new Set(allKnowledge.map(k => k.category))];

      const results    = await generateHypotheses(field, trimmed, fetchedSources, youtubeUrl, existingCategories);
      const relatedIds = await findRelatedKnowledge(trimmed, allKnowledge);

      setCandidates(results);
      setRelatedKnowledge(allKnowledge.filter(k => k._id && relatedIds.includes(k._id)));
    } catch (e: any) {
      Alert.alert('エラー', e.message ?? '生成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(index: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  async function saveSelected() {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    try {
      await Promise.all(
        [...selected].map(i => {
          const c = candidates[i];
          return knowledgeApi.create({
            field,
            category:                 c.category,
            subcategory:              c.subcategory || '',
            content:                  c.content,
            webSources:               sources.length > 0 ? [{
              field,
              query:               query.trim(),
              results:             sources.map(s => ({ title: s.title, url: s.url, snippet: s.snippet })),
              collectedAt:         new Date().toISOString(),
              usedInKnowledgeIds:  [],
            }] : [],
            supportingExperiences:    [],
            contradictingExperiences: [],
            confidenceScore:          0.2,
            type:                     'hypothesis',
            tags:                     [],
          });
        })
      );
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('エラー', e.message ?? '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  const canGenerate = !!query.trim() && !loading;
  const canSave     = selected.size > 0 && !saving;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeftIcon size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>気になることを投稿</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* 入力 */}
          <Text style={styles.label}>気になっていること</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="例：朝マズメのルアー選び、https://..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              multiline
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.generateBtn, !canGenerate && styles.btnDisabled]}
            onPress={generate}
            disabled={!canGenerate}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.generateBtnText}>投稿する</Text>
            }
          </TouchableOpacity>

          {/* 仮説候補リスト */}
          {candidates.length > 0 && (
            <>
              <Text style={styles.resultsLabel}>
                関連する知識候補 — 保存するものを選択
              </Text>
              {candidates.map((c, i) => {
                const isSelected = selected.has(i);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.candidateCard, isSelected && styles.candidateCardSelected]}
                    onPress={() => toggleSelect(i)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.candidateRow}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <CheckIcon size={12} color="#000" strokeWidth={3} />}
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.candidateContent, isSelected && styles.candidateContentSelected]}>
                          {c.content}
                        </Text>
                        <Text style={styles.candidateCategory}>{c.category}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.generateBtn, !canGenerate && styles.btnDisabled]}
                onPress={generate}
                disabled={!canGenerate}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.generateBtnText}>Web収集 → 仮説生成</Text>
                }
              </TouchableOpacity>

              {/* 関連する既存知識 */}
              {relatedKnowledge.length > 0 && (
                <>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.resultsLabel}>関連する既存知識</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{relatedKnowledge.length}</Text>
                    </View>
                  </View>
                  {relatedKnowledge.map((k, i) => {
                    const color = knowledgeColor(k);
                    const pct   = Math.round(k.confidenceScore * 100);
                    return (
                      <View key={k._id ?? i} style={styles.relatedCard}>
                        <View style={[styles.relatedStripe, { backgroundColor: color }]} />
                        <View style={styles.relatedBody}>
                          <Text style={styles.relatedContent} numberOfLines={2}>{k.content}</Text>
                          <View style={styles.relatedMeta}>
                            <Text style={styles.relatedCategory}>{k.category}</Text>
                            <View style={[styles.statusTag, { borderColor: color }]}>
                              <Text style={[styles.statusTagText, { color }]}>{knowledgeLabel(k)}</Text>
                            </View>
                            <Text style={[styles.relatedPct, { color }]}>{pct}%</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              {/* 仮説候補リスト */}
              {candidates.length > 0 && (
                <>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.resultsLabel}>仮説候補 — 保存するものを選択</Text>
                  </View>
                  {/* 共通カテゴリヘッダー */}
                  <View style={styles.groupCategoryRow}>
                    <Text style={styles.groupCategoryLabel}>カテゴリ：</Text>
                    <Text style={styles.groupCategoryName}>{candidates[0].category}</Text>
                  </View>
                  {candidates.map((c, i) => {
                    const isSelected = selected.has(i);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.candidateCard, isSelected && styles.candidateCardSelected]}
                        onPress={() => toggleSelect(i)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.candidateRow}>
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <CheckIcon size={12} color="#000" strokeWidth={3} />}
                          </View>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={[styles.candidateContent, isSelected && styles.candidateContentSelected]}>
                              {c.content}
                            </Text>
                            {!!c.subcategory && (
                              <Text style={styles.candidateCategory}>{c.subcategory}</Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.saveBtn, !canSave && styles.btnDisabled]}
                    onPress={saveSelected}
                    disabled={!canSave}
                    activeOpacity={0.8}
                  >
                    {saving
                      ? <ActivityIndicator color="#000" size="small" />
                      : <Text style={styles.saveBtnText}>
                          {selected.size}件を知識として保存
                        </Text>
                    }
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },

  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  label: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },

  inputRow: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  input: {
    fontSize: font.md, color: colors.text, minHeight: 60, lineHeight: 22,
  },

  generateBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  generateBtnText: { fontSize: font.sm, color: '#000', fontWeight: '700' },

  btnDisabled: { opacity: 0.4 },

  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
  },
  resultsLabel: {
    fontSize: font.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: colors.bgCard, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  countBadgeText: { fontSize: font.xs, color: colors.textSub, fontWeight: '600' },

  // 関連既存知識カード
  relatedCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  relatedStripe: { width: 3 },
  relatedBody:   { flex: 1, padding: 12, gap: 6 },
  relatedContent: { fontSize: font.sm, color: colors.textSub, lineHeight: 19 },
  relatedMeta:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  relatedCategory: { fontSize: font.xs, color: colors.textMuted, flex: 1 },
  statusTag: {
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  statusTagText: { fontSize: font.xs, fontWeight: '600' },
  relatedPct:    { fontSize: font.xs, fontWeight: '700' },

  // 仮説候補グループヘッダー
  groupCategoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 2,
  },
  groupCategoryLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600' },
  groupCategoryName:  { fontSize: font.xs, color: colors.textSub, fontWeight: '700' },

  // 仮説候補カード
  candidateCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    padding: 14,
  },
  candidateCardSelected: {
    borderColor: colors.primary, backgroundColor: '#0d2a1f',
  },
  candidateRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },

  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  checkboxSelected: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },

  candidateContent: { fontSize: font.sm, color: colors.textSub, lineHeight: 20 },
  candidateContentSelected: { color: colors.text },
  candidateCategory: { fontSize: font.xs, color: colors.textMuted },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { fontSize: font.sm, color: '#000', fontWeight: '700' },
});
