import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { experienceApi, knowledgeApi } from '../services/api';
import { updateKnowledgeFromExperience } from '../services/gemini';
import { XMarkIcon } from 'react-native-heroicons/outline';

const FIELD_ICONS: Record<string, string> = {
  釣り: '🎣', 筋トレ: '💪', 読書: '📖', 料理: '🍳', 音楽: '🎵',
  英語: '🌍', ゴルフ: '⛳', ランニング: '🏃',
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'QuickLog'>;
};

export default function QuickLogScreen({ navigation }: Props) {
  const [fields, setFields] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchFields = useCallback(async () => {
    try {
      const data = await knowledgeApi.list();
      const unique = [...new Set(data.map(k => k.field))];
      setFields(unique);
      if (unique.length > 0) setSelectedField(unique[0]);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  async function save() {
    if (!memo.trim() || !selectedField || saving) return;
    setSaving(true);
    const today = new Date();
    const date = `${today.getMonth() + 1}/${today.getDate()}`;
    try {
      await experienceApi.create({ field: selectedField, date, memo: memo.trim() });
      // 保存後、非同期で知識の確信度を更新（UIをブロックしない）
      updateKnowledgeFromExperience(selectedField, memo.trim()).catch(console.error);
      navigation.goBack();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        {/* ハンドル */}
        <View style={styles.handle} />

        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>記録を残す</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <XMarkIcon size={22} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* 分野選択 */}
          <Text style={styles.label}>分野</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fieldRow}>
            {fields.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.fieldChip, selectedField === f && styles.fieldChipActive]}
                onPress={() => setSelectedField(f)}
                activeOpacity={0.7}
              >
                <Text style={styles.fieldChipIcon}>{FIELD_ICONS[f] ?? '📌'}</Text>
                <Text style={[styles.fieldChipText, selectedField === f && styles.fieldChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* メモ入力 */}
          <Text style={styles.label}>メモ</Text>
          <TextInput
            style={styles.input}
            multiline
            autoFocus
            placeholder="今日の気づき、結果、次に試したいことなど…"
            placeholderTextColor={colors.textMuted}
            value={memo}
            onChangeText={setMemo}
            textAlignVertical="top"
          />

          {/* 保存ボタン */}
          <TouchableOpacity
            style={[styles.saveBtn, (!memo.trim() || !selectedField || saving) && styles.saveBtnDisabled]}
            onPress={save}
            disabled={!memo.trim() || !selectedField || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>保存する</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  title:    { fontSize: font.lg, fontWeight: '700', color: colors.text },
  closeBtn: { fontSize: 18, color: colors.textMuted, padding: 4 },

  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  label: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },

  fieldRow: { gap: 8, paddingBottom: 4 },
  fieldChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.xl, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  fieldChipActive:     { borderColor: colors.primary, backgroundColor: colors.bgInput },
  fieldChipIcon:       { fontSize: 14 },
  fieldChipText:       { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  fieldChipTextActive: { color: colors.primary, fontWeight: '700' },

  input: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: radius.md,
    padding: 14, fontSize: font.md, height: 140,
    backgroundColor: colors.bgInput, color: colors.text,
  },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: 16, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#c0cdff' },
  saveBtnText:     { color: '#fff', fontSize: font.md, fontWeight: '700' },
});
