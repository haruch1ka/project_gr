import { Router } from 'express';
import { Field } from '../models/Field';

const router = Router();

// 一覧取得
router.get('/', async (_req, res) => {
  const docs = await Field.find().sort({ createdAt: 1 });
  res.json(docs);
});

// 1件作成
router.post('/', async (req, res) => {
  const doc = await Field.create(req.body);
  res.status(201).json(doc);
});

// 1件削除
router.delete('/:id', async (req, res) => {
  await Field.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
