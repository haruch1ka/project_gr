import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font } from '../constants/theme';
import { ChatMessage } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

export default function ChatScreen({ navigation, route }: Props) {
  const { field } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: `${field}について、経験や疑問を話してください。一緒に整理しましょう。` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 1000));
    const aiMsg: ChatMessage = {
      role: 'assistant',
      text: `（Gemini API 未接続）\n\n「${text}」について、もう少し詳しく教えてください。どんな状況でしたか？`,
    };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{field}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => navigation.navigate('Web', { field })}>
              <Text style={styles.actionIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={[styles.actionIcon, styles.actionIconActive]}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Knowledge', { field })}>
              <Text style={styles.actionIcon}>📚</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Plan', { field })}>
              <Text style={styles.actionIcon}>📋</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.messageList}
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
              </View>
            ) : null
          }
        />

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
  },
  back: { fontSize: 20, color: colors.text, marginRight: 16 },
  title: { fontSize: font.lg, fontWeight: '700', flex: 1 },
  actions: { flexDirection: 'row', gap: 4 },
  actionIcon: { fontSize: 20, padding: 6 },
  actionIconActive: { opacity: 0.4 },
  messageList: { padding: 16, gap: 10 },
  bubble: {
    maxWidth: '80%', borderRadius: 16, padding: 12,
    backgroundColor: '#f0f0f0', alignSelf: 'flex-start',
  },
  bubbleUser: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleAI: {},
  bubbleText: { fontSize: font.md, color: colors.text, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  loadingRow: { paddingVertical: 12, alignItems: 'flex-start', paddingHorizontal: 4 },
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
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { backgroundColor: '#c0cdff' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: font.sm },
});
