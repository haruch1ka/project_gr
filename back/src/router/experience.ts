import { Router } from 'express';
import { Experience } from '../models/Experience';

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
});

// 1件削除
router.delete('/:id', async (req, res) => {
  await Experience.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
