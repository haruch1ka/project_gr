import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import experienceRouter       from './router/experience';
import knowledgeRouter        from './router/knowledge';
import knowledgeFolderRouter  from './router/knowledgeFolders';
import planRouter             from './router/plan';
import fieldRouter            from './router/field';
import geminiRouter           from './router/gemini';
import tavilyRouter           from './router/tavily';

const app  = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use('/experiences',        experienceRouter);
app.use('/knowledge',          knowledgeRouter);
app.use('/knowledge-folders',  knowledgeFolderRouter);
app.use('/plans',       planRouter);
app.use('/fields',      fieldRouter);
app.use('/gemini',      geminiRouter);
app.use('/tavily',      tavilyRouter);

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
