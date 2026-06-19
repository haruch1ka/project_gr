import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { colors, font, radius } from '../constants/theme';
import { experienceApi } from '../services/api';
import { updateKnowledgeFromExperience } from '../services/gemini';
import {
  XMarkIcon, ChevronDownIcon, PaperAirplaneIcon, CheckIcon,
} from 'react-native-heroicons/outline';
import { mockFields } from '../constants/mockData';

type Field = { name: string; icon: string };
type Props = NativeStackScreenProps<RootStackParamList, 'QuickLog'>;

export default function QuickLogScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const routeFields  = route.params?.fields ?? mockFields;
  const initialField = route.params?.field  ?? routeFields[0]?.name ?? '';

  const [fields]         = useState<Field[]>(routeFields);
  const [selectedField, setSelectedField] = useState(initialField);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [memo, setMemo]  = useState('');
  const [saving, setSaving] = useState(false);

  const currentField = fields.find(f => f.name === selectedField);

  function selectField(name: string) {
    setSelectedField(name);
    setPickerOpen(false);
  }

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
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => { if (pickerOpen) setPickerOpen(false); else navigation.goBack(); }}
      />

      {/* モーダルカード */}
      <View style={[styles.card, { paddingBottom: insets.bottom }]}>

        {/* ── ヘッダー ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.fieldSelector, pickerOpen && styles.fieldSelectorOpen]}
            onPress={() => setPickerOpen(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.fieldIcon}>{currentField?.icon ?? '📌'}</Text>
            <Text style={styles.fieldName}>{selectedField || '分野'}</Text>
            <ChevronDownIcon
              size={13}
              color={pickerOpen ? colors.blue : colors.textMuted}
              strokeWidth={2}
              style={{ transform: [{ rotate: pickerOpen ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <XMarkIcon size={20} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── フィールド選択リスト（ドロップダウン） ── */}
        {pickerOpen && (
          <View style={styles.picker}>
            {fields.map(f => {
              const active = f.name === selectedField;
              return (
                <TouchableOpacity
                  key={f.name}
                  style={[styles.pickerItem, active && styles.pickerItemActive]}
                  onPress={() => selectField(f.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerIcon}>{f.icon}</Text>
                  <Text style={[styles.pickerText, active && styles.pickerTextActive]}>
                    {f.name}
                  </Text>
                  {active && <CheckIcon size={15} color={colors.blue} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── メモ入力 ── */}
        <TextInput
          style={styles.input}
          multiline
          autoFocus={!pickerOpen}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  fieldSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgDeep,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldSelectorOpen: {
    borderColor: colors.blue,
  },
  fieldIcon: { fontSize: 15 },
  fieldName: { fontSize: font.sm, color: colors.text, fontWeight: '600' },
  closeBtn:  { padding: 4 },

  // ── ドロップダウン ──
  picker: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.bgDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemActive: { backgroundColor: '#0d1e40' },
  pickerIcon:       { fontSize: 16 },
  pickerText:       { flex: 1, fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  pickerTextActive: { color: colors.blue, fontWeight: '700' },

  // ── 入力 ──
  input: {
    paddingHorizontal: 20,
    paddingTop: 8,
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
