import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export type AuthRole = 'admin' | 'manager' | 'employee' | 'leader';
declare global { namespace Express { interface Request { auth?: { userId: string; role: AuthRole } } } }

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.hydrowork_session;
  if (!token) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: AuthRole };
    const user = await User.findById(payload.sub).select('_id role active');
    if (!user?.active || user.role !== payload.role) return res.status(401).json({ message: 'Phiên đăng nhập không còn hợp lệ.' });
    req.auth = { userId: user.id, role: user.role as AuthRole };
    next();
  } catch {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
}

export function allowRoles(...allowed: AuthRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !allowed.includes(req.auth.role)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
    next();
  };
}
