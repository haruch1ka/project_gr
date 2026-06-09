import { Knowledge, Experience } from '../types';
import { knowledgeLabel } from './knowledge';

export function storageKey(field: string): string {
	return `chat_history:${field}`;
}

export function buildSystemPrompt(field: string, knowledge: Knowledge[], experiences: Experience[]): string {
	const knowledgePart =
		knowledge.length > 0
			? knowledge
					.map((k) => {
						const label = knowledgeLabel(k);
						return `- [${label} ${Math.round(k.confidenceScore * 100)}%] ${k.content}`;
					})
					.join('\n')
			: '（まだ知識がありません）';

	const experiencePart =
		experiences.length > 0
			? experiences
					.slice(0, 5)
					.map((e) => `- ${e.date}: ${e.memo}`)
					.join('\n')
			: '（まだ経験ログがありません）';

	return `あなたはユーザーの「${field}」分野での上達を支援するAIアシスタントです。
以下のユーザーの知識と経験ログを文脈として対話してください。

【現在の知識】
${knowledgePart}

【最近の経験ログ】
${experiencePart}

対話では：
- ユーザーの経験と既存の知識を結びつける
- 仮説の検証・反証につながる質問をする
- 具体的で実践的な洞察を提供する
必ず日本語で返答してください。`;
}
