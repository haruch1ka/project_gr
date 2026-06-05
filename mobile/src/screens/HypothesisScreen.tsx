import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { ArrowLeftIcon, CheckIcon } from 'react-native-heroicons/outline';
import { searchByQuery, extractFromUrl, isYouTubeUrl, TavilyResult } from '../services/tavily';
import { generateHypotheses, HypothesisCandidate } from '../services/gemini';
import { knowledgeApi } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Hypothesis'>;

export default function HypothesisScreen({ navigation, route }: Props) {
  const { field } = route.params;

  const [query, setQuery]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [candidates, setCandidates] = useState<HypothesisCandidate[]>([]);
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [saving, setSaving]       = useState(false);
  const [sources, setSources]     = useState<TavilyResult[]>([]);

  async function generate() {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setCandidates([]);
    setSelected(new Set());

    try {
      let fetchedSources: TavilyResult[] = [];
      let youtubeUrl: string | undefined;

      if (isYouTubeUrl(trimmed)) {
        youtubeUrl = trimmed;
      } else if (trimmed.startsWith('http')) {
        fetchedSources = await extractFromUrl(trimmed);
      } else {
        fetchedSources = await searchByQuery(`${field} ${trimmed}`);
      }

      setSources(fetchedSources);
      const results = await generateHypotheses(field, trimmed, fetchedSources, youtubeUrl);
      setCandidates(results);
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
            status:                   'hypothesis',
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
          <Text style={styles.headerTitle}>仮説を生成</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* 入力 */}
          <Text style={styles.label}>気になること・URL・YouTube</Text>
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
              : <Text style={styles.generateBtnText}>Web収集 → 仮説生成</Text>
            }
          </TouchableOpacity>

          {/* 仮説候補リスト */}
          {candidates.length > 0 && (
            <>
              <Text style={styles.resultsLabel}>
                仮説候補 — 保存するものを選択
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

  resultsLabel: {
    fontSize: font.xs, color: colors.textMuted, fontWeight: '600',
    letterSpacing: 0.5, marginTop: 8,
  },

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
