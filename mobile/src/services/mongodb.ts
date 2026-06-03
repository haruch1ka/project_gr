import * as SecureStore from 'expo-secure-store';

const DATA_SOURCE = 'Cluster0';
const DATABASE = 'project_gr';

async function getConfig() {
  const appId = await SecureStore.getItemAsync('MONGODB_APP_ID');
  const apiKey = await SecureStore.getItemAsync('MONGODB_API_KEY');
  return { appId, apiKey };
}

async function request(action: string, collection: string, body: object) {
  const { appId, apiKey } = await getConfig();
  if (!appId || !apiKey) throw new Error('MongoDB未設定');

  const res = await fetch(
    `https://ap-southeast-1.aws.data.mongodb-api.com/app/${appId}/endpoint/data/v1/action/${action}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        dataSource: DATA_SOURCE,
        database: DATABASE,
        collection,
        ...body,
      }),
    }
  );
  if (!res.ok) throw new Error(`MongoDB error: ${res.status}`);
  return res.json();
}

export const db = {
  find: (collection: string, filter = {}) =>
    request('find', collection, { filter }),

  insertOne: (collection: string, document: object) =>
    request('insertOne', collection, { document }),

  updateOne: (collection: string, filter: object, update: object) =>
    request('updateOne', collection, { filter, update }),

  deleteOne: (collection: string, filter: object) =>
    request('deleteOne', collection, { filter }),
};

export async function saveMongoConfig(appId: string, apiKey: string) {
  await SecureStore.setItemAsync('MONGODB_APP_ID', appId);
  await SecureStore.setItemAsync('MONGODB_API_KEY', apiKey);
}
