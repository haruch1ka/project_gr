import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { db } from '../services/mongodb';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'KnowledgeItem'>;
  route: RouteProp<RootStackParamList, 'KnowledgeItem'>;
};

export default function KnowledgeItemScreen({ navigation, route }: Props) {
  const { field, category, item } = route.params;
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    try {
      const res = await db.find('knowledge_items', { field, category, content: item });
      setNotes(res.documents?.[0]?.notes ?? []);
    } catch {}
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>{item}</Text>
      </View>
      <FlatList
        data={notes}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.noteList}
        ListEmptyComponent={<Text style={styles.empty}>まだメモはありません</Text>}
        ListFooterComponent={
          <TouchableOpacity>
            <Text style={styles.addNote}>メモを追加…</Text>
          </TouchableOpacity>
        }
        renderItem={({ item: note }) => (
          <Text style={styles.note}>{note}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 52 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 16,
  },
  back: { fontSize: 20, color: '#333' },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  noteList: { padding: 20, gap: 0 },
  note: { fontSize: 14, color: '#444', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f2f2f2', lineHeight: 22 },
  empty: { fontSize: 14, color: '#bbb', paddingVertical: 16 },
  addNote: { fontSize: 14, color: '#bbb', paddingVertical: 16 },
});
