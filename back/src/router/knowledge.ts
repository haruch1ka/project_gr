import { Router } from 'express';
import { Knowledge } from '../models/Knowledge';

const router = Router();

// 一覧取得（field / type でフィルタ可）
router.get('/', async (req, res) => {
  const { field, type } = req.query;
  const filter: Record<string, unknown> = {};
  if (field) filter.field = field;
  if (type)  filter.type  = type;
  const docs = await Knowledge.find(filter).sort({ createdAt: -1 });
  res.json(docs);
});

// 1件取得
router.get('/:id', async (req, res) => {
  const doc = await Knowledge.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// 1件作成
router.post('/', async (req, res) => {
  const doc = await Knowledge.create(req.body);
  res.status(201).json(doc);
});

// confidenceScore 更新
router.patch('/:id', async (req, res) => {
  const doc = await Knowledge.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// 1件削除
router.delete('/:id', async (req, res) => {
  await Knowledge.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
