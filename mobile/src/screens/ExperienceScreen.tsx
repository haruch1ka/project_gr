import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl,
  Animated, PanResponder, Alert, TouchableOpacity, Modal, TextInput,
  TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useField } from '../context/FieldContext';
import { colors, font } from '../constants/theme';
import { experienceApi } from '../services/api';
import { Experience } from '../types/index';
import { cacheRead, cacheWrite } from '../utils/dataCache';
import { TrashIcon } from 'react-native-heroicons/outline';

const DELETE_BTN_W = 72;

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

  function closeSwipe() {
    revealedRef.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  }

  return { translateX, panResponder, revealedRef, slideOut, closeSwipe };
}

function ExperienceItem({ item, onDelete, onEdit }: {
  item:    Experience;
  onDelete:(id: string) => void;
  onEdit:  (item: Experience) => void;
}) {
  const { translateX, panResponder, revealedRef, slideOut, closeSwipe } = useSwipeDelete();

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

  const handlePress = () => {
    if (revealedRef.current) { closeSwipe(); return; }
    onEdit(item);
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteAction}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.75}>
          <TrashIcon size={20} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.item, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.itemInner}>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={styles.memo}>{item.memo}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function ExperienceScreen() {
  const { activeField: field } = useField();
  const [logs, setLogs] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editTarget, setEditTarget] = useState<Experience | null>(null);
  const [editMemo,   setEditMemo]   = useState('');
  const [editDate,   setEditDate]   = useState('');
  const [saving,     setSaving]     = useState(false);

  const fetchLogs = useCallback(async (refresh = false) => {
    if (!field) { setLoading(false); return; }
    if (!refresh) {
      const cached = await cacheRead<Experience[]>('experience', field);
      if (cached) {
        setLogs(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const data = await experienceApi.list(field);
      setLogs(data);
      await cacheWrite('experience', field, data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [field]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchLogs(true); }, [fetchLogs]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await experienceApi.remove(id);
      setLogs(prev => {
        const next = prev.filter(l => l._id !== id);
        cacheWrite('experience', field, next);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  }, [field]);

  const openEdit = useCallback((item: Experience) => {
    setEditTarget(item);
    setEditMemo(item.memo);
    setEditDate(item.date);
  }, []);

  const closeEdit = useCallback(() => {
    setEditTarget(null);
    setSaving(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editTarget?._id || !editMemo.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await experienceApi.patch(editTarget._id, {
        memo: editMemo.trim(),
        date: editDate.trim() || editTarget.date,
      });
      setLogs(prev => {
        const next = prev.map(l => l._id === editTarget._id ? updated : l);
        cacheWrite('experience', field, next);
        return next;
      });
      closeEdit();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }, [editTarget, editMemo, editDate, saving, field, closeEdit]);

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
          renderItem={({ item }) => (
            <ExperienceItem item={item} onDelete={handleDelete} onEdit={openEdit} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      <Modal visible={editTarget !== null} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>記録を編集</Text>
              <TextInput
                style={styles.dateInput}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="日付（例：6/17）"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.memoInput}
                value={editMemo}
                onChangeText={setEditMemo}
                multiline
                autoFocus
                placeholder="メモ"
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={closeEdit}>
                  <Text style={styles.cancelBtn}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>保存</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  title:        { fontSize: font.xl, fontWeight: '700', color: colors.text, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  list:         { flex: 1 },
  listContent:  { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
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
  item: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  itemInner: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  date:      { fontSize: 12, color: colors.textMuted, width: 36, paddingTop: 2 },
  memo:      { flex: 1, fontSize: font.sm, color: colors.text, lineHeight: 20 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: font.md, fontWeight: '600', color: colors.textMuted },
  emptySub:  { fontSize: font.sm, color: colors.textMuted, textAlign: 'center' },

  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', margin: 0 },
  modal:        { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle:   { fontSize: font.lg, fontWeight: '700', color: colors.text },
  dateInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 10,
    padding: 12, fontSize: font.sm, color: colors.text, backgroundColor: colors.bgInput,
  },
  memoInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 10,
    padding: 12, fontSize: font.sm, color: colors.text, backgroundColor: colors.bgInput,
    textAlignVertical: 'top', height: 100,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  cancelBtn:    { fontSize: font.md, color: colors.textMuted },
  saveBtn:      { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, minWidth: 60, alignItems: 'center' },
  saveBtnText:  { color: '#000', fontWeight: '700', fontSize: font.md },
});
