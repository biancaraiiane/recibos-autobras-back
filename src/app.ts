import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes';
import receiptRoutes from './modules/receipts/receipts.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { env } from './config/env';

const app = express();

const allowedOrigins =
  env.FRONTEND_URL === '*'
    ? '*'
    : env.FRONTEND_URL.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite chamadas sem origin, como Postman, PowerShell, curl e health check do Render
      if (!origin) {
        return callback(null, true);
      }

      // Permite qualquer origem apenas se FRONTEND_URL="*"
      if (allowedOrigins === '*') {
        return callback(null, true);
      }

      // Permite apenas origens configuradas
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS bloqueado para origem: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Responde corretamente requisições preflight OPTIONS
app.options(
  '*',
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins === '*') {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS bloqueado para origem: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/auth', authRoutes);
app.use('/receipts', receiptRoutes);

app.use(errorMiddleware);

export default app;