import { Router } from 'express';
import { KnowledgeFolder } from '../models/KnowledgeFolder';
import { Knowledge } from '../models/Knowledge';

const router = Router();

router.get('/', async (req, res) => {
  const { field } = req.query;
  const filter: Record<string, unknown> = {};
  if (field) filter.field = field;
  const docs = await KnowledgeFolder.find(filter).sort({ order: 1, createdAt: 1 });
  res.json(docs);
});

router.post('/', async (req, res) => {
  const doc = await KnowledgeFolder.create(req.body);
  res.status(201).json(doc);
});

router.patch('/:id', async (req, res) => {
  const doc = await KnowledgeFolder.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

router.delete('/:id', async (req, res) => {
  await deleteFolderRecursive(req.params.id);
  res.json({ ok: true });
});

async function deleteFolderRecursive(id: string): Promise<void> {
  const children = await KnowledgeFolder.find({ parentId: id });
  for (const child of children) {
    await deleteFolderRecursive(child._id.toString());
  }
  await Knowledge.updateMany({ folderId: id }, { $set: { folderId: null } });
  await KnowledgeFolder.findByIdAndDelete(id);
}

export default router;
