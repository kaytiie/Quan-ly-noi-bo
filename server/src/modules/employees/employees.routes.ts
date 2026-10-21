import { Router } from 'express';
import { z } from 'zod';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { Employee } from '../../models/Employee.js';
import { Team } from '../../models/Team.js';

export const employeesRouter = Router();
const inputSchema = z.object({
  fullName: z.string().trim().min(2).max(120), title: z.string().trim().min(2).max(100),
  team: z.string().nullable().optional(), phone: z.string().trim().max(30).optional().default(''),
  status: z.enum(['active', 'inactive']).optional(),
});

employeesRouter.get('/', authenticate, allowRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const query: Record<string, unknown> = {};
    if (typeof req.query.q === 'string' && req.query.q.trim()) query.fullName = { $regex: req.query.q.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (req.query.status === 'active' || req.query.status === 'inactive') query.status = req.query.status;
    const employees = await Employee.find(query).populate('team', 'name').populate('user', 'email role').sort({ fullName: 1 }).limit(250).lean();
    res.json({ employees });
  } catch (error) { next(error); }
});

employeesRouter.post('/', authenticate, allowRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const data = inputSchema.parse(req.body);
    if (data.team && !(await Team.exists({ _id: data.team, active: true }))) return res.status(400).json({ message: 'Tổ công tác không hợp lệ.' });
    const employee = await Employee.create({ ...data, team: data.team || null });
    res.status(201).json({ employee });
  } catch (error) { next(error); }
});

employeesRouter.patch('/:id', authenticate, allowRoles('admin', 'manager'), async (req, res, next) => {
  try {
    const data = inputSchema.partial().parse(req.body);
    if (data.team && !(await Team.exists({ _id: data.team, active: true }))) return res.status(400).json({ message: 'Tổ công tác không hợp lệ.' });
    const employee = await Employee.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }).populate('team', 'name').populate('user', 'email role');
    if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân sự.' });
    res.json({ employee });
  } catch (error) { next(error); }
});
