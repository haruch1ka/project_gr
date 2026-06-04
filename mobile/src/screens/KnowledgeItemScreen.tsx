import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, SafeAreaView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font } from '../constants/theme';
import { mockKnowledge } from '../constants/mockData';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'KnowledgeItem'>;
  route: RouteProp<RootStackParamList, 'KnowledgeItem'>;
};

export default function KnowledgeItemScreen({ navigation, route }: Props) {
  const { field, category, item } = route.params;
  const found = mockKnowledge.find(k => k.field === field && k.category === category && k.content === item);
  const [notes, setNotes] = useState<string[]>(found?.tags ?? []);
  const [adding, setAdding] = useState(false);
  const [newNote, setNewNote] = useState('');

  function addNote() {
    if (!newNote.trim()) return;
    setNotes([...notes, newNote.trim()]);
    setNewNote('');
    setAdding(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
            adding ? (
              <View style={styles.addingRow}>
                <TextInput
                  style={styles.addInput}
                  placeholder="メモを入力…"
                  placeholderTextColor={colors.textMuted}
                  value={newNote}
                  onChangeText={setNewNote}
                  autoFocus
                  multiline
                />
                <View style={styles.addingActions}>
                  <TouchableOpacity onPress={() => { setAdding(false); setNewNote(''); }}>
                    <Text style={styles.cancelBtn}>キャンセル</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addBtn} onPress={addNote}>
                    <Text style={styles.addBtnText}>追加</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setAdding(true)}>
                <Text style={styles.addNoteBtn}>＋ メモを追加</Text>
              </TouchableOpacity>
            )
          }
          renderItem={({ item: note }) => (
            <Text style={styles.note}>{note}</Text>
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 16,
  },
  back: { fontSize: 20, color: colors.text, paddingTop: 2 },
  title: { fontSize: font.lg, fontWeight: '700', flex: 1, lineHeight: 26 },
  noteList: { padding: 20, gap: 0 },
  note: {
    fontSize: 14, color: colors.textSub,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    lineHeight: 22,
  },
  empty: { fontSize: 14, color: colors.textMuted, paddingVertical: 16 },
  addNoteBtn: { fontSize: 14, color: colors.textMuted, paddingVertical: 16 },
  addingRow: { paddingTop: 12, gap: 10 },
  addInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 12,
    padding: 12, fontSize: font.md, color: colors.text,
    backgroundColor: colors.bgInput, minHeight: 80, textAlignVertical: 'top',
  },
  addingActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  cancelBtn: { fontSize: font.md, color: colors.textMuted },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: font.sm },
});
