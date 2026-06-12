import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Animated, PanResponder, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { colors, font } from '../constants/theme';
import { experienceApi } from '../services/api';
import { Experience } from '../types';
import { ArrowLeftIcon, TrashIcon } from 'react-native-heroicons/outline';

const FIELD_ICONS: Record<string, string> = {
  釣り: '🎣', 筋トレ: '💪', 読書: '📖', 料理: '🍳', 音楽: '🎵',
  英語: '🌍', ゴルフ: '⛳', ランニング: '🏃',
};

const DELETE_BTN_W = 72;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Log'>;
  route: RouteProp<RootStackParamList, 'Log'>;
};

function useSwipeDelete() {
  const translateX  = useRef(new Animated.Value(0)).current;
  const startX      = useRef(0);
  const revealedRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {
        startX.current = revealedRef.current ? -DELETE_BTN_W : 0;
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        translateX.setValue(Math.min(0, Math.max(-DELETE_BTN_W, startX.current + gs.dx)));
      },
      onPanResponderRelease: (_, gs) => {
        const x    = Math.min(0, Math.max(-DELETE_BTN_W, startX.current + gs.dx));
        const open = x < -(DELETE_BTN_W / 2);
        revealedRef.current = open;
        Animated.spring(translateX, { toValue: open ? -DELETE_BTN_W : 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    })
  ).current;

  function slideOut(cb: () => void) {
    Animated.timing(translateX, { toValue: -500, duration: 180, useNativeDriver: true }).start(cb);
  }

  return { translateX, panResponder, slideOut };
}

function LogItem({ item, onDelete }: { item: Experience; onDelete: (id: string) => void }) {
  const { translateX, panResponder, slideOut } = useSwipeDelete();

  const handleDelete = () => {
    Alert.alert(
      '記録を削除',
      'この記録を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => slideOut(() => onDelete(item._id!)) },
      ]
    );
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteAction}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.75}>
          <TrashIcon size={20} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.logItem, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <Text style={styles.logDate}>{item.date}</Text>
        <Text style={styles.logText}>{item.memo}</Text>
      </Animated.View>
    </View>
  );
}

export default function LogScreen({ navigation, route }: Props) {
  const { field } = route.params;
  const [logs, setLogs] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await experienceApi.list(field);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [field]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await experienceApi.remove(id);
      setLogs(prev => prev.filter(l => l._id !== id));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeftIcon size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.fieldIcon}>{FIELD_ICONS[field] ?? '📌'}</Text>
        <Text style={styles.title}>{field}の記録</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
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
          renderItem={({ item }) => <LogItem item={item} onDelete={handleDelete} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back:      { fontSize: 20, color: colors.text, marginRight: 10 },
  fieldIcon: { fontSize: 18 },
  title:     { fontSize: font.lg, fontWeight: '700', color: colors.text, flex: 1 },

  list:        { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  sectionLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
  swipeContainer: { overflow: 'hidden' },
  deleteAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_BTN_W,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: colors.danger, borderRadius: 6,
    padding: 10, justifyContent: 'center', alignItems: 'center',
  },
  logItem: {
    flexDirection: 'row', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  logDate: { fontSize: 12, color: colors.textMuted, width: 36, paddingTop: 2 },
  logText: { flex: 1, fontSize: font.sm, color: colors.text, lineHeight: 20 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: font.md, fontWeight: '600', color: colors.textMuted },
  emptySub:  { fontSize: font.sm, color: colors.textMuted, textAlign: 'center' },
});
