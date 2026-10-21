import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { Employee } from '../../models/Employee.js';
import { User } from '../../models/User.js';
import { WorkRequest } from '../../models/Request.js';
import { RequestAttachment } from '../../models/RequestAttachment.js';
import { Schedule } from '../../models/Schedule.js';
import { ScheduleChange } from '../../models/ScheduleChange.js';
import { ShiftSymbol } from '../../models/ShiftSymbol.js';
import { AttendanceRecord } from '../../models/AttendanceRecord.js';
import { AttendancePeriod } from '../../models/AttendancePeriod.js';
import { Notification } from '../../models/Notification.js';
import { AuditLog } from '../../models/AuditLog.js';

export const requestsRouter = Router();
const uploadDirectory = fileURLToPath(new URL('../../../uploads/requests/', import.meta.url));
mkdirSync(uploadDirectory, { recursive: true });
const allowedMime = new Map([['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['application/pdf', '.pdf']]);
const upload = multer({ storage: multer.diskStorage({ destination: uploadDirectory, filename: (_req, file, done) => done(null, `${randomUUID()}${allowedMime.get(file.mimetype) || extname(file.originalname).toLowerCase()}`) }), limits: { fileSize: 10 * 1024 * 1024, files: 5 }, fileFilter: (_req, file, done) => allowedMime.has(file.mimetype) ? done(null, true) : done(new Error('Tệp minh chứng chỉ nhận JPEG, PNG, WEBP hoặc PDF.')) });
const receiveFiles = (req: Request, res: Response, next: NextFunction) => upload.array('files', 5)(req, res, error => { if (error) { for (const file of (req.files || []) as Express.Multer.File[]) { try { unlinkSync(file.path); } catch { /* already removed */ } } return next(error); } next(); });
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const asyncRoute = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res, next).catch(next); };
const dateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}`;
};
const dateRange = (start: Date, end: Date) => { const days: string[] = []; let cursor = new Date(`${dateKey(start)}T00:00:00+07:00`); const last = dateKey(end); while (dateKey(cursor) <= last) { days.push(dateKey(cursor)); cursor = new Date(cursor.getTime() + 86400000); } return days; };
const canAccess = (requester: string, userId: string, role: string) => requester === userId || ['admin', 'manager'].includes(role);
async function applyApprovedRequest(item: InstanceType<typeof WorkRequest>, actorId: string) {
  const reason = `Duyệt đơn: ${item.reason}`;
  if (item.type === 'leave') {
    const days = dateRange(item.startDate, item.endDate);
    const months = [...new Set(days.map(day => day.slice(0, 7)))];
    const schedules = await Schedule.find({ month: { $in: months }, status: 'published' });
    if (schedules.length !== months.length) throw Object.assign(new Error('Cần có lịch trực đã công bố cho toàn bộ tháng nghỉ.'), { status: 409 });
    const off = await ShiftSymbol.findOne({ code: 'OFF', active: true });
    if (!off) throw Object.assign(new Error('Chưa cấu hình ký hiệu nghỉ.'), { status: 409 });
    const changeDocs: Array<Record<string, unknown>> = [];
    for (const schedule of schedules) {
      const entry = schedule.entries.find(row => String(row.employee) === String(item.employee));
      if (!entry) throw Object.assign(new Error(`Nhân sự không nằm trong lịch ${schedule.month}.`), { status: 409 });
      for (const key of days.filter(value => value.startsWith(schedule.month))) {
        const day = Number(key.slice(-2)); const cell = entry.cells.find(row => row.day === day);
        if (!cell) continue;
        const oldValue = cell.symbol ? String((await ShiftSymbol.findById(cell.symbol).select('code'))?.code || '') : '';
        if (String(cell.symbol || '') === String(off._id)) continue;
        cell.symbol = off._id; cell.adjusted = true;
        changeDocs.push({ schedule: schedule._id, month: schedule.month, employee: item.employee, day, field: 'shift', oldValue, newValue: off.code, reason, changedBy: actorId });
      }
      schedule.updatedBy = actorId as never;
      await schedule.save();
    }
    if (changeDocs.length) await ScheduleChange.insertMany(changeDocs);
  } else if (item.type === 'shift_swap') {
    const key = dateKey(item.startDate); const month = key.slice(0, 7); const day = Number(key.slice(-2));
    const schedule = await Schedule.findOne({ month, status: 'published' });
    if (!schedule) throw Object.assign(new Error('Cần có lịch trực đã công bố cho ngày đổi ca.'), { status: 409 });
    const first = schedule.entries.find(row => String(row.employee) === String(item.employee));
    const second = schedule.entries.find(row => String(row.employee) === String(item.swapWith));
    const firstCell = first?.cells.find(cell => cell.day === day); const secondCell = second?.cells.find(cell => cell.day === day);
    if (!firstCell || !secondCell) throw Object.assign(new Error('Không tìm thấy ô lịch của hai nhân sự.'), { status: 409 });
    const oldFirst = firstCell.symbol ? String((await ShiftSymbol.findById(firstCell.symbol).select('code'))?.code || '') : '';
    const oldSecond = secondCell.symbol ? String((await ShiftSymbol.findById(secondCell.symbol).select('code'))?.code || '') : '';
    [firstCell.symbol, secondCell.symbol] = [secondCell.symbol, firstCell.symbol]; firstCell.adjusted = true; secondCell.adjusted = true; schedule.updatedBy = actorId as never; await schedule.save();
    await ScheduleChange.insertMany([
      { schedule: schedule._id, month, employee: item.employee, day, field: 'shift', oldValue: oldFirst, newValue: oldSecond, reason, changedBy: actorId },
      { schedule: schedule._id, month, employee: item.swapWith, day, field: 'shift', oldValue: oldSecond, newValue: oldFirst, reason, changedBy: actorId },
    ]);
  } else {
    const key = dateKey(item.startDate); const month = key.slice(0, 7); const day = Number(key.slice(-2));
    const [schedule, period, symbols] = await Promise.all([Schedule.findOne({ month, status: 'published' }), AttendancePeriod.findOne({ month }), ShiftSymbol.find({ active: true }).lean()]);
    if (!schedule) throw Object.assign(new Error('Cần có lịch trực đã công bố để điều chỉnh công.'), { status: 409 });
    if (period?.status === 'closed') throw Object.assign(new Error('Tháng công đã chốt. Mở lại tháng trước khi duyệt.'), { status: 409 });
    const cell = schedule.entries.find(row => String(row.employee) === String(item.employee))?.cells.find(row => row.day === day);
    const baseWork = cell?.symbol ? symbols.find(symbol => String(symbol._id) === String(cell.symbol))?.workFactor || 0 : 0;
    let record = await AttendanceRecord.findOne({ month, employee: item.employee, day });
    const oldWork = record?.adjustedWork ?? record?.baseWork ?? baseWork;
    if (!record) record = new AttendanceRecord({ month, employee: item.employee, day, baseWork, adjustedWork: item.requestedWork, reason, history: [{ actor: actorId, oldValue: oldWork, newValue: item.requestedWork, reason, createdAt: new Date() }] });
    else { record.baseWork = baseWork; record.adjustedWork = item.requestedWork; record.reason = reason; record.history.push({ actor: actorId, oldValue: oldWork, newValue: item.requestedWork, reason, createdAt: new Date() }); }
    await record.save();
  }
}

requestsRouter.get('/', authenticate, asyncRoute(async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (!['admin', 'manager'].includes(req.auth!.role)) filter.requester = req.auth!.userId;
  if (typeof req.query.status === 'string' && ['pending', 'approved', 'rejected'].includes(req.query.status)) filter.status = req.query.status;
  if (typeof req.query.type === 'string' && ['leave', 'shift_swap', 'attendance_adjustment'].includes(req.query.type)) filter.type = req.query.type;
  const items = await WorkRequest.find(filter).populate('employee', 'fullName title team').populate('swapWith', 'fullName title team').populate('requester', 'email').populate('decidedBy', 'email').sort({ createdAt: -1 }).limit(250).lean();
  const attachments = items.length ? await RequestAttachment.find({ request: { $in: items.map(item => item._id) } }).select('request originalName mimeType size').lean() : [];
  const grouped = new Map<string, typeof attachments>();
  for (const file of attachments) { const key = String(file.request); grouped.set(key, [...(grouped.get(key) || []), file]); }
  res.json({ requests: items.map(item => ({ ...item, attachments: grouped.get(String(item._id)) || [] })) });
}));

requestsRouter.post('/', authenticate, allowRoles('admin', 'manager', 'employee'), asyncRoute(async (req, res) => {
  const input = z.object({ type: z.enum(['leave', 'shift_swap', 'attendance_adjustment']), startDate: z.coerce.date(), endDate: z.coerce.date().optional(), swapWith: objectId.optional(), requestedWork: z.coerce.number().min(0).max(2).optional(), reason: z.string().trim().min(3).max(3000), evidence: z.string().trim().max(3000).optional().default('') }).parse(req.body);
  const user = await User.findById(req.auth!.userId).select('employee');
  if (!user?.employee) return res.status(400).json({ message: 'Tài khoản chưa liên kết hồ sơ nhân sự.' });
  const endDate = input.endDate || input.startDate;
  if (endDate < input.startDate) return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu.' });
  if (input.type !== 'leave' && dateKey(endDate) !== dateKey(input.startDate)) return res.status(400).json({ message: 'Đơn đổi ca và điều chỉnh công chỉ áp dụng một ngày.' });
  let swapWith = null;
  if (input.type === 'shift_swap') {
    if (!input.swapWith || input.swapWith === String(user.employee)) return res.status(400).json({ message: 'Chọn đồng nghiệp để đổi ca.' });
    const [requesterEmployee, swapEmployee] = await Promise.all([Employee.findById(user.employee).select('team'), Employee.findOne({ _id: input.swapWith, status: 'active' }).select('team')]);
    if (!swapEmployee || (req.auth!.role === 'employee' && String(requesterEmployee?.team || '') !== String(swapEmployee.team || ''))) return res.status(400).json({ message: 'Nhân sự đổi ca không hợp lệ trong tổ của bạn.' });
    swapWith = input.swapWith;
  }
  if (input.type === 'attendance_adjustment' && input.requestedWork === undefined) return res.status(400).json({ message: 'Nhập số công đề nghị.' });
  const request = await WorkRequest.create({ type: input.type, requester: req.auth!.userId, employee: user.employee, startDate: input.startDate, endDate, swapWith, requestedWork: input.type === 'attendance_adjustment' ? input.requestedWork : null, reason: input.reason, evidence: input.evidence, status: 'pending' });
  const managers = await User.find({ role: { $in: ['admin', 'manager'] }, active: true }).select('_id').lean();
  if (managers.length) await Notification.insertMany(managers.map(manager => ({ user: manager._id, title: 'Đơn mới chờ duyệt', message: `${input.type === 'leave' ? 'Nghỉ phép' : input.type === 'shift_swap' ? 'Đổi ca' : 'Điều chỉnh công'} · ${dateKey(input.startDate)}`, link: '/nghi-phep/duyet' })));
  await AuditLog.create({ actor: req.auth!.userId, action: 'request.created', targetType: 'request', targetId: String(request._id), summary: `Tạo đơn ${input.type}`, details: { type: input.type } });
  res.status(201).json({ request });
}));

requestsRouter.post('/:id/decision', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const input = z.object({ decision: z.enum(['approved', 'rejected']), reason: z.string().trim().max(2000).optional().default('') }).refine(value => value.decision !== 'rejected' || value.reason.length >= 3, 'Cần ghi lý do khi từ chối.').parse(req.body);
  const item = await WorkRequest.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Không tìm thấy đơn.' });
  if (item.status !== 'pending') return res.status(409).json({ message: 'Đơn đã được xử lý.' });
  if (input.decision === 'approved') await applyApprovedRequest(item, req.auth!.userId);
  item.status = input.decision; item.decisionReason = input.reason; item.decidedBy = req.auth!.userId as never; item.decidedAt = new Date(); await item.save();
  await Notification.create({ user: item.requester, title: input.decision === 'approved' ? 'Đơn đã được duyệt' : 'Đơn bị từ chối', message: item.type === 'leave' ? 'Nghỉ phép' : item.type === 'shift_swap' ? 'Đổi ca' : 'Điều chỉnh công', link: '/nghi-phep' });
  await AuditLog.create({ actor: req.auth!.userId, action: `request.${input.decision}`, targetType: 'request', targetId: String(item._id), summary: `${input.decision === 'approved' ? 'Duyệt' : 'Từ chối'} đơn ${item.type}`, details: { reason: input.reason } });
  res.json({ request: item });
}));

requestsRouter.post('/:id/attachments', authenticate, (req, res, next) => {
  void WorkRequest.findById(req.params.id).then(item => {
    if (!item) return res.status(404).json({ message: 'Không tìm thấy đơn.' });
    if (!canAccess(String(item.requester), req.auth!.userId, req.auth!.role)) return res.status(403).json({ message: 'Bạn không có quyền thêm tệp minh chứng.' });
    next();
  }).catch(next);
}, receiveFiles, asyncRoute(async (req, res) => {
  const item = await WorkRequest.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Không tìm thấy đơn.' });
  const files = (req.files || []) as Express.Multer.File[];
  if (!files.length) return res.status(400).json({ message: 'Chưa chọn tệp minh chứng.' });
  const docs = await Promise.all(files.map(file => RequestAttachment.create({ request: item._id, filename: file.filename, originalName: basename(file.originalname).replace(/[\r\n\0]/g, '').slice(0, 180), mimeType: file.mimetype, size: file.size, uploadedBy: req.auth!.userId })));
  res.status(201).json({ attachments: docs.map(file => ({ id: file.id, originalName: file.originalName, size: file.size })) });
}));

requestsRouter.get('/attachments/:id', authenticate, asyncRoute(async (req, res) => {
  const file = await RequestAttachment.findById(req.params.id).lean();
  if (!file) return res.status(404).json({ message: 'Không tìm thấy tệp.' });
  const item = await WorkRequest.findById(file.request).select('requester');
  if (!item || !canAccess(String(item.requester), req.auth!.userId, req.auth!.role)) return res.status(403).json({ message: 'Bạn không có quyền tải tệp này.' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(join(uploadDirectory, basename(file.filename)), file.originalName);
}));
