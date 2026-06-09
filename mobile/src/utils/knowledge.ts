import { colors } from '../constants/theme';
import { Knowledge } from '../types';

export function knowledgeColor(k: Knowledge): string {
  if (k.type === 'distilled') return colors.primary;
  if (k.confidenceScore >= 0.7) return colors.primary;
  if (k.confidenceScore >= 0.3) return colors.textSecondary;
  return colors.danger;
}

export function knowledgeLabel(k: Knowledge): string {
  if (k.type === 'distilled') return '発見';
  if (k.confidenceScore >= 0.7) return '確信';
  if (k.confidenceScore >= 0.3) return '仮説';
  return '疑問';
}
