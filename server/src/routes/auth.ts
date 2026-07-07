import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password format' });
  }
  const { email, password } = parsed.data;

  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, department_id, is_active
     FROM users WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    departmentId: user.department_id,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  } as jwt.SignOptions);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.department_id },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, email, role, department_id FROM users WHERE id = $1`,
    [req.user!.id]
  );
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
