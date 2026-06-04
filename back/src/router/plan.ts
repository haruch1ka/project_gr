import { Router } from 'express';
import { Plan } from '../models/Plan';

const router = Router();

// 一覧取得
router.get('/', async (req, res) => {
  const { field } = req.query;
  const filter = field ? { field } : {};
  const docs = await Plan.find(filter).sort({ createdAt: -1 });
  res.json(docs);
});

// 1件作成
router.post('/', async (req, res) => {
  const doc = await Plan.create(req.body);
  res.status(201).json(doc);
});

// レビュー更新
router.patch('/:id', async (req, res) => {
  const doc = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// 1件削除
router.delete('/:id', async (req, res) => {
  await Plan.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
