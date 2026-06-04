import React, { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { TabParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { ChatMessage } from '../types';
import { chat } from '../services/gemini';
import { mockKnowledge, mockExperiences, mockFields } from '../constants/mockData';

type ChatRoute = RouteProp<TabParamList, 'Chat'>;

const ACTION_THRESHOLD = 4;

function buildSystemPrompt(field: string): string {
  const knowledge = mockKnowledge.filter(k => k.field === field);
  const experiences = mockExperiences[field] ?? [];

  const knowledgePart = knowledge.length > 0
    ? knowledge.map(k => {
        const statusLabel = k.status === 'verified' ? '検証済' : k.status === 'disproved' ? '反証' : '仮説';
        return `- [${statusLabel} ${Math.round(k.confidenceScore * 100)}%] ${k.content}`;
      }).join('\n')
    : '（まだ知識がありません）';

  const experiencePart = experiences.length > 0
    ? experiences.slice(0, 5).map(e => `- ${e.date}: ${e.memo}`).join('\n')
    : '（まだ経験ログがありません）';

  return `あなたはユーザーの「${field}」分野での上達を支援するAIアシスタントです。
以下のユーザーの知識と経験ログを文脈として対話してください。

【現在の知識】
${knowledgePart}

【最近の経験ログ】
${experiencePart}

対話では：
- ユーザーの経験と既存の知識を結びつける
- 仮説の検証・反証につながる質問をする
- 具体的で実践的な洞察を提供する
必ず日本語で返答してください。`;
}

export default function ChatScreen() {
  const route = useRoute<ChatRoute>();
  const routeField = route.params?.field ?? null;

  const [selectedField, setSelectedField] = useState<string | null>(routeField);
  const [messages, setMessages] = useState<ChatMessage[]>(
    routeField
      ? [{ role: 'assistant', text: `${routeField}について、最近の経験や疑問を話してください。一緒に整理しましょう。` }]
      : []
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const listRef = useRef<FlatList>(null);

  function selectField(field: string) {
    setSelectedField(field);
    setMessages([{ role: 'assistant', text: `${field}について、最近の経験や疑問を話してください。一緒に整理しましょう。` }]);
    setShowActions(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || !selectedField) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = newMessages
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`)
        .join('\n');
      const systemPrompt = buildSystemPrompt(selectedField);
      const context = `${systemPrompt}\n\n【会話履歴】\n${history}`;

      const reply = await chat(`ユーザー: ${text}\nAI:`, context);
      const updated: ChatMessage[] = [...newMessages, { role: 'assistant', text: reply }];
      setMessages(updated);

      if (updated.length >= ACTION_THRESHOLD) {
        setShowActions(true);
      }
    } catch (e) {
      const err = e as Error;
      const errorText = err.message.includes('未設定')
        ? 'Gemini APIキーが設定されていません。'
        : '送信に失敗しました。しばらく待ってから再試行してください。';
      setMessages(prev => [...prev, { role: 'assistant', text: errorText }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  if (!selectedField) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI対話</Text>
          <Text style={styles.headerSub}>分野を選んでください</Text>
        </View>
        <View style={styles.fieldSelect}>
          {mockFields.map(f => (
            <TouchableOpacity
              key={f.name}
              style={styles.fieldChip}
              onPress={() => selectField(f.name)}
              activeOpacity={0.7}
            >
              <Text style={styles.fieldChipIcon}>{f.icon}</Text>
              <Text style={styles.fieldChipText}>{f.name}</Text>
              <Text style={styles.fieldChipArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ヘッダー */}
        <View style={styles.header}>
          {routeField == null && (
            <TouchableOpacity
              onPress={() => setSelectedField(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.back}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{selectedField}</Text>
            <Text style={styles.headerSub}>AI対話</Text>
          </View>
        </View>

        {/* メッセージリスト */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
              <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
                {item.text}
              </Text>
            </View>
          )}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.loadingText}>考え中…</Text>
              </View>
            ) : null
          }
        />

        {/* 対話完了後のアクション */}
        {showActions && !loading && (
          <View style={styles.actions}>
            <Text style={styles.actionsLabel}>── 対話まとめ ──</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Text style={styles.actionBtnIcon}>📋</Text>
                <Text style={styles.actionBtnText}>プランを提案</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Text style={styles.actionBtnIcon}>💡</Text>
                <Text style={styles.actionBtnText}>知識として保存</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Text style={styles.actionBtnIcon}>📊</Text>
                <Text style={styles.actionBtnText}>グラフで確認</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 入力欄 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="メッセージを入力…"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>送信</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 12,
  },
  back: { fontSize: 20, color: colors.text },
  headerCenter: { flex: 1 },
  title: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: font.xs, color: colors.textMuted, marginTop: 1 },

  fieldSelect: { flex: 1, padding: 20, gap: 10, justifyContent: 'center' },
  fieldChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14,
  },
  fieldChipIcon: { fontSize: 24 },
  fieldChipText: { flex: 1, fontSize: font.md, fontWeight: '600', color: colors.text },
  fieldChipArrow: { fontSize: 20, color: colors.textSecondary },

  messageList: { padding: 16, gap: 10 },
  bubble: {
    maxWidth: '80%', borderRadius: 16, padding: 12,
    backgroundColor: colors.bgCard, alignSelf: 'flex-start',
  },
  bubbleUser: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleAI: {},
  bubbleText: { fontSize: font.md, color: colors.text, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },

  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  loadingText: { fontSize: font.sm, color: colors.textMuted },

  actions: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
    gap: 8,
  },
  actionsLabel: { fontSize: font.xs, color: colors.textMuted, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  actionBtnIcon: { fontSize: 18 },
  actionBtnText: { fontSize: 10, color: colors.textSub, textAlign: 'center' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 10,
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: colors.borderInput,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: font.md, color: colors.text, maxHeight: 100,
    backgroundColor: colors.bgInput,
  },
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sendBtnDisabled: { backgroundColor: colors.textSecondary },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: font.sm },
});
