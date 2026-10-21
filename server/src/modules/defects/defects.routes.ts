import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { User } from '../../models/User.js';
import { Employee } from '../../models/Employee.js';
import { Team } from '../../models/Team.js';
import { Plant } from '../../models/Plant.js';
import { EquipmentSystem } from '../../models/EquipmentSystem.js';
import { Equipment } from '../../models/Equipment.js';
import { Priority } from '../../models/Priority.js';
import { Counter } from '../../models/Counter.js';
import { DefectTicket, defectStatuses } from '../../models/DefectTicket.js';
import { DefectLog } from '../../models/DefectLog.js';
import { DefectAttachment } from '../../models/DefectAttachment.js';
import { Notification } from '../../models/Notification.js';
import { AuditLog } from '../../models/AuditLog.js';

export const defectsRouter = Router();
const uploadDirectory = fileURLToPath(new URL('../../../uploads/', import.meta.url));
mkdirSync(uploadDirectory, { recursive: true });
const allowedMime = new Map([['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['application/pdf', '.pdf'], ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'], ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx']]);
const upload = multer({
  storage: multer.diskStorage({ destination: uploadDirectory, filename: (_req, file, done) => done(null, `${randomUUID()}${allowedMime.get(file.mimetype) || extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, done) => allowedMime.has(file.mimetype) ? done(null, true) : done(new Error('Tệp không được hỗ trợ. Chỉ nhận ảnh, PDF, DOCX và XLSX.')),
});
const receiveFiles: RequestHandler = (req, res, next) => {
  upload.array('files', 5)(req, res, error => {
    if (error) {
      for (const file of (req.files || []) as Express.Multer.File[]) { try { unlinkSync(file.path); } catch { /* already removed */ } }
      return next(error);
    }
    next();
  });
};

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Mã tham chiếu không hợp lệ.');
const createSchema = z.object({
  title: z.string().trim().min(3).max(160), detectedAt: z.coerce.date(), plant: objectId, system: objectId,
  equipment: objectId, description: z.string().trim().min(5).max(8000), priority: objectId,
  temporaryMeasure: z.string().trim().max(3000).optional().default(''),
});
const assignmentSchema = z.object({ team: objectId, assignee: objectId, collaborators: z.array(objectId).max(10).optional().default([]), dueAt: z.coerce.date().optional(), note: z.string().trim().max(2000).optional().default('') });
const progressSchema = z.object({ status: z.enum(['in_progress', 'waiting_material', 'paused', 'awaiting_acceptance']), rootCause: z.string().trim().max(3000).optional().default(''), correctiveAction: z.string().trim().max(3000).optional().default(''), workDone: z.string().trim().min(3).max(5000), note: z.string().trim().max(3000).optional().default(''), materials: z.array(z.object({ name: z.string().trim().min(1).max(120), quantity: z.coerce.number().min(0), unit: z.string().trim().min(1).max(30) })).max(30).optional().default([]) });
const ticketPopulate = [
  { path: 'plant', select: 'code name' }, { path: 'system', select: 'name' }, { path: 'equipment', select: 'code name' },
  { path: 'priority', select: 'name level color targetHours' }, { path: 'assignedTeam', select: 'name' },
  { path: 'assignee', select: 'employee', populate: { path: 'employee', select: 'fullName' } },
  { path: 'collaborators', select: 'employee', populate: { path: 'employee', select: 'fullName' } },
  { path: 'createdBy', select: '_id' },
];
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => { void fn(req, res, next).catch(next); };
}
async function nextTicketCode() {
  const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
  const counter = await Counter.findOneAndUpdate({ _id: `defect-${year}` }, { $inc: { value: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return `KK-${year}-${String(counter!.value).padStart(4, '0')}`;
}
async function writeLog(data: Record<string, unknown>) { return DefectLog.create(data); }
function canWork(ticket: { assignee?: unknown; collaborators?: unknown[] }, userId: string, role: string) {
  return ['admin', 'manager'].includes(role) || String(ticket.assignee || '') === userId || (ticket.collaborators || []).some(id => String(id) === userId);
}

// Read-only defect access is intentionally public, as confirmed in GIA_DINH.md.
defectsRouter.get('/plants', asyncRoute(async (_req, res) => res.json({ plants: await Plant.find({ active: true }).sort({ code: 1 }).lean() })));
defectsRouter.get('/systems', asyncRoute(async (req, res) => {
  const filter = typeof req.query.plant === 'string' && /^[a-f\d]{24}$/i.test(req.query.plant) ? { plant: req.query.plant, active: true } : { active: true };
  res.json({ systems: await EquipmentSystem.find(filter).populate('plant', 'code name').sort({ name: 1 }).lean() });
}));
defectsRouter.get('/priorities', asyncRoute(async (_req, res) => res.json({ priorities: await Priority.find({ active: true }).sort({ level: 1 }).lean() })));
defectsRouter.get('/assignees', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (_req, res) => {
  const users = await User.find({ active: true, role: { $in: ['admin', 'manager', 'employee'] } }).select('email role employee').populate('employee', 'fullName').sort({ email: 1 }).lean();
  res.json({ users });
}));
defectsRouter.get('/equipment', authenticate, asyncRoute(async (req, res) => {
  const filter: Record<string, unknown> = { active: true };
  for (const key of ['plant', 'system']) if (typeof req.query[key] === 'string' && /^[a-f\d]{24}$/i.test(req.query[key] as string)) filter[key] = req.query[key];
  if (typeof req.query.q === 'string' && req.query.q.trim()) { const q = escapeRegex(req.query.q.trim().slice(0, 80)); filter.$or = [{ name: { $regex: q, $options: 'i' } }, { code: { $regex: q, $options: 'i' } }]; }
  res.json({ equipment: await Equipment.find(filter).populate('plant', 'code name').populate('system', 'name').sort({ code: 1 }).limit(300).lean() });
}));
defectsRouter.post('/equipment', authenticate, allowRoles('admin'), asyncRoute(async (req, res) => {
  const input = z.object({ code: z.string().trim().min(2).max(40), name: z.string().trim().min(2).max(140), plant: objectId, system: objectId, description: z.string().trim().max(1000).optional().default('') }).parse(req.body);
  const system = await EquipmentSystem.findOne({ _id: input.system, plant: input.plant, active: true });
  if (!system || !(await Plant.exists({ _id: input.plant, active: true }))) return res.status(400).json({ message: 'Nhà máy hoặc hệ thống thiết bị không hợp lệ.' });
  res.status(201).json({ equipment: await Equipment.create(input) });
}));
defectsRouter.get('/equipment/:id', authenticate, asyncRoute(async (req, res) => {
  const equipment = await Equipment.findById(req.params.id).populate('plant', 'code name').populate('system', 'name').lean();
  if (!equipment) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
  const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = 25;
  const [tickets, total] = await Promise.all([DefectTicket.find({ equipment: equipment._id }).sort({ detectedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('priority', 'name color').select('code title detectedAt status priority description').lean(), DefectTicket.countDocuments({ equipment: equipment._id })]);
  const logs = tickets.length ? await DefectLog.find({ ticket: { $in: tickets.map(ticket => ticket._id) }, action: 'progress' }).sort({ createdAt: -1 }).lean() : [];
  const latest = new Map<string, typeof logs[number]>();
  for (const log of logs) if (!latest.has(String(log.ticket))) latest.set(String(log.ticket), log);
  res.json({ equipment, tickets: tickets.map(ticket => ({ ...ticket, lastCause: latest.get(String(ticket._id))?.rootCause || '', lastAction: latest.get(String(ticket._id))?.correctiveAction || '' })), page, pages: Math.max(1, Math.ceil(total / limit)), total });
}));

defectsRouter.get('/', asyncRoute(async (req, res) => {
  const page = Math.max(1, Math.min(10000, Number.parseInt(String(req.query.page || '1'), 10) || 1));
  const limit = Math.max(5, Math.min(50, Number.parseInt(String(req.query.limit || '10'), 10) || 10));
  const filter: Record<string, unknown> = {};
  const detectedAt: Record<string, Date> = {};
  const refs = ['plant', 'system', 'priority', 'assignee', 'equipment'] as const;
  for (const ref of refs) if (typeof req.query[ref] === 'string' && /^[a-f\d]{24}$/i.test(req.query[ref] as string)) filter[ref] = req.query[ref];
  if (typeof req.query.status === 'string' && defectStatuses.includes(req.query.status as typeof defectStatuses[number])) filter.status = req.query.status;
  if (req.query.overdue === 'true') { filter.dueAt = { $lt: new Date() }; filter.status = { $nin: ['closed', 'cancelled'] }; }
  if (typeof req.query.from === 'string' && !Number.isNaN(Date.parse(req.query.from))) detectedAt.$gte = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from) ? new Date(`${req.query.from}T00:00:00+07:00`) : new Date(req.query.from);
  if (typeof req.query.to === 'string' && !Number.isNaN(Date.parse(req.query.to))) detectedAt.$lte = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to) ? new Date(`${req.query.to}T23:59:59.999+07:00`) : new Date(`${req.query.to.slice(0, 10)}T23:59:59.999+07:00`);
  if (Object.keys(detectedAt).length) filter.detectedAt = detectedAt;
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const q = escapeRegex(req.query.q.trim().slice(0, 100));
    filter.$or = [{ code: { $regex: q, $options: 'i' } }, { title: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }, { reporterName: { $regex: q, $options: 'i' } }];
  }
  const [tickets, total] = await Promise.all([DefectTicket.find(filter).populate(ticketPopulate).sort({ detectedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), DefectTicket.countDocuments(filter)]);
  res.json({ tickets, page, limit, total, pages: Math.ceil(total / limit) });
}));

defectsRouter.post('/', authenticate, allowRoles('admin', 'manager', 'employee'), asyncRoute(async (req, res) => {
  const input = createSchema.parse(req.body);
  const [equipment, priority, reporter] = await Promise.all([
    Equipment.findOne({ _id: input.equipment, plant: input.plant, system: input.system, active: true }),
    Priority.findOne({ _id: input.priority, active: true }),
    User.findById(req.auth!.userId).populate('employee', 'fullName'),
  ]);
  if (!equipment) return res.status(400).json({ message: 'Thiết bị không thuộc đúng nhà máy và hệ thống đã chọn.' });
  if (!priority) return res.status(400).json({ message: 'Mức ưu tiên không hợp lệ.' });
  const ticket = await DefectTicket.create({ ...input, code: await nextTicketCode(), createdBy: req.auth!.userId, reporterEmployee: reporter?.employee || null, reporterName: (reporter?.employee as unknown as { fullName?: string } | null)?.fullName || reporter?.email || 'Người dùng hệ thống', dueAt: null, status: 'new' });
  await writeLog({ ticket: ticket._id, actor: req.auth!.userId, action: 'created', toStatus: 'new', note: 'Tạo phiếu khiếm khuyết.' });
  const managers = await User.find({ role: { $in: ['admin', 'manager'] }, active: true }).select('_id').lean();
  if (managers.length) await Notification.insertMany(managers.map(manager => ({ user: manager._id, title: 'Khiếm khuyết mới', message: `${ticket.code} · ${ticket.title}`, link: `/khiem-khuyet/${ticket._id}` })));
  await AuditLog.create({ actor: req.auth!.userId, action: 'defect.created', targetType: 'defect', targetId: String(ticket._id), summary: `Tạo phiếu ${ticket.code}` });
  res.status(201).json({ ticket: await DefectTicket.findById(ticket._id).populate(ticketPopulate).lean() });
}));

defectsRouter.get('/:id', asyncRoute(async (req, res) => {
  const ticket = await DefectTicket.findById(req.params.id).populate(ticketPopulate).lean();
  if (!ticket) return res.status(404).json({ message: 'Không tìm thấy phiếu khiếm khuyết.' });
  const [logs, attachments, similar] = await Promise.all([
    DefectLog.find({ ticket: ticket._id }).populate({ path: 'actor', select: 'employee', populate: { path: 'employee', select: 'fullName' } }).sort({ createdAt: 1 }).lean(),
    DefectAttachment.find({ ticket: ticket._id }).select('originalName mimeType size createdAt uploadedBy log').sort({ createdAt: 1 }).lean(),
    DefectTicket.find({ equipment: ticket.equipment, _id: { $ne: ticket._id } }).sort({ detectedAt: -1 }).limit(5).populate('priority', 'name').select('code title detectedAt status description').lean(),
  ]);
  res.json({ ticket, logs, attachments, similar });
}));

defectsRouter.post('/:id/assign', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const input = assignmentSchema.parse(req.body);
  const ticket = await DefectTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
  if (!['new', 'rejected'].includes(ticket.status)) return res.status(409).json({ message: 'Chỉ phân công phiếu mới hoặc bị từ chối tiếp nhận.' });
  const [team, assignee, priority, collaborators] = await Promise.all([
    Team.exists({ _id: input.team, active: true }), User.findOne({ _id: input.assignee, active: true }), Priority.findById(ticket.priority),
    input.collaborators.length ? User.find({ _id: { $in: input.collaborators }, active: true }).select('_id') : Promise.resolve([]),
  ]);
  if (!team || !assignee || collaborators.length !== input.collaborators.length) return res.status(400).json({ message: 'Tổ, người phụ trách hoặc người phối hợp không hợp lệ.' });
  const fromStatus = ticket.status;
  ticket.assignedTeam = input.team as never;
  ticket.assignee = input.assignee as never;
  ticket.collaborators = input.collaborators as never;
  ticket.dueAt = input.dueAt || new Date(Date.now() + (priority?.targetHours || 72) * 3600000);
  ticket.status = 'accepted';
  await ticket.save();
  await writeLog({ ticket: ticket._id, actor: req.auth!.userId, action: 'assigned', fromStatus, toStatus: 'accepted', note: input.note || `Phân công cho ${assignee.email}.` });
  const recipients = [...new Set([input.assignee, ...input.collaborators])];
  if (recipients.length) await Notification.insertMany(recipients.map(user => ({ user, title: 'Bạn được phân công khiếm khuyết', message: `${ticket.code} · ${ticket.title}`, link: `/khiem-khuyet/${ticket._id}` })));
  await AuditLog.create({ actor: req.auth!.userId, action: 'defect.assigned', targetType: 'defect', targetId: String(ticket._id), summary: `Phân công phiếu ${ticket.code}` });
  res.json({ ticket: await DefectTicket.findById(ticket._id).populate(ticketPopulate).lean() });
}));

defectsRouter.post('/:id/reject', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(3).max(2000) }).parse(req.body);
  const ticket = await DefectTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
  if (ticket.status !== 'new') return res.status(409).json({ message: 'Chỉ từ chối tiếp nhận phiếu mới.' });
  ticket.status = 'rejected'; await ticket.save();
  await writeLog({ ticket: ticket._id, actor: req.auth!.userId, action: 'status', fromStatus: 'new', toStatus: 'rejected', note: reason });
  res.json({ message: 'Đã từ chối tiếp nhận phiếu.' });
}));

defectsRouter.post('/:id/cancel', authenticate, asyncRoute(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(3).max(2000) }).parse(req.body);
  const ticket = await DefectTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
  if (ticket.status !== 'new' || (String(ticket.createdBy) !== req.auth!.userId && !['admin', 'manager'].includes(req.auth!.role))) return res.status(403).json({ message: 'Chỉ người tạo hoặc quản lý được hủy phiếu mới.' });
  ticket.status = 'cancelled'; await ticket.save();
  await writeLog({ ticket: ticket._id, actor: req.auth!.userId, action: 'status', fromStatus: 'new', toStatus: 'cancelled', note: reason });
  res.json({ message: 'Đã hủy phiếu.' });
}));

defectsRouter.post('/:id/progress', authenticate, allowRoles('admin', 'manager', 'employee'), asyncRoute(async (req, res) => {
  const input = progressSchema.parse(req.body);
  const ticket = await DefectTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
  if (!canWork(ticket, req.auth!.userId, req.auth!.role)) return res.status(403).json({ message: 'Phiếu chưa được giao cho bạn.' });
  if (!['accepted', 'in_progress', 'waiting_material', 'paused', 'needs_rework'].includes(ticket.status)) return res.status(409).json({ message: 'Trạng thái hiện tại không cho phép cập nhật tiến độ.' });
  if (['waiting_material', 'paused'].includes(input.status) && !input.note.trim()) return res.status(400).json({ message: 'Cần ghi lý do chờ vật tư hoặc tạm dừng.' });
  const fromStatus = ticket.status;
  ticket.status = input.status;
  await ticket.save();
  const log = await writeLog({ ticket: ticket._id, actor: req.auth!.userId, action: 'progress', fromStatus, toStatus: input.status, note: input.note, rootCause: input.rootCause, correctiveAction: input.correctiveAction, workDone: input.workDone, materials: input.materials });
  res.status(201).json({ log, ticket: await DefectTicket.findById(ticket._id).populate(ticketPopulate).lean() });
}));

defectsRouter.post('/:id/acceptance', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const input = z.object({ result: z.enum(['pass', 'fail']), reason: z.string().trim().max(2000).optional().default('') }).refine(value => value.result === 'pass' || value.reason.length >= 3, 'Cần ghi lý do khi nghiệm thu không đạt.').parse(req.body);
  const ticket = await DefectTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
  if (ticket.status !== 'awaiting_acceptance') return res.status(409).json({ message: 'Phiếu chưa ở trạng thái chờ nghiệm thu.' });
  const fromStatus = ticket.status;
  ticket.status = input.result === 'pass' ? 'closed' : 'in_progress';
  if (input.result === 'pass') { ticket.closedAt = new Date(); ticket.acceptedAt = ticket.closedAt; }
  else { ticket.closedAt = null; ticket.acceptedAt = null; }
  await ticket.save();
  await writeLog({ ticket: ticket._id, actor: req.auth!.userId, action: 'acceptance', fromStatus, toStatus: ticket.status, acceptanceResult: input.result, note: input.result === 'pass' ? 'Nghiệm thu đạt.' : input.reason });
  res.json({ ticket: await DefectTicket.findById(ticket._id).populate(ticketPopulate).lean() });
}));

defectsRouter.post('/:id/attachments', authenticate, (req, res, next) => {
  void DefectTicket.findById(req.params.id).then(ticket => {
    if (!ticket) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
    if (!canWork(ticket, req.auth!.userId, req.auth!.role) && String(ticket.createdBy) !== req.auth!.userId) return res.status(403).json({ message: 'Bạn không có quyền thêm tệp cho phiếu này.' });
    if (typeof req.query.log === 'string') {
      if (!/^[a-f\d]{24}$/i.test(req.query.log)) return res.status(400).json({ message: 'Dòng cập nhật không hợp lệ.' });
      return DefectLog.exists({ _id: req.query.log, ticket: ticket._id }).then(found => found ? next() : res.status(400).json({ message: 'Dòng cập nhật không hợp lệ.' })).catch(next);
    }
    next();
  }).catch(next);
}, receiveFiles, asyncRoute(async (req, res) => {
  const ticket = await DefectTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
  const files = (req.files || []) as Express.Multer.File[];
  if (!files.length) return res.status(400).json({ message: 'Chưa chọn tệp đính kèm.' });
  let logId: string | null = null;
  if (typeof req.query.log === 'string') logId = req.query.log;
  const documents = await Promise.all(files.map(file => DefectAttachment.create({ ticket: ticket._id, log: logId, filename: file.filename, originalName: basename(file.originalname).replace(/[\r\n\0]/g, '').slice(0, 180), mimeType: file.mimetype, size: file.size, uploadedBy: req.auth!.userId })));
  await writeLog({ ticket: ticket._id, actor: req.auth!.userId, action: 'attachment', note: `Đã tải lên ${documents.length} tệp.` });
  res.status(201).json({ attachments: documents.map(({ id, originalName, mimeType, size, createdAt }) => ({ id, originalName, mimeType, size, createdAt })) });
}));

defectsRouter.get('/attachments/:id', authenticate, asyncRoute(async (req, res) => {
  const attachment = await DefectAttachment.findById(req.params.id).lean();
  if (!attachment) return res.status(404).json({ message: 'Không tìm thấy tệp.' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(join(uploadDirectory, basename(attachment.filename)), attachment.originalName);
}));
