import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet  } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font } from '../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Web'>;
  route: RouteProp<RootStackParamList, 'Web'>;
};

export default function WebScreen({ navigation, route }: Props) {
  const { field } = route.params;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{field}</Text>
        <View style={styles.actions}>
          <TouchableOpacity>
            <Text style={[styles.actionIcon, styles.actionIconActive]}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('FieldTabs', { screen: 'Chat' })}>
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('FieldTabs', { screen: 'Knowledge' })}>
            <Text style={styles.actionIcon}>📚</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Plan')}>
            <Text style={styles.actionIcon}>📋</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.text}>Web情報収集</Text>
        <Text style={styles.sub}>Web情報を知識プールへ投入する</Text>
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
