import { Router } from 'express';
import { z } from 'zod';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { Team } from '../../models/Team.js';

export const teamsRouter = Router();
const teamInput = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).optional().default('') });

teamsRouter.get('/', authenticate, async (_req, res, next) => {
  try { res.json({ teams: await Team.find({ active: true }).sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});
teamsRouter.post('/', authenticate, allowRoles('admin'), async (req, res, next) => {
  try { const input = teamInput.parse(req.body); res.status(201).json({ team: await Team.create(input) }); } catch (error) { next(error); }
});
teamsRouter.patch('/:id', authenticate, allowRoles('admin'), async (req, res, next) => {
  try {
    const input = teamInput.partial().extend({ active: z.boolean().optional() }).parse(req.body);
    const team = await Team.findByIdAndUpdate(req.params.id, input, { new: true, runValidators: true });
    if (!team) return res.status(404).json({ message: 'Không tìm thấy tổ công tác.' });
    res.json({ team });
  } catch (error) { next(error); }
});
