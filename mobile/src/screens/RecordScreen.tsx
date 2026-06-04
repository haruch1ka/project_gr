import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font } from '../constants/theme';
import { mockExperiences } from '../constants/mockData';
import { Experience } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Record'>;
  route: RouteProp<RootStackParamList, 'Record'>;
};

export default function RecordScreen({ navigation, route }: Props) {
  const { field } = route.params;
  const [memo, setMemo] = useState('');
  const [logs, setLogs] = useState<Experience[]>(mockExperiences[field] ?? []);

  function save() {
    if (!memo.trim()) return;
    const today = new Date();
    const date = `${today.getMonth() + 1}/${today.getDate()}`;
    const newLog: Experience = { field, date, memo: memo.trim(), createdAt: new Date().toISOString() };
    setLogs([newLog, ...logs]);
    setMemo('');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{field}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => navigation.navigate('Web', { field })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.actionIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Chat', { field })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.actionIcon}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Knowledge', { field })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.actionIcon}>📚</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Plan', { field })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.actionIcon}>📋</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 最近の記録 */}
        <FlatList
          data={logs}
          keyExtractor={(_, i) => String(i)}
          style={styles.logList}
          ListHeaderComponent={<Text style={styles.logsTitle}>最近の記録</Text>}
          renderItem={({ item }) => (
            <View style={styles.logItem}>
              <Text style={styles.logDate}>{item.date}</Text>
              <Text style={styles.logText} numberOfLines={1}>{item.memo}</Text>
            </View>
          )}
        />

        {/* 入力フォーム */}
        <View style={styles.form}>
          <Text style={styles.label}>メモ</Text>
          <TextInput
            style={styles.input}
            multiline
            placeholder="今日の気づき、結果、次に試したいことなど…"
            placeholderTextColor={colors.textMuted}
            value={memo}
            onChangeText={setMemo}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.saveBtn, !memo.trim() && styles.saveBtnDisabled]}
            onPress={save}
            disabled={!memo.trim()}
          >
            <Text style={styles.saveBtnText}>保存する</Text>
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
  logList: { maxHeight: 200, paddingHorizontal: 20 },
  logsTitle: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600', marginTop: 14, marginBottom: 8, letterSpacing: 0.5 },
  logItem: {
    flexDirection: 'row', gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logDate: { fontSize: 12, color: colors.textMuted, width: 36 },
  logText: { flex: 1, fontSize: 14, color: colors.textSub },
  form: { padding: 20, gap: 10 },
  label: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 12,
    padding: 14, fontSize: font.md, height: 130,
    backgroundColor: colors.bgInput, color: colors.text,
  },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#c0cdff' },
  saveBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
});
