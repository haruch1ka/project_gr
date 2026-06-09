import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { useField } from '../context/FieldContext';
import { colors, font } from '../constants/theme';
import { experienceApi } from '../services/api';
import { Experience } from '../types/index';

function ExperienceItem({ item }: { item: Experience }) {
  const dateStr = item.date
    ? new Date(item.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    : '';
  return (
    <View style={styles.item}>
      <Text style={styles.date}>{dateStr}</Text>
      <Text style={styles.memo}>{item.memo}</Text>
    </View>
  );
}

export default function ExperienceScreen() {
  const { activeField: field } = useField();
  const [logs, setLogs] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!field) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await experienceApi.list(field);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [field]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>記録</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, i) => item._id ?? String(i)}
          style={styles.list}
          contentContainerStyle={[styles.listContent, logs.length === 0 && { flex: 1 }]}
          ListHeaderComponent={
            logs.length > 0
              ? <Text style={styles.sectionLabel}>記録 ({logs.length}件)</Text>
              : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>✏️</Text>
              <Text style={styles.emptyText}>まだ記録がありません</Text>
              <Text style={styles.emptySub}>中央ボタンから記録を残せます</Text>
            </View>
          }
          renderItem={({ item }) => <ExperienceItem item={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  title:        { fontSize: font.xl, fontWeight: '700', color: colors.text, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  list:         { flex: 1 },
  listContent:  { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  sectionLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
  item: {
    flexDirection: 'row', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  date:      { fontSize: 12, color: colors.textMuted, width: 36, paddingTop: 2 },
  memo:      { flex: 1, fontSize: font.sm, color: colors.text, lineHeight: 20 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: font.md, fontWeight: '600', color: colors.textMuted },
  emptySub:  { fontSize: font.sm, color: colors.textMuted, textAlign: 'center' },
});
