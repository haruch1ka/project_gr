import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Modal, TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { colors, font } from '../constants/theme';
import { mockFields } from '../constants/mockData';
import { Field } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const ICONS = ['🎣', '💪', '📖', '🎸', '🏃', '✍️', '🎨', '🧘', '🌱'];

export default function HomeScreen({ navigation }: Props) {
  const [fields, setFields] = useState<Field[]>(mockFields);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🎯');

  function addField() {
    if (!newName.trim()) return;
    setFields([...fields, { name: newName.trim(), icon: newIcon }]);
    setNewName('');
    setNewIcon('🎯');
    setModalVisible(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>上達ノート</Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {fields.map((field) => (
          <TouchableOpacity
            key={field.name}
            style={styles.card}
            onPress={() => navigation.navigate('Record', { field: field.name })}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{field.icon}</Text>
            <Text style={styles.fieldName}>{field.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.card, styles.addCard]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addPlus}>＋</Text>
          <Text style={styles.addLabel}>追加</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>分野を追加</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="分野名（例：水泳）"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconRow}>
              {ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconChoice, newIcon === ic && styles.iconChoiceActive]}
                  onPress={() => setNewIcon(ic)}
                >
                  <Text style={styles.iconChoiceText}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtn}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={addField}>
                <Text style={styles.addBtnText}>追加</Text>
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
  title: { fontSize: font.xl, fontWeight: '700', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12, paddingBottom: 20 },
  card: {
    width: '30%', aspectRatio: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 32, marginBottom: 6 },
  fieldName: { fontSize: font.sm, fontWeight: '600', color: colors.text },
  addCard: { backgroundColor: colors.bg, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc' },
  addPlus: { fontSize: 24, color: colors.textMuted },
  addLabel: { fontSize: font.xs, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: font.lg, fontWeight: '700' },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 12,
    padding: 14, fontSize: font.md, color: colors.text, backgroundColor: colors.bgInput,
  },
  iconRow: { flexDirection: 'row' },
  iconChoice: { padding: 8, borderRadius: 8, marginRight: 4 },
  iconChoiceActive: { backgroundColor: '#eef0ff' },
  iconChoiceText: { fontSize: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  cancelBtn: { fontSize: font.md, color: colors.textMuted },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: font.md },
});
