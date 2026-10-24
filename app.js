import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './src/config/env.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import apiRoutes from './src/routes.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json());

app.use('/api/v1', apiRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
    errors: [],
  });
});

app.use(errorHandler);

export default app;

