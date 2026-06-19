import { Router } from 'express';
import { Experience } from '../models/Experience';
import { runDistillation } from './proposals';

const router = Router();

// 一覧取得
router.get('/', async (req, res) => {
  const { field } = req.query;
  const filter = field ? { field } : {};
  const docs = await Experience.find(filter).sort({ date: -1 });
  res.json(docs);
});

// 1件作成
router.post('/', async (req, res) => {
  const doc = await Experience.create(req.body);
  res.status(201).json(doc);

  // 析出をバックグラウンドで実行（レスポンス後）
  if (doc.field) {
    runDistillation(doc.field).catch(console.error);
  }
});

// 1件更新
router.patch('/:id', async (req, res) => {
  const { memo, date } = req.body;
  const doc = await Experience.findByIdAndUpdate(
    req.params.id,
    {
      ...(memo !== undefined && { memo }),
      ...(date !== undefined && { date }),
      analyzed: false,
    },
    { new: true },
  );
  res.json(doc);

  // 析出をバックグラウンドで実行（レスポンス後）
  if (doc?.field) {
    runDistillation(doc.field).catch(console.error);
  }
});

// 1件削除
router.delete('/:id', async (req, res) => {
  await Experience.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
