import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

export default function ChatScreen({ navigation, route }: Props) {
  const { field } = route.params;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{field}</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.icon}>💬</Text>
        <Text style={styles.text}>AI対話</Text>
        <Text style={styles.sub}>経験と知識を文脈にAIと対話する</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 52 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  back: { fontSize: 20, color: '#333', marginRight: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  icon: { fontSize: 48 },
  text: { fontSize: 15, fontWeight: '500', color: '#bbb' },
  sub: { fontSize: 13, color: '#ccc' },
});
