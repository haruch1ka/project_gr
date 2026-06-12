import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, PanResponder, Alert,
  Modal, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, font, radius } from '../constants/theme';
import {
  TrashIcon, LightBulbIcon, ArrowPathIcon, ChevronRightIcon,
} from 'react-native-heroicons/outline';
import { knowledgeApi, folderApi } from '../services/api';
import { reorganizeIntoFolders, GeminiRateLimitError } from '../services/gemini';
import { Knowledge, KnowledgeFolder } from '../types';
import { knowledgeColor, knowledgeLabel } from '../utils/knowledge';
import { cacheRead, cacheWrite } from '../utils/dataCache';
import { RootStackParamList } from '../../App';
import { useField } from '../context/FieldContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type BreadcrumbEntry = { id: string | null; title: string };

const INDENT_SIZE   = 16;
const DELETE_BTN_W  = 72;

// ─── ステータスサマリー ────────────────────────────────────────────────────

function StatusSummary({ items }: { items: Knowledge[] }) {
  const distilled  = items.filter(k => k.type === 'distilled').length;
  const confident  = items.filter(k => k.type === 'hypothesis' && k.confidenceScore >= 0.7).length;
  const hypo       = items.filter(k => k.type === 'hypothesis' && k.confidenceScore < 0.7).length;
  const total = items.length || 1;
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        {[
          { label: '発見',   count: distilled, color: colors.primary },
          { label: '確信',   count: confident, color: colors.primary },
          { label: '仮説',   count: hypo,      color: colors.textSecondary },
        ].map(({ label, count, color }) => (
          <View key={label} style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: color }]} />
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryNum}>{count}</Text>
          </View>
        ))}
      </View>
      <View style={styles.triBar}>
        <View style={{ flex: distilled + confident, backgroundColor: colors.primary,       borderRadius: 2 }} />
        <View style={{ flex: hypo,                  backgroundColor: colors.textSecondary, borderRadius: 2 }} />
        {total === 0 && <View style={{ flex: 1, backgroundColor: colors.border }} />}
      </View>
    </View>
  );
}

// ─── フィルター候補の単語分割 ─────────────────────────────────────────────

function splitToWords(phrase: string): string[] {
  const byDelimiter = phrase.split(/[とや・､、,\/／\s　]+/);
  const result: string[] = [];
  for (const part of byDelimiter) {
    if (!part) continue;
    // 文字種（漢字／カタカナ／ひらがな／英数字）の境界で分割
    const segments = part.match(
      /[一-鿿㐀-䶿豈-﫿]+|[゠-ヿ]+|[぀-ゟ]+|[a-zA-ZａｚＡＺ0-9０-９]+/g,
    );
    result.push(...(segments ?? [part]));
  }
  return [...new Set(result)].filter(w => w.length > 0);
}

// ─── ファセットバー ────────────────────────────────────────────────────────

type FacetBarProps = {
  filterCategories: Set<string>;
  filterTags:       Set<string>;
  filterCustom:     Set<string>;
  customFilters:    string[];
  onToggleCategory: (c: string) => void;
  onToggleTag:      (t: string) => void;
  onToggleCustom:   (w: string) => void;
  onRemoveCustom:   (w: string) => void;
  onAddFilter:      () => void;
};

function ActiveChip({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chipOn, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.chipOnText}>{label}</Text>
      <View style={styles.chipClose}>
        <Text style={styles.chipCloseX}>×</Text>
      </View>
    </TouchableOpacity>
  );
}

function CustomChip({ label, active, onToggle, onRemove }: {
  label: string; active: boolean; onToggle: () => void; onRemove: () => void;
}) {
  return (
    <View style={[styles.customChip, active && { backgroundColor: colors.purple, borderWidth: 0 }]}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={{ justifyContent: 'center' }}>
        <Text style={active ? styles.chipOnText : styles.chipCustomText}>{label}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onRemove}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <View style={active ? styles.chipClose : styles.chipCloseGray}>
          <Text style={active ? styles.chipCloseX : styles.chipCloseXGray}>×</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}


function FacetBar({
  filterCategories, filterTags, filterCustom,
  customFilters,
  onToggleCategory, onToggleTag, onToggleCustom, onRemoveCustom, onAddFilter,
}: FacetBarProps) {
  const activeCategories = [...filterCategories];
  const activeTags       = [...filterTags];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.facetBar}
      contentContainerStyle={styles.facetBarContent}
    >
      {activeCategories.map(cat => (
        <ActiveChip key={cat} label={cat} color={colors.blue} onPress={() => onToggleCategory(cat)} />
      ))}

      {activeTags.map(tag => (
        <ActiveChip key={tag} label={`#${tag}`} color={colors.blue} onPress={() => onToggleTag(tag)} />
      ))}

      {customFilters.map(w => (
        <CustomChip
          key={w}
          label={w}
          active={filterCustom.has(w)}
          onToggle={() => onToggleCustom(w)}
          onRemove={() => onRemoveCustom(w)}
        />
      ))}

      <TouchableOpacity style={styles.chipAdd} onPress={onAddFilter} activeOpacity={0.7}>
        <Text style={styles.chipAddPlus}>＋</Text>
        <Text style={styles.chipAddText}>フィルター</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── スワイプ削除の共通Hook ───────────────────────────────────────────────

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

  return { translateX, panResponder, revealedRef, slideOut };
}

// ─── ヘルパー ─────────────────────────────────────────────────────────────

function countItemsRecursive(folderId: string, allFolders: KnowledgeFolder[], allKnowledge: Knowledge[]): number {
  const direct   = allKnowledge.filter(k => k.folderId === folderId).length;
  const children = allFolders.filter(f => f.parentId === folderId);
  return direct + children.reduce((s, f) => s + countItemsRecursive(f._id!, allFolders, allKnowledge), 0);
}

function collectDescendantIds(folderId: string, allFolders: KnowledgeFolder[]): Set<string> {
  const ids = new Set<string>([folderId]);
  allFolders
    .filter(f => f.parentId === folderId)
    .forEach(child => collectDescendantIds(child._id!, allFolders).forEach(id => ids.add(id)));
  return ids;
}

// ─── フォルダ行（アウトライナ形式） ──────────────────────────────────────
//   シェブロン部分のみ → 開閉
//   タイトル部分      → ズームイン

function FolderRow({ folder, count, isExpanded, indent = 0, onToggleExpand, onZoomIn, onDelete }: {
  folder:         KnowledgeFolder;
  count:          number;
  isExpanded:     boolean;
  indent?:        number;
  onToggleExpand: () => void;
  onZoomIn:       () => void;
  onDelete:       () => void;
}) {
  const { translateX, panResponder, slideOut } = useSwipeDelete();

  const handleDelete = () => {
    Alert.alert(
      'ノードを削除',
      `「${folder.title}」を削除しますか？\n中の知識はルートに移動されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => slideOut(onDelete) },
      ]
    );
  };

  const indentPx = indent * INDENT_SIZE;

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteAction}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.75}>
          <TrashIcon size={20} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[styles.folderRow, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {/* シェブロン：開閉のみ */}
        <TouchableOpacity
          onPress={onToggleExpand}
          style={[styles.chevronBtn, { paddingLeft: 12 + indentPx }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}>
            <ChevronRightIcon size={13} color={colors.textMuted} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* タイトル：ズームイン */}
        <TouchableOpacity onPress={onZoomIn} style={styles.folderContent} activeOpacity={0.7}>
          <Text style={styles.folderTitle} numberOfLines={1}>{folder.title}</Text>
          {count > 0 && <Text style={styles.folderCount}>{count}</Text>}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── フォルダセクション（再帰ツリー） ────────────────────────────────────

type TreeHandlers = {
  expandedFolders:   Set<string>;
  onToggleExpand:    (id: string) => void;
  onZoomIn:          (folder: KnowledgeFolder) => void;
  onDeleteFolder:    (id: string) => void;
  onDeleteKnowledge: (id: string) => void;
  allFolders:        KnowledgeFolder[];
  allKnowledge:      Knowledge[];
};

function FolderSection({ folder, level = 0, handlers }: {
  folder:   KnowledgeFolder;
  level?:   number;
  handlers: TreeHandlers;
}) {
  const { expandedFolders, onToggleExpand, onZoomIn, onDeleteFolder, onDeleteKnowledge, allFolders, allKnowledge } = handlers;
  const isExpanded   = expandedFolders.has(folder._id!);
  const childFolders = allFolders.filter(f => f.parentId === folder._id);
  const childItems   = allKnowledge.filter(k => k.folderId === folder._id);
  const count        = countItemsRecursive(folder._id!, allFolders, allKnowledge);

  return (
    <View>
      <FolderRow
        folder={folder}
        count={count}
        isExpanded={isExpanded}
        indent={level}
        onToggleExpand={() => onToggleExpand(folder._id!)}
        onZoomIn={() => onZoomIn(folder)}
        onDelete={() => onDeleteFolder(folder._id!)}
      />
      {isExpanded && (
        <>
          {childFolders.map(child => (
            <FolderSection key={child._id} folder={child} level={level + 1} handlers={handlers} />
          ))}
          {childItems.map((item, i) => (
            <KnowledgeItem key={item._id ?? i} item={item} indent={level + 1} onDelete={onDeleteKnowledge} />
          ))}
        </>
      )}
    </View>
  );
}

// ─── 知識アイテム行 ──────────────────────────────────────────────────────

function KnowledgeItem({ item, onDelete, indent = 0 }: {
  item:    Knowledge;
  onDelete:(id: string) => void;
  indent?: number;
}) {
  const navigation = useNavigation<Nav>();
  const { translateX, panResponder, revealedRef, slideOut } = useSwipeDelete();

  const handleDelete = () => {
    if (!item._id) return;
    slideOut(async () => {
      try { await knowledgeApi.remove(item._id!); } catch {}
      onDelete(item._id!);
    });
  };

  const handlePress = () => {
    if (revealedRef.current) {
      revealedRef.current = false;
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      return;
    }
    if (item._id) {
      navigation.navigate('KnowledgeItem', { field: item.field, category: item.category, id: item._id });
    }
  };

  const pct      = Math.round(item.confidenceScore * 100);
  const color    = knowledgeColor(item);
  const indentPx = indent * INDENT_SIZE;

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteAction}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.75}>
          <TrashIcon size={20} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.item, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
          <View style={[styles.itemRow, { paddingLeft: 12 + indentPx }]}>
            <View style={[styles.itemDot, { backgroundColor: color }]} />
            <Text style={[styles.itemText, { color }]} numberOfLines={2}>{item.content}</Text>
            <Text style={[styles.itemPct, { color }]}>{pct}%</Text>
          </View>
          <View style={styles.itemBarTrack}>
            <View style={[styles.itemBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── メイン画面 ───────────────────────────────────────────────────────────

export default function KnowledgeScreen() {
  const navigation = useNavigation<Nav>();
  const { activeField: field } = useField();

  const [allFolders,     setAllFolders]     = useState<KnowledgeFolder[]>([]);
  const [allKnowledge,   setAllKnowledge]   = useState<Knowledge[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [stack,          setStack]          = useState<BreadcrumbEntry[]>([{ id: null, title: '知識' }]);
  const [expandedFolders,setExpandedFolders]= useState<Set<string>>(new Set());
  const [reclassifying,  setReclassifying]  = useState(false);

  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
  const [filterTags,       setFilterTags]       = useState<Set<string>>(new Set());
  const [filterCustom,     setFilterCustom]     = useState<Set<string>>(new Set());
  const [customFilters,    setCustomFilters]    = useState<string[]>([]);
  const [addFilterVisible, setAddFilterVisible] = useState(false);
  const [addFilterText,    setAddFilterText]    = useState('');

  const facetActive = filterCategories.size > 0 || filterTags.size > 0 || filterCustom.size > 0;

  const uniqueCategories = useMemo(
    () => [...new Set(allKnowledge.map(k => k.category).filter(Boolean))]
      .filter(c => !c.includes(' '))
      .sort(),
    [allKnowledge],
  );
  const uniqueTags = useMemo(
    () => [...new Set(allKnowledge.flatMap(k => k.tags ?? []))]
      .filter(t => !t.includes(' '))
      .sort(),
    [allKnowledge],
  );

  const filterSuggestions = useMemo(() => {
    const lw = addFilterText.trim().toLowerCase();
    const raw = [
      ...uniqueCategories.filter(c => !filterCategories.has(c)),
      ...uniqueTags.filter(t => !filterTags.has(t)),
    ];
    const pool = [...new Set(raw.flatMap(splitToWords))];
    if (!lw) return pool.slice(0, 12);
    return pool.filter(w => w.toLowerCase().includes(lw));
  }, [addFilterText, uniqueCategories, uniqueTags, filterCategories, filterTags]);
  const filteredKnowledge = useMemo(() => {
    if (!facetActive) return allKnowledge;
    return allKnowledge.filter(k => {
      if (filterCategories.size > 0 && !filterCategories.has(k.category))            return false;
      if (filterTags.size > 0       && !(k.tags ?? []).some(t => filterTags.has(t))) return false;
      if (filterCustom.size > 0) {
        const hit = [...filterCustom].some(w => {
          const lw = w.toLowerCase();
          return k.category?.toLowerCase().includes(lw) ||
                 (k.tags ?? []).some(t => t.toLowerCase().includes(lw));
        });
        if (!hit) return false;
      }
      return true;
    });
  }, [allKnowledge, filterCategories, filterTags, filterCustom, facetActive]);

  const currentFolderId = stack[stack.length - 1].id;

  const load = useCallback(async (refresh = false) => {
    if (!refresh) {
      const [cachedFolders, cachedKnowledge] = await Promise.all([
        cacheRead<KnowledgeFolder[]>('folders', field),
        cacheRead<Knowledge[]>('knowledge', field),
      ]);
      if (cachedFolders && cachedKnowledge) {
        setAllFolders(cachedFolders);
        setAllKnowledge(cachedKnowledge);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const [folders, knowledge] = await Promise.all([
        folderApi.list(field).catch(() => [] as KnowledgeFolder[]),
        knowledgeApi.list({ field }),
      ]);
      setAllFolders(folders);
      setAllKnowledge(knowledge);
      await Promise.all([
        cacheWrite('folders', field, folders),
        cacheWrite('knowledge', field, knowledge),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [field]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setStack([{ id: null, title: '知識' }]);
    setExpandedFolders(new Set());
    setFilterCategories(new Set());
    setFilterTags(new Set());
    setFilterCustom(new Set());
    setCustomFilters([]);
  }, [field]);

  const visibleFolders = allFolders.filter(f =>
    currentFolderId === null ? f.parentId == null : f.parentId === currentFolderId
  );
  const visibleItems = allKnowledge.filter(k =>
    currentFolderId === null ? k.folderId == null : k.folderId === currentFolderId
  );

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  function zoomIn(folder: KnowledgeFolder) {
    setStack(s => [...s, { id: folder._id!, title: folder.title }]);
    setExpandedFolders(new Set());
  }

  function goToLevel(index: number) {
    setStack(s => s.slice(0, index + 1));
    setExpandedFolders(new Set());
  }

  async function handleDeleteFolder(id: string) {
    try {
      await folderApi.remove(id);
      const deadIds = collectDescendantIds(id, allFolders);
      const nextFolders   = allFolders.filter(f => !deadIds.has(f._id!));
      const nextKnowledge = allKnowledge.map(k =>
        (k.folderId && deadIds.has(k.folderId)) ? { ...k, folderId: null } : k
      );
      setAllFolders(nextFolders);
      setAllKnowledge(nextKnowledge);
      await Promise.all([
        cacheWrite('folders', field, nextFolders),
        cacheWrite('knowledge', field, nextKnowledge),
      ]);
    } catch {
      Alert.alert('エラー', '削除に失敗しました');
    }
  }

  const handleDeleteKnowledge = useCallback((id: string) => {
    setAllKnowledge(prev => {
      const next = prev.filter(k => k._id !== id);
      cacheWrite('knowledge', field, next);
      return next;
    });
  }, [field]);

  function toggleCategory(c: string) {
    setFilterCategories(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });
  }
  function toggleTag(t: string) {
    setFilterTags(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
  }
  function toggleCustom(w: string) {
    setFilterCustom(prev => { const n = new Set(prev); n.has(w) ? n.delete(w) : n.add(w); return n; });
  }
  function removeCustom(w: string) {
    setCustomFilters(prev => prev.filter(f => f !== w));
    setFilterCustom(prev => { const n = new Set(prev); n.delete(w); return n; });
  }
  function confirmAddFilter() {
    const word = addFilterText.trim();
    if (!word || word.includes(' ') || customFilters.includes(word)) return;
    setCustomFilters(prev => [...prev, word]);
    setFilterCustom(prev => { const n = new Set(prev); n.add(word); return n; });
    setAddFilterText('');
    setAddFilterVisible(false);
  }

  function selectSuggestion(word: string) {
    if (uniqueCategories.includes(word)) {
      toggleCategory(word);
    } else if (uniqueTags.includes(word)) {
      toggleTag(word);
    } else {
      if (customFilters.includes(word)) return;
      setCustomFilters(prev => [...prev, word]);
      setFilterCustom(prev => { const n = new Set(prev); n.add(word); return n; });
    }
    setAddFilterText('');
    setAddFilterVisible(false);
  }

  async function handleReclassify() {
    if (allKnowledge.length === 0 || reclassifying) return;
    Alert.alert(
      'Geminiで再分類',
      `${allKnowledge.length}件の知識をGeminiが整理します。\n必要に応じてノードを追加・細分化します。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '再分類する',
          onPress: async () => {
            setReclassifying(true);
            try {
              const fieldKnowledge = allKnowledge.filter(k => k.field === field);
              const assignments = await reorganizeIntoFolders(field, fieldKnowledge, allFolders);

              const folderIdByName = new Map(allFolders.map(f => [f.title, f._id!]));
              const created = new Map<string, string>();

              // 親フォルダを先に作成してから子フォルダを処理する（再利用IDも created に記録）
              const getOrCreateFolder = async (name: string, parentId: string | null): Promise<string> => {
                const key = parentId ? `${parentId}::${name}` : name;
                if (created.has(key)) return created.get(key)!;
                const existingId = !parentId ? folderIdByName.get(name) : undefined;
                if (existingId) { created.set(key, existingId); return existingId; }
                const f = await folderApi.create({ field, title: name, parentId, order: 0 });
                created.set(key, f._id!);
                return f._id!;
              };

              for (const { itemId, folderName, parentFolderName } of assignments) {
                let folderId: string;
                if (parentFolderName) {
                  const parentId = await getOrCreateFolder(parentFolderName, null);
                  folderId = await getOrCreateFolder(folderName, parentId);
                } else {
                  folderId = await getOrCreateFolder(folderName, null);
                }
                await knowledgeApi.patch(itemId, { folderId });
              }

              const usedIds = new Set(created.values());
              const emptyFolders = allFolders.filter(f => f._id && !usedIds.has(f._id));
              await Promise.all(emptyFolders.map(f => folderApi.remove(f._id!)));

              await load();
              setStack([{ id: null, title: '知識' }]);
              setExpandedFolders(new Set());
            } catch (e) {
              console.error('Reclassify error:', e);
              if (e instanceof GeminiRateLimitError) {
                Alert.alert('レート制限', 'Geminiのリクエスト上限に達しました。\n1〜2分待ってから再試行してください。');
              } else if (e instanceof Error && e.message.includes('503')) {
                Alert.alert('サービス一時停止', 'Geminiが一時的に利用できません。\nしばらく待ってから再試行してください。');
              } else {
                Alert.alert('エラー', '再分類に失敗しました');
              }
            } finally {
              setReclassifying(false);
            }
          },
        },
      ]
    );
  }

  const treeHandlers: TreeHandlers = {
    expandedFolders,
    onToggleExpand:    toggleFolder,
    onZoomIn:          zoomIn,
    onDeleteFolder:    handleDeleteFolder,
    onDeleteKnowledge: handleDeleteKnowledge,
    allFolders,
    allKnowledge,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* パンくずナビ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.breadcrumbScroll}
        contentContainerStyle={styles.breadcrumbContent}
      >
        {stack.map((entry, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Text style={styles.breadcrumbSep}>›</Text>}
            <TouchableOpacity onPress={() => goToLevel(i)} activeOpacity={0.6}>
              <Text style={[
                styles.breadcrumbItem,
                i === stack.length - 1 && styles.breadcrumbCurrent,
              ]}>
                {entry.title}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </ScrollView>

      <FacetBar
        filterCategories={filterCategories}
        filterTags={filterTags}
        filterCustom={filterCustom}
        customFilters={customFilters}
        onToggleCategory={toggleCategory}
        onToggleTag={toggleTag}
        onToggleCustom={toggleCustom}
        onRemoveCustom={removeCustom}
        onAddFilter={() => setAddFilterVisible(true)}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {stack.length === 1 && <StatusSummary items={allKnowledge} />}

          {facetActive ? (
            <>
              <Text style={styles.filterCount}>{filteredKnowledge.length}件</Text>
              {filteredKnowledge.map((item, i) => (
                <KnowledgeItem key={item._id ?? i} item={item} indent={0} onDelete={handleDeleteKnowledge} />
              ))}
              {filteredKnowledge.length === 0 && (
                <Text style={styles.empty}>条件に合う知識がありません</Text>
              )}
            </>
          ) : (
            <>
              {visibleFolders.map(f => (
                <FolderSection key={f._id} folder={f} level={0} handlers={treeHandlers} />
              ))}
              {visibleItems.map((item, i) => (
                <KnowledgeItem key={item._id ?? i} item={item} indent={0} onDelete={handleDeleteKnowledge} />
              ))}
              {visibleFolders.length === 0 && visibleItems.length === 0 && (
                <Text style={styles.empty}>まだ何もありません</Text>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.hypothesisBtn}
            onPress={() => navigation.navigate('Hypothesis', { field })}
            activeOpacity={0.8}
          >
            <LightBulbIcon size={16} color="#000" strokeWidth={2} />
            <Text style={styles.hypothesisBtnText}>気になることを投稿</Text>
          </TouchableOpacity>

          {allKnowledge.length > 0 && (
            <TouchableOpacity
              style={[styles.reclassifyBtn, reclassifying && styles.btnDisabled]}
              onPress={handleReclassify}
              disabled={reclassifying}
              activeOpacity={0.8}
            >
              {reclassifying
                ? <ActivityIndicator size="small" color={colors.textSub} />
                : <ArrowPathIcon size={15} color={colors.textSub} strokeWidth={2} />
              }
              <Text style={styles.reclassifyBtnText}>
                {reclassifying ? 'Geminiが再分類中…' : 'Geminiで再分類'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <Modal
        visible={addFilterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setAddFilterVisible(false); setAddFilterText(''); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setAddFilterVisible(false); setAddFilterText(''); }}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>フィルターを追加</Text>
            <TextInput
              style={styles.modalInput}
              value={addFilterText}
              onChangeText={setAddFilterText}
              placeholder="単語を入力（スペース不可）"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmAddFilter}
              autoCapitalize="none"
            />
            {filterSuggestions.length > 0 && (
              <ScrollView
                style={styles.suggestionList}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {filterSuggestions.map(w => (
                  <TouchableOpacity
                    key={w}
                    style={styles.suggestionItem}
                    onPress={() => selectSuggestion(w)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => { setAddFilterVisible(false); setAddFilterText(''); }}
              >
                <Text style={styles.modalBtnCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={confirmAddFilter}>
                <Text style={styles.modalBtnConfirmText}>追加</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── スタイル ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  breadcrumbScroll:  { borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  breadcrumbContent: {
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  breadcrumbItem:    { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  breadcrumbCurrent: { color: colors.text, fontWeight: '700' },
  breadcrumbSep:     { fontSize: font.sm, color: colors.textSecondary, marginHorizontal: 2 },

  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12, gap: 4 },

  summaryCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: 12, marginBottom: 8, gap: 8,
  },
  summaryRow:   { flexDirection: 'row', gap: 16 },
  summaryItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryDot:   { width: 8, height: 8, borderRadius: 4 },
  summaryLabel: { fontSize: font.xs, color: colors.textMuted },
  summaryNum:   { fontSize: font.xs, color: colors.text, fontWeight: '600' },
  triBar:       { flexDirection: 'row', height: 3, borderRadius: 2, gap: 2, overflow: 'hidden' },

  swipeContainer: { borderRadius: radius.md, overflow: 'hidden' },
  deleteAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_BTN_W,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: colors.danger, borderRadius: radius.md,
    padding: 10, justifyContent: 'center', alignItems: 'center',
  },

  // フォルダ行（アウトライナ）
  folderRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    minHeight: 44,
  },
  chevronBtn: {
    paddingVertical: 13, paddingRight: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  folderContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingRight: 14, gap: 8,
  },
  folderTitle: { flex: 1, fontSize: font.sm, color: colors.textSub, fontWeight: '600' },
  folderCount: { fontSize: font.xs, color: colors.textMuted },

  // 知識アイテム行
  item: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingTop: 10, paddingRight: 12, overflow: 'hidden',
  },
  itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 },
  itemDot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  itemText:     { flex: 1, fontSize: font.sm, lineHeight: 18 },
  itemPct:      { fontSize: font.xs, fontWeight: '700', width: 34, textAlign: 'right' },
  itemBarTrack: { height: 3, backgroundColor: colors.border },
  itemBarFill:  { height: 3 },

  empty: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center', marginTop: 32 },

  hypothesisBtn: {
    marginTop: 8, borderRadius: radius.md, backgroundColor: colors.primary,
    padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  hypothesisBtnText: { color: '#000', fontSize: font.sm, fontWeight: '700' },

  reclassifyBtn: {
    marginTop: 8, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  reclassifyBtnText: { color: colors.textSub, fontSize: font.sm },
  btnDisabled:       { opacity: 0.5 },

  facetBar:        { borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  facetBarContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, flexDirection: 'row', gap: 8, alignItems: 'center' },

  chip:     { height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  chipText: { fontSize: font.xs, fontWeight: '500', color: colors.textSub },

  chipOn:     { height: 32, paddingLeft: 12, paddingRight: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOnText: { fontSize: font.xs, fontWeight: '600', color: '#0e1014' },
  chipClose:  { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(14,16,20,0.22)', justifyContent: 'center', alignItems: 'center' },
  chipCloseX: { fontSize: 10, color: '#0e1014', lineHeight: 16, textAlign: 'center' },

  chipAdd:     { height: 32, paddingHorizontal: 13, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipAddPlus: { fontSize: 14, color: colors.blue, lineHeight: 16 },
  chipAddText: { fontSize: font.xs, fontWeight: '500', color: colors.blue },

  chipDivider:  { width: 1, height: 14, backgroundColor: colors.border, marginHorizontal: 2 },
  filterCount:  { fontSize: font.xs, color: colors.textMuted, textAlign: 'right', marginBottom: 4 },

  customChip:      { height: 32, paddingLeft: 12, paddingRight: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipCustomText:  { fontSize: font.xs, fontWeight: '500', color: colors.textSub },
  chipCloseGray:   { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  chipCloseXGray:  { fontSize: 10, color: colors.textMuted, textAlign: 'center' as const },

  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox:            { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: 20, width: 280, gap: 16 },
  modalTitle:          { fontSize: font.md, fontWeight: '600' as const, color: colors.text },
  modalInput:          { backgroundColor: colors.bgDeep, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderInput, color: colors.text, fontSize: font.sm, padding: 10 },
  modalBtns:           { flexDirection: 'row', gap: 10 },
  modalBtnCancel:      { flex: 1, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const },
  modalBtnCancelText:  { color: colors.textSub, fontSize: font.sm },
  modalBtnConfirm:     { flex: 1, padding: 10, borderRadius: radius.sm, backgroundColor: colors.blue, alignItems: 'center' as const },
  modalBtnConfirmText: { color: '#fff', fontSize: font.sm, fontWeight: '600' as const },

  suggestionList: { maxHeight: 150, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderInput, backgroundColor: colors.bgDeep },
  suggestionItem: { paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionText: { fontSize: font.sm, color: colors.text },
});
