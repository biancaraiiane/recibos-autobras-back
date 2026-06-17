import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes';
import receiptRoutes from './modules/receipts/receipts.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { env } from './config/env';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL === '*' ? '*' : env.FRONTEND_URL.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/receipts', receiptRoutes);

app.use(errorMiddleware);

export default app;
