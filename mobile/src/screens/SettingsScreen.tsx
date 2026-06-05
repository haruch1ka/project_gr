import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeftIcon, PlusIcon, TrashIcon,
  CheckCircleIcon, EyeIcon, EyeSlashIcon,
} from 'react-native-heroicons/outline';
import { useField } from '../context/FieldContext';
import { colors, font, radius } from '../constants/theme';
import { saveGeminiKey, getGeminiKey, clearGeminiKey } from '../services/gemini';
import { saveTavilyKey, getTavilyKey, clearTavilyKey } from '../services/tavily';

const ICON_OPTIONS = ['🎣', '💪', '📖', '🎸', '🏊', '🧘', '🍳', '✏️', '🎾', '⚽', '🎨', '🎮'];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { fields, addField, removeField } = useField();
  const [modalVisible,  setModalVisible]  = useState(false);
  const [newName,       setNewName]       = useState('');
  const [selectedIcon,  setSelectedIcon]  = useState(ICON_OPTIONS[0]);

  // Gemini APIキー
  const [keyInput,   setKeyInput]   = useState('');
  const [keyStored,  setKeyStored]  = useState(false);
  const [showKey,    setShowKey]    = useState(false);
  const [keySaving,  setKeySaving]  = useState(false);

  // Tavily APIキー
  const [tavilyInput,   setTavilyInput]   = useState('');
  const [tavilyStored,  setTavilyStored]  = useState(false);
  const [showTavily,    setShowTavily]    = useState(false);
  const [tavilySaving,  setTavilySaving]  = useState(false);

  useEffect(() => {
    getGeminiKey().then(k => setKeyStored(!!k));
    getTavilyKey().then(k => setTavilyStored(!!k));
  }, []);

  async function handleSaveKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setKeySaving(true);
    try {
      await saveGeminiKey(trimmed);
      setKeyStored(true);
      setKeyInput('');
      Alert.alert('保存しました', 'Gemini APIキーを保存しました。');
    } finally {
      setKeySaving(false);
    }
  }

  async function handleClearKey() {
    Alert.alert('削除確認', 'APIキーを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          await clearGeminiKey();
          setKeyStored(false);
          setKeyInput('');
        },
      },
    ]);
  }

  async function handleSaveTavilyKey() {
    const trimmed = tavilyInput.trim();
    if (!trimmed) return;
    setTavilySaving(true);
    try {
      await saveTavilyKey(trimmed);
      setTavilyStored(true);
      setTavilyInput('');
      Alert.alert('保存しました', 'Tavily APIキーを保存しました。');
    } finally {
      setTavilySaving(false);
    }
  }

  async function handleClearTavilyKey() {
    Alert.alert('削除確認', 'Tavily APIキーを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          await clearTavilyKey();
          setTavilyStored(false);
          setTavilyInput('');
        },
      },
    ]);
  }

  const openModal = () => {
    setNewName('');
    setSelectedIcon(ICON_OPTIONS[0]);
    setModalVisible(true);
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (fields.some(f => f.name === name)) {
      Alert.alert('エラー', 'その分野名はすでに存在します');
      return;
    }
    addField({ name, icon: selectedIcon });
    setModalVisible(false);
  };

  const handleRemove = (name: string) => {
    if (fields.length <= 1) {
      Alert.alert('エラー', '最低1つの分野が必要です');
      return;
    }
    Alert.alert('削除確認', `「${name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => removeField(name) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeftIcon size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Gemini APIキー */}
        <Text style={styles.sectionLabel}>Gemini APIキー</Text>
        <View style={styles.card}>
          {keyStored ? (
            <View style={styles.keyRow}>
              <CheckCircleIcon size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.keySetText}>設定済み</Text>
              <TouchableOpacity onPress={handleClearKey} style={styles.keyAction} activeOpacity={0.7}>
                <Text style={styles.keyActionText}>削除</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.keyInputWrap}>
              <View style={styles.keyInputRow}>
                <TextInput
                  style={styles.keyInput}
                  value={keyInput}
                  onChangeText={setKeyInput}
                  placeholder="AIzaSy..."
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowKey(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                  {showKey
                    ? <EyeSlashIcon size={18} color={colors.textMuted} strokeWidth={2} />
                    : <EyeIcon      size={18} color={colors.textMuted} strokeWidth={2} />
                  }
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.keySaveBtn, (!keyInput.trim() || keySaving) && styles.keySaveBtnDisabled]}
                onPress={handleSaveKey}
                disabled={!keyInput.trim() || keySaving}
                activeOpacity={0.7}
              >
                <Text style={styles.keySaveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tavily APIキー */}
        <Text style={styles.sectionLabel}>Tavily APIキー（Web検索）</Text>
        <View style={styles.card}>
          {tavilyStored ? (
            <View style={styles.keyRow}>
              <CheckCircleIcon size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.keySetText}>設定済み</Text>
              <TouchableOpacity onPress={handleClearTavilyKey} style={styles.keyAction} activeOpacity={0.7}>
                <Text style={styles.keyActionText}>削除</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.keyInputWrap}>
              <View style={styles.keyInputRow}>
                <TextInput
                  style={styles.keyInput}
                  value={tavilyInput}
                  onChangeText={setTavilyInput}
                  placeholder="tvly-..."
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showTavily}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowTavily(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                  {showTavily
                    ? <EyeSlashIcon size={18} color={colors.textMuted} strokeWidth={2} />
                    : <EyeIcon      size={18} color={colors.textMuted} strokeWidth={2} />
                  }
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.keySaveBtn, (!tavilyInput.trim() || tavilySaving) && styles.keySaveBtnDisabled]}
                onPress={handleSaveTavilyKey}
                disabled={!tavilyInput.trim() || tavilySaving}
                activeOpacity={0.7}
              >
                <Text style={styles.keySaveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>分野の管理</Text>
        <View style={styles.card}>
          {fields.map((f, i) => (
            <View
              key={f.name}
              style={[styles.fieldRow, i < fields.length - 1 && styles.fieldBorder]}
            >
              <Text style={styles.fieldIcon}>{f.icon}</Text>
              <Text style={styles.fieldName}>{f.name}</Text>
              <TouchableOpacity
                onPress={() => handleRemove(f.name)}
                activeOpacity={0.7}
                style={styles.removeBtn}
              >
                <TrashIcon size={16} color={colors.danger} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addRow} onPress={openModal} activeOpacity={0.7}>
            <PlusIcon size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.addRowText}>分野を追加</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>アプリについて</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>バージョン</Text>
            <Text style={styles.infoValue}>0.1.0</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>コンセプト</Text>
            <Text style={styles.infoValueSub}>Web知識 × 実経験の統合</Text>
          </View>
        </View>

      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>分野を追加</Text>

            <TextInput
              style={styles.input}
              placeholder="分野名（例: 料理）"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />

            <Text style={styles.iconSectionLabel}>アイコン</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconItem, selectedIcon === icon && styles.iconItemActive]}
                  onPress={() => setSelectedIcon(icon)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sheetBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, !newName.trim() && styles.confirmBtnDisabled]}
                onPress={handleAdd}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn:     { padding: 6, borderRadius: radius.sm },
  headerTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },

  scroll:       { padding: 16, gap: 8, paddingBottom: 40 },
  sectionLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5, marginTop: 8 },

  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, overflow: 'hidden', marginTop: 6 },

  // APIキー
  keyRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 14 },
  keySetText:  { flex: 1, fontSize: font.sm, color: colors.text, fontWeight: '500' },
  keyAction:   { paddingHorizontal: 10, paddingVertical: 4 },
  keyActionText:{ fontSize: font.sm, color: colors.danger, fontWeight: '600' },
  keyInputWrap:{ padding: 14, gap: 10 },
  keyInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderInput, borderRadius: radius.sm, backgroundColor: colors.bg, paddingHorizontal: 12 },
  keyInput:    { flex: 1, fontSize: font.sm, color: colors.text, paddingVertical: 11 },
  eyeBtn:      { padding: 4 },
  keySaveBtn:  { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  keySaveBtnDisabled: { opacity: 0.4 },
  keySaveBtnText:{ fontSize: font.sm, color: '#000', fontWeight: '700' },

  fieldRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  fieldBorder:{ borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldIcon:  { fontSize: 18 },
  fieldName:  { flex: 1, fontSize: font.sm, color: colors.text, fontWeight: '500' },
  removeBtn:  { padding: 6 },

  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  addRowText: { fontSize: font.sm, color: colors.primary, fontWeight: '600' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabel:   { fontSize: font.sm, color: colors.text },
  infoValue:   { fontSize: font.sm, color: colors.textMuted },
  infoValueSub:{ fontSize: font.xs, color: colors.textMuted, maxWidth: 160, textAlign: 'right' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 24, gap: 16,
  },
  sheetTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text, textAlign: 'center' },

  input: {
    backgroundColor: colors.bg, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.borderInput,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: font.sm, color: colors.text,
  },

  iconSectionLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconItem: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  iconItemActive: { borderColor: colors.primary, backgroundColor: '#0d2a1f' },
  iconText: { fontSize: 22 },

  sheetBtns:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelText:   { fontSize: font.sm, color: colors.text, fontWeight: '600' },
  confirmBtn:   { flex: 1, paddingVertical: 13, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText:  { fontSize: font.sm, color: '#000', fontWeight: '700' },
});
