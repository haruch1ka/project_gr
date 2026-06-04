import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet  } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font } from '../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Plan'>;
  route: RouteProp<RootStackParamList, 'Plan'>;
};

export default function PlanScreen({ navigation, route }: Props) {
  const { field } = route.params;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{field}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.navigate('Web', { field })}>
            <Text style={styles.actionIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Chat', { field })}>
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Knowledge', { field })}>
            <Text style={styles.actionIcon}>📚</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={[styles.actionIcon, styles.actionIconActive]}>📋</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.text}>行動プラン</Text>
        <Text style={styles.sub}>AI対話から生成された次の行動プラン</Text>
      </View>
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
  actionIconActive: { opacity: 0.4 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  icon: { fontSize: 48 },
  text: { fontSize: font.md, fontWeight: '500', color: '#bbb' },
  sub: { fontSize: font.sm, color: '#ccc' },
});
