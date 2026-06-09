import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});

const payload = {
  field: '釣り',
  type: 'hypothesis',
  category: 'テクニック',
  content: 'フローティングミノーは澄み潮に効く',
  webSources: [],
  supportingExperiences: [],
  contradictingExperiences: [],
  confidenceScore: 0.3,
  tags: [],
};

describe('GET /knowledge', () => {
  it('空の配列を返す', async () => {
    const res = await request(app).get('/knowledge');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('fieldクエリでフィルタリングできる', async () => {
    await request(app).post('/knowledge').send(payload);
    await request(app).post('/knowledge').send({ ...payload, field: '筋トレ', content: '高重量が筋肥大に効果的' });

    const res = await request(app).get('/knowledge?field=釣り');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].field).toBe('釣り');
  });

  it('typeクエリでフィルタリングできる', async () => {
    await request(app).post('/knowledge').send(payload);
    await request(app).post('/knowledge').send({ ...payload, type: 'distilled', confidenceScore: 0.9 });

    const res = await request(app).get('/knowledge?type=hypothesis');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe('hypothesis');
  });
});

describe('POST /knowledge', () => {
  it('新しい知識を作成して201を返す', async () => {
    const res = await request(app).post('/knowledge').send(payload);
    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.content).toBe(payload.content);
    expect(res.body.field).toBe(payload.field);
    expect(res.body.type).toBe('hypothesis');
  });
});

describe('GET /knowledge/:id', () => {
  it('存在するIDで1件取得できる', async () => {
    const created = await request(app).post('/knowledge').send(payload);
    const id = created.body._id;

    const res = await request(app).get(`/knowledge/${id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(id);
  });

  it('存在しないIDで404を返す', async () => {
    const res = await request(app).get('/knowledge/000000000000000000000000');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /knowledge/:id', () => {
  it('confidenceScoreを更新できる', async () => {
    const created = await request(app).post('/knowledge').send(payload);
    const id = created.body._id;

    const res = await request(app)
      .patch(`/knowledge/${id}`)
      .send({ confidenceScore: 0.85 });

    expect(res.status).toBe(200);
    expect(res.body.confidenceScore).toBe(0.85);
  });

  it('存在しないIDで404を返す', async () => {
    const res = await request(app)
      .patch('/knowledge/000000000000000000000000')
      .send({ confidenceScore: 0.5 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /knowledge/:id', () => {
  it('削除後にGETで取得できなくなる', async () => {
    const created = await request(app).post('/knowledge').send(payload);
    const id = created.body._id;

    const del = await request(app).delete(`/knowledge/${id}`);
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const get = await request(app).get(`/knowledge/${id}`);
    expect(get.status).toBe(404);
  });
});
