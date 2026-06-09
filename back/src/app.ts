import express from 'express';
import cors from 'cors';

import experienceRouter      from './router/experience';
import knowledgeRouter       from './router/knowledge';
import knowledgeFolderRouter from './router/knowledgeFolders';
import planRouter            from './router/plan';
import fieldRouter           from './router/field';
import geminiRouter          from './router/gemini';
import tavilyRouter          from './router/tavily';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/experiences',       experienceRouter);
app.use('/knowledge',         knowledgeRouter);
app.use('/knowledge-folders', knowledgeFolderRouter);
app.use('/plans',             planRouter);
app.use('/fields',            fieldRouter);
app.use('/gemini',            geminiRouter);
app.use('/tavily',            tavilyRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

export default app;
