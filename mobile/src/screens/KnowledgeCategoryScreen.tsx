import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { db } from '../services/mongodb';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'KnowledgeCategory'>;
  route: RouteProp<RootStackParamList, 'KnowledgeCategory'>;
};

export default function KnowledgeCategoryScreen({ navigation, route }: Props) {
  const { field, category } = route.params;
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const res = await db.find('knowledge_items', { field, category });
      setItems(res.documents?.map((d: any) => d.content) ?? []);
    } catch {}
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{category}</Text>
      </View>
      <FlatList
        data={[...items, '__add__']}
        keyExtractor={(item) => item}
        renderItem={({ item }) =>
          item === '__add__' ? (
            <TouchableOpacity style={styles.linkItem}>
              <Text style={styles.addText}>＋</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => navigation.navigate('KnowledgeItem', { field, category, item })}
            >
              <Text style={styles.linkText}>{item}</Text>
            </TouchableOpacity>
          )
        }
      />
    </View>
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
  title: { fontSize: 18, fontWeight: '700' },
  linkItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  linkText: { fontSize: 16, color: '#1a1aff', textDecorationLine: 'underline' },
  addText: { fontSize: 20, color: '#aaa' },
});
