import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { authRoutes } from './routes/auth.js';
import { quizRoutes } from './routes/quizzes.js';
import { tokenRoutes } from './routes/tokens.js';
import { healthRoutes } from './routes/health.js';
import { setupSocketHandlers } from './socket/index.js';

const fastify = Fastify({
  logger: {
    level: 'info',
  },
});

fastify.addHook('onRequest', async (request) => {
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - Headers:`, JSON.stringify(request.headers));
});

fastify.addHook('onResponse', async (request, reply) => {
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - ${reply.statusCode}`);
});

const io = new Server(fastify.server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

await fastify.register(authRoutes);
await fastify.register(quizRoutes);
await fastify.register(tokenRoutes);
await fastify.register(healthRoutes);

setupSocketHandlers(io);

const PORT = parseInt(process.env.PORT || '3001', 10);

console.log('[CONFIG] Environment:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', PORT);
console.log('  CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('  DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`Socket.IO ready for connections`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();