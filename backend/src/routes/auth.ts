import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcrypt';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/register', async (request, reply) => {
    const body = request.body as {
      username: string;
      password: string;
      token: string;
    };

    const { username, password, token } = body;

    if (!username || !password || !token) {
      return reply.status(400).send({ error: 'Missing fields' });
    }

    const registrationToken = await prisma.registrationToken.findUnique({
      where: { token },
    });

    if (!registrationToken || registrationToken.used) {
      return reply.status(400).send({ error: 'Invalid or used token' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'USER',
      },
    });

    await prisma.registrationToken.update({
      where: { token },
      data: {
        used: true,
        usedBy: user.id,
      },
    });

    return reply.send({
      user: { id: user.id, username: user.username, role: user.role },
    });
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const body = request.body as { username: string; password: string };

      if (!body.username || !body.password) {
        return reply.status(400).send({ error: 'Missing fields' });
      }

      console.log('Login attempt for:', body.username);

      const user = await prisma.user.findUnique({
        where: { username: body.username },
      });

      console.log('User found:', user ? 'yes' : 'no');

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(body.password, user.password);
      console.log('Password valid:', isValid);

      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      return reply.send({
        user: { id: user.id, username: user.username, role: user.role },
      });
    } catch (error) {
      console.error('Login error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/api/auth/me', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || null;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    return reply.send({ user });
  });
}
