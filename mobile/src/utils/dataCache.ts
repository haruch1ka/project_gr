import AsyncStorage from '@react-native-async-storage/async-storage';

// ここを false にすることで個別リソースを永続キャッシュから除外できる
const PERSIST_CONFIG: Record<string, boolean> = {
  knowledge:  true,
  folders:    true,
  experience: true,
  plan:       true,
  // 自動処理が走るリソースはここを false にする
};

function storageKey(resource: string, field: string): string {
  return `cache__${resource}__${field}`;
}

export async function cacheRead<T>(resource: string, field: string): Promise<T | null> {
  if (!PERSIST_CONFIG[resource]) return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(resource, field));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheWrite<T>(resource: string, field: string, data: T): Promise<void> {
  if (!PERSIST_CONFIG[resource]) return;
  try {
    await AsyncStorage.setItem(storageKey(resource, field), JSON.stringify(data));
  } catch {}
}

export async function cacheInvalidate(resource: string, field: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(resource, field));
  } catch {}
}
