import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      role: string;
    };
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.headers['x-user-id'] as string;

  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    request.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  } catch (error) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  await authMiddleware(request, reply);

  if (request.user?.role !== 'ADMIN') {
    return reply.status(403).send({ error: 'Forbidden' });
  }
}
