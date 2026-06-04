import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import experienceRouter from './router/experience';
import knowledgeRouter  from './router/knowledge';
import planRouter       from './router/plan';

const app  = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use('/experiences', experienceRouter);
app.use('/knowledge',   knowledgeRouter);
app.use('/plans',       planRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI が .env に設定されていません');

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

export default app;
