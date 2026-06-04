import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { experienceApi } from '../services/api';
import { updateKnowledgeFromExperience } from '../services/gemini';
import { XMarkIcon, PaperAirplaneIcon } from 'react-native-heroicons/outline';
import { mockFields } from '../constants/mockData';

type Field = { name: string; icon: string };
type Props = NativeStackScreenProps<RootStackParamList, 'QuickLog'>;

export default function QuickLogScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const routeFields = route.params?.fields ?? mockFields;
  const initialField = route.params?.field ?? routeFields[0]?.name ?? '';

  const [fields]         = useState<Field[]>(routeFields);
  const [selectedField, setSelectedField] = useState(initialField);
  const [memo, setMemo]  = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!memo.trim() || !selectedField || saving) return;
    setSaving(true);
    const today = new Date();
    const date = `${today.getMonth() + 1}/${today.getDate()}`;
    try {
      await experienceApi.create({ field: selectedField, date, memo: memo.trim() });
      updateKnowledgeFromExperience(selectedField, memo.trim()).catch(console.error);
      navigation.goBack();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!memo.trim() && !!selectedField && !saving;

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 外側タップで閉じる */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />

      {/* モーダルカード */}
      <View style={[styles.card, { paddingBottom: insets.bottom }]}>

        {/* ── ヘッダー（分野タブ + 閉じるボタン） ── */}
        <View style={styles.header}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
          >
            {fields.map(f => {
              const active = f.name === selectedField;
              return (
                <TouchableOpacity
                  key={f.name}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setSelectedField(f.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tabIcon}>{f.icon}</Text>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{f.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <XMarkIcon size={20} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── メモ入力 ── */}
        <TextInput
          style={styles.input}
          multiline
          autoFocus
          placeholder="今日の経験を一言で…"
          placeholderTextColor={colors.textSecondary}
          value={memo}
          onChangeText={setMemo}
          textAlignVertical="top"
        />

        {/* ── ボトムバー ── */}
        <View style={styles.bottomBar}>
          <Text style={styles.hintText}>一言 → AIが構造化 → 確認</Text>
          <TouchableOpacity
            style={[styles.recordBtn, !canSave && styles.recordBtnDisabled]}
            onPress={save}
            disabled={!canSave}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <PaperAirplaneIcon size={14} color="#000" strokeWidth={2.5} />
                <Text style={styles.recordBtnText}>記録</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  card: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },

  // ── ヘッダー ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgDeep,
  },
  tabActive: {
    borderColor: colors.blue,
    backgroundColor: '#0d1e40',
  },
  tabIcon:       { fontSize: 14 },
  tabText:       { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: colors.blue, fontWeight: '700' },
  closeBtn:      { padding: 4, marginLeft: 4 },

  // ── 入力 ──
  input: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    fontSize: font.md,
    color: colors.text,
    lineHeight: 26,
    minHeight: 80,
  },

  // ── ボトムバー ──
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hintText:          { fontSize: font.xs, color: colors.textSecondary },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  recordBtnDisabled: { opacity: 0.4 },
  recordBtnText:     { fontSize: font.sm, color: '#000', fontWeight: '700' },
});
