import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { Employee } from '../../models/Employee.js';
import { User } from '../../models/User.js';

export const authRouter = Router();
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) });
const cookieOptions = { httpOnly: true, secure: env.COOKIE_SECURE === 'true', sameSite: 'lax' as const, path: '/', maxAge: 8 * 60 * 60 * 1000 };

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
    const dummyHash = '$2a$10$7EqJtq98hPqEX7fNZaFWoO5F8e9sYQF5tJ4xX1e0Kq9S/7yGKa7eK';
    if (!user || !user.active || (user.lockedUntil && user.lockedUntil > new Date())) {
      await bcrypt.compare(input.password, dummyHash);
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }
    if (!(await bcrypt.compare(input.password, user.passwordHash))) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 5) { user.failedLoginCount = 0; user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); }
      await user.save();
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await user.save();
    const token = jwt.sign({ role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: '8h' });
    res.cookie('hydrowork_session', token, cookieOptions);
    const employee = user.employee ? await Employee.findById(user.employee).populate('team', 'name') : null;
    res.json({ user: { id: user.id, email: user.email, role: user.role, employee } });
  } catch (error) { next(error); }
});

authRouter.post('/logout', (_req, res) => { res.clearCookie('hydrowork_session', { ...cookieOptions, maxAge: undefined }); res.status(204).end(); });
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId).select('email role employee').populate({ path: 'employee', populate: { path: 'team', select: 'name' } });
    res.json({ user });
  } catch (error) { next(error); }
});
