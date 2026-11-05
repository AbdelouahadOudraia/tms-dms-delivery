import express from 'express';
import path from 'node:path';
import { createSalesApi } from './sales/api';

const root = process.cwd();
const sales = createSalesApi(root);
const app = express();
app.use('/api/sales', sales.app);
app.use(express.static(path.join(root, 'dist')));
app.use((_request, response) => response.sendFile(path.join(root, 'dist', 'index.html')));
const server = app.listen(Number(process.env.PORT || 3001), '127.0.0.1');
const close = () => { sales.close(); server.close(); };
process.once('SIGINT', close);
process.once('SIGTERM', close);
