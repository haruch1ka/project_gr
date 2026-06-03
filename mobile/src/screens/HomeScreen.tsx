import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const FIELDS = [
  { name: '釣り', icon: '🎣' },
  { name: '筋トレ', icon: '💪' },
  { name: '読書', icon: '📖' },
];

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>上達ノート</Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {FIELDS.map((field) => (
          <TouchableOpacity
            key={field.name}
            style={styles.card}
            onPress={() => navigation.navigate('Record', { field: field.name })}
          >
            <Text style={styles.icon}>{field.icon}</Text>
            <Text style={styles.fieldName}>{field.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.card, styles.addCard]}>
          <Text style={styles.addPlus}>＋</Text>
          <Text style={styles.addLabel}>追加</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', paddingHorizontal: 20, marginBottom: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  card: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f7f8fc',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 32, marginBottom: 6 },
  fieldName: { fontSize: 13, fontWeight: '600', color: '#333' },
  addCard: { backgroundColor: '#fff', borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc' },
  addPlus: { fontSize: 24, color: '#aaa' },
  addLabel: { fontSize: 12, color: '#aaa' },
});
