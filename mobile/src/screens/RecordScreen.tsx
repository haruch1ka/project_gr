import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { db } from '../services/mongodb';
import { Experience } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Record'>;
  route: RouteProp<RootStackParamList, 'Record'>;
};

export default function RecordScreen({ navigation, route }: Props) {
  const { field } = route.params;
  const [memo, setMemo] = useState('');
  const [logs, setLogs] = useState<Experience[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const res = await db.find('experiences', { field });
      setLogs(res.documents ?? []);
    } catch {}
  }

  async function save() {
    if (!memo.trim()) return;
    const doc: Experience = {
      field,
      memo: memo.trim(),
      date: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      createdAt: new Date().toISOString(),
    };
    try {
      await db.insertOne('experiences', doc);
      setLogs([doc, ...logs]);
      setMemo('');
    } catch {}
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{field}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.navigate('Knowledge', { field })}>
            <Text style={styles.actionIcon}>📚</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Chat', { field })}>
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(_, i) => String(i)}
        style={styles.logList}
        ListHeaderComponent={
          <Text style={styles.logsTitle}>最近の記録</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <Text style={styles.logDate}>{item.date}</Text>
            <Text style={styles.logText} numberOfLines={1}>{item.memo}</Text>
          </View>
        )}
      />

      <View style={styles.form}>
        <Text style={styles.label}>メモ</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="今日の気づき、結果、次に試したいことなど…"
          placeholderTextColor="#bbb"
          value={memo}
          onChangeText={setMemo}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>保存する</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 52 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  back: { fontSize: 20, color: '#333', marginRight: 16 },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  actionIcon: { fontSize: 20, padding: 4 },
  logList: { maxHeight: 180, paddingHorizontal: 20 },
  logsTitle: { fontSize: 11, color: '#aaa', fontWeight: '600', marginTop: 12, marginBottom: 8 },
  logItem: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  logDate: { fontSize: 12, color: '#aaa', width: 36 },
  logText: { flex: 1, fontSize: 14, color: '#444' },
  form: { padding: 20, gap: 12 },
  label: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12,
    padding: 14, fontSize: 15, height: 140,
    textAlignVertical: 'top', backgroundColor: '#fafafa', color: '#222',
  },
  saveBtn: { backgroundColor: '#4f7bff', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
