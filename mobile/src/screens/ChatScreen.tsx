import React, { useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useField } from "../context/FieldContext";
import { colors, font, radius } from "../constants/theme";
import { ChatMessage, Knowledge, Experience } from "../types";
import { chat, chatWithHistory, extractKnowledgeFromChat, generateOpeningQuestion } from "../services/gemini";
import { knowledgeApi, experienceApi, planApi } from "../services/api";
import { storageKey, buildSystemPrompt } from "../utils/chat";

type ChatNav = NativeStackNavigationProp<RootStackParamList>;

const ACTION_THRESHOLD = 4;

export default function ChatScreen() {
	const navigation = useNavigation<ChatNav>();
	const { activeField } = useField();

	const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
	const [experiences, setExperiences] = useState<Experience[]>([]);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [contextLoading, setContextLoading] = useState(true);
	const [showActions, setShowActions] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const listRef = useRef<FlatList>(null);

	// コンテキスト取得 → 履歴復元 or 開口質問生成
	const fetchContext = useCallback(async (field: string) => {
		setContextLoading(true);
		setShowActions(false);
		try {
			const [k, e, stored] = await Promise.all([knowledgeApi.list({ field }), experienceApi.list(field), AsyncStorage.getItem(storageKey(field))]);
			setKnowledge(k);
			setExperiences(e);

			if (stored) {
				const saved: ChatMessage[] = JSON.parse(stored);
				setMessages(saved);
				if (saved.length >= ACTION_THRESHOLD) setShowActions(true);
			} else {
				const summary = {
					distilled:   k.filter((x) => x.type === "distilled").length,
					hypothesis:  k.filter((x) => x.type === "hypothesis").length,
					highConfidence: k.filter((x) => x.confidenceScore >= 0.7).length,
				};
				const opening = await generateOpeningQuestion(field, e, summary);
				const initial = [{ role: "assistant" as const, text: opening }];
				setMessages(initial);
				await AsyncStorage.setItem(storageKey(field), JSON.stringify(initial));
			}
		} catch {
			setMessages([{ role: "assistant", text: `${field}について、最近の経験や疑問を話してください。一緒に整理しましょう。` }]);
		} finally {
			setContextLoading(false);
		}
	}, []);

	async function resetHistory() {
		Alert.alert("会話をリセット", "この分野の会話履歴を削除しますか？", [
			{ text: "キャンセル", style: "cancel" },
			{
				text: "削除",
				style: "destructive",
				onPress: async () => {
					await AsyncStorage.removeItem(storageKey(activeField));
					fetchContext(activeField);
				},
			},
		]);
	}

	useEffect(() => {
		fetchContext(activeField);
	}, [activeField, fetchContext]);

	async function send() {
		const text = input.trim();
		if (!text || loading) return;

		const userMsg: ChatMessage = { role: "user", text };
		const newMessages = [...messages, userMsg];
		setMessages(newMessages);
		setInput("");
		setLoading(true);

		try {
			const systemPrompt = buildSystemPrompt(activeField, knowledge, experiences);
			const reply = await chatWithHistory(newMessages.slice(-8), systemPrompt);
			const updated: ChatMessage[] = [...newMessages, { role: "assistant", text: reply }];
			setMessages(updated);
			await AsyncStorage.setItem(storageKey(activeField), JSON.stringify(updated));
			if (updated.length >= ACTION_THRESHOLD) setShowActions(true);
		} catch (e) {
			const err = e as Error;
			const status = Number(err.message.match(/\[(\d+)\]/)?.[1] ?? 0);
			let text: string;
			if (err.message.includes("未設定")) {
				text = "APIキーが未設定です。Vercelの環境変数を確認してください。";
			} else if (status === 429) {
				text = "リクエスト数の上限に達しました（429）。1分ほど待ってから再試行してください。";
			} else if (status >= 500) {
				text = `サーバーエラーが発生しました（${status}）。しばらく待ってから再試行してください。`;
			} else if (status === 401 || status === 403) {
				text = `APIキーが無効または権限がありません（${status}）。`;
			} else if (status === 0) {
				text = "ネットワークに接続できません。Wi-Fiまたはモバイル通信を確認してください。";
			} else {
				text = `送信に失敗しました（${err.message}）。`;
			}
			setMessages((prev) => [...prev, { role: "assistant", text }]);
		} finally {
			setLoading(false);
			setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
		}
	}

	async function savePlan() {
		if (!activeField || actionLoading) return;
		setActionLoading("plan");
		try {
			const history = messages.map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.text}`).join("\n");
			const systemPrompt = buildSystemPrompt(activeField, knowledge, experiences);
			const proposal = await chat("この会話から、ユーザーへの具体的な次の行動プランを1〜2文で提案してください。", `${systemPrompt}\n\n【会話履歴】\n${history}`);
			await planApi.create({
				field: activeField,
				proposal,
				dialogHistory: messages,
				reviewedAt: null,
				reviewNote: null,
			});
			setMessages((prev) => [...prev, { role: "assistant", text: `プランを保存しました：\n${proposal}` }]);
		} catch (e) {
			console.error(e);
		} finally {
			setActionLoading(null);
		}
	}

	async function saveKnowledge() {
		if (!activeField || actionLoading) return;
		setActionLoading("knowledge");
		try {
			const conversationText = messages.map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.text}`).join("\n");
			const extracted = await extractKnowledgeFromChat(activeField, conversationText);
			await knowledgeApi.create({
				field: activeField,
				category: extracted.category.slice(0, 20),
				content: extracted.content,
				webSources: [],
				supportingExperiences: [],
				contradictingExperiences: [],
				confidenceScore: 0.3,
				type: "hypothesis",
				tags: [],
			});
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					text: `知識として保存しました：\n「${extracted.content}」\nカテゴリ：${extracted.category}`,
				},
			]);
		} catch (e) {
			console.error(e);
		} finally {
			setActionLoading(null);
		}
	}

	return (
		<SafeAreaView style={styles.container} edges={["top"]}>
			<KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
				<View style={styles.titleRow}>
					<Text style={styles.screenTitle}>対話</Text>
					<TouchableOpacity onPress={resetHistory} style={styles.resetBtn}>
						<Text style={styles.resetBtnText}>リセット</Text>
					</TouchableOpacity>
				</View>
				{/* メッセージリスト */}
				<FlatList
					ref={listRef}
					data={messages}
					keyExtractor={(_, i) => String(i)}
					contentContainerStyle={styles.messageList}
					keyboardDismissMode="on-drag"
					onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
					renderItem={({ item }) => (
						<View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
							<Text style={[styles.bubbleText, item.role === "user" && styles.bubbleTextUser]}>{item.text}</Text>
						</View>
					)}
					ListFooterComponent={
						loading ? (
							<View style={styles.loadingRow}>
								<ActivityIndicator size="small" color={colors.textMuted} />
								<Text style={styles.loadingText}>考え中…</Text>
							</View>
						) : null
					}
				/>

				{/* 対話完了後のアクション */}
				{showActions && !loading && (
					<View style={styles.actions}>
						<Text style={styles.actionsLabel}>── 対話まとめ ──</Text>
						<View style={styles.actionRow}>
							<TouchableOpacity style={styles.actionBtn} onPress={savePlan} disabled={!!actionLoading} activeOpacity={0.7}>
								{actionLoading === "plan" ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.actionBtnIcon}>📋</Text>}
								<Text style={styles.actionBtnText}>プランを保存</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.actionBtn} onPress={saveKnowledge} disabled={!!actionLoading} activeOpacity={0.7}>
								{actionLoading === "knowledge" ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.actionBtnIcon}>💡</Text>}
								<Text style={styles.actionBtnText}>知識として保存</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}

				{/* 入力欄 */}
				<View style={styles.inputRow}>
					<TextInput style={styles.input} placeholder="メッセージを入力…" placeholderTextColor={colors.textMuted} value={input} onChangeText={setInput} multiline maxLength={500} />
					<TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={send} disabled={!input.trim() || loading}>
						<Text style={styles.sendBtnText}>送信</Text>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
	screenTitle: { fontSize: font.xl, fontWeight: "700", color: colors.text },
	resetBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
	resetBtnText: { fontSize: font.xs, color: colors.textMuted },

	fieldSelect: { flex: 1, padding: 20, gap: 10, justifyContent: "center" },
	fieldChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		backgroundColor: colors.bgCard,
		borderRadius: radius.md,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	fieldChipIcon: { fontSize: 24 },
	fieldChipText: { flex: 1, fontSize: font.md, fontWeight: "600", color: colors.text },
	fieldChipArrow: { fontSize: 20, color: colors.textSecondary },

	messageList: { padding: 16, gap: 10 },
	bubble: {
		maxWidth: "80%",
		borderRadius: 16,
		padding: 12,
		backgroundColor: colors.bgCard,
		alignSelf: "flex-start",
	},
	bubbleUser: { backgroundColor: colors.primary, alignSelf: "flex-end" },
	bubbleBot: { backgroundColor: colors.bgAI },
	bubbleText: { fontSize: font.md, color: colors.text, lineHeight: 22 },
	bubbleTextUser: { color: "#fff" },

	loadingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 12,
		paddingHorizontal: 4,
	},
	loadingText: { fontSize: font.sm, color: colors.textMuted },

	actions: {
		borderTopWidth: 1,
		borderTopColor: colors.border,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 4,
		gap: 8,
	},
	actionsLabel: { fontSize: font.xs, color: colors.textMuted, textAlign: "center" },
	actionRow: { flexDirection: "row", gap: 8 },
	actionBtn: {
		flex: 1,
		alignItems: "center",
		gap: 4,
		backgroundColor: colors.bgCard,
		borderRadius: radius.md,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: colors.border,
	},
	actionBtnIcon: { fontSize: 18 },
	actionBtnText: { fontSize: 10, color: colors.textSub, textAlign: "center" },

	inputRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		gap: 10,
	},
	input: {
		flex: 1,
		borderWidth: 1.5,
		borderColor: colors.borderInput,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 10,
		fontSize: font.md,
		color: colors.text,
		maxHeight: 100,
		backgroundColor: colors.bgInput,
	},
	sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
	sendBtnDisabled: { backgroundColor: colors.textSecondary },
	sendBtnText: { color: "#fff", fontWeight: "700", fontSize: font.sm },
});
