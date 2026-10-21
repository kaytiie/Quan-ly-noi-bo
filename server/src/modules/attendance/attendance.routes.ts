import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { Employee } from '../../models/Employee.js';
import { Schedule } from '../../models/Schedule.js';
import { ShiftSymbol } from '../../models/ShiftSymbol.js';
import { AttendanceRecord } from '../../models/AttendanceRecord.js';
import { AttendancePeriod } from '../../models/AttendancePeriod.js';
import { AuditLog } from '../../models/AuditLog.js';

export const attendanceRouter = Router();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const asyncRoute = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res, next).catch(next); };
const daysInMonth = (month: string) => { const [year, number] = month.split('-').map(Number); return new Date(Date.UTC(year, number, 0)).getUTCDate(); };
async function visibleEmployees(role: string, userId: string) {
  if (role !== 'employee') return Employee.find({ status: 'active' }).populate('team', 'name').sort({ fullName: 1 }).lean();
  const employee = await Employee.findOne({ user: userId, status: 'active' }).select('_id team');
  return Employee.find(employee ? { status: 'active', $or: [{ team: employee.team }, { _id: employee._id }] } : { status: 'inactive' }).populate('team', 'name').sort({ fullName: 1 }).lean();
}

attendanceRouter.get('/', authenticate, asyncRoute(async (req, res) => {
  const parsed = monthSchema.safeParse(req.query.month);
  if (!parsed.success) return res.status(400).json({ message: 'Tháng không hợp lệ. Dùng định dạng YYYY-MM.' });
  const month = parsed.data;
  const [schedule, period] = await Promise.all([Schedule.findOne({ month }).populate('entries.cells.symbol').lean(), AttendancePeriod.findOne({ month }).lean()]);
  const employees = await visibleEmployees(req.auth!.role, req.auth!.userId);
  if (!schedule || schedule.status !== 'published') return res.json({ month, daysInMonth: daysInMonth(month), published: false, period: period || { status: 'open' }, employees, entries: [] });
  const records = await AttendanceRecord.find({ month, employee: { $in: employees.map(employee => employee._id) } }).lean();
  const recordMap = new Map(records.map(record => [`${record.employee}:${record.day}`, record]));
  const entries = employees.map(employee => {
    const scheduleEntry = schedule.entries.find(entry => String(entry.employee) === String(employee._id));
    const cells = Array.from({ length: daysInMonth(month) }, (_, index) => {
      const day = index + 1; const scheduledCell = scheduleEntry?.cells.find(cell => cell.day === day); const symbol = scheduledCell?.symbol as unknown as { _id: unknown; name: string; workFactor: number } | null | undefined; const record = recordMap.get(`${employee._id}:${day}`);
      return { day, symbol: symbol?.name || '', baseWork: symbol?.workFactor || 0, work: record?.adjustedWork ?? symbol?.workFactor ?? 0, adjusted: record?.adjustedWork != null, reason: record?.reason || '' };
    });
    return { employee, cells };
  });
  res.json({ month, daysInMonth: daysInMonth(month), published: true, period: period || { status: 'open' }, employees, entries });
}));

attendanceRouter.post('/adjustments', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const input = z.object({ month: monthSchema, reason: z.string().trim().min(3).max(1000), records: z.array(z.object({ employee: objectId, day: z.number().int().min(1).max(31), work: z.coerce.number().min(0).max(2) })).min(1).max(1000) }).parse(req.body);
  if (input.records.some(record => record.day > daysInMonth(input.month))) return res.status(400).json({ message: 'Ngày điều chỉnh không thuộc tháng đã chọn.' });
  if (new Set(input.records.map(record => `${record.employee}:${record.day}`)).size !== input.records.length) return res.status(400).json({ message: 'Một ngày công bị lặp trong yêu cầu.' });
  const [schedule, period, symbols] = await Promise.all([Schedule.findOne({ month: input.month }), AttendancePeriod.findOne({ month: input.month }), ShiftSymbol.find({ active: true }).lean()]);
  if (!schedule || schedule.status !== 'published') return res.status(409).json({ message: 'Cần công bố lịch trực trước khi điều chỉnh công.' });
  if (period?.status === 'closed') return res.status(409).json({ message: 'Tháng công đã chốt. Quản lý cần mở lại tháng trước khi sửa.' });
  const symbolMap = new Map(symbols.map(symbol => [String(symbol._id), symbol]));
  const validEmployees = new Set(schedule.entries.map(entry => String(entry.employee)));
  if (input.records.some(record => !validEmployees.has(record.employee))) return res.status(400).json({ message: 'Nhân sự không thuộc lịch đã công bố.' });
  for (const change of input.records) {
    const scheduleCell = schedule.entries.find(entry => String(entry.employee) === change.employee)?.cells.find(cell => cell.day === change.day);
    const baseWork = scheduleCell?.symbol ? symbolMap.get(String(scheduleCell.symbol))?.workFactor || 0 : 0;
    let record = await AttendanceRecord.findOne({ month: input.month, employee: change.employee, day: change.day });
    const oldWork = record?.adjustedWork ?? record?.baseWork ?? baseWork;
    if (!record) record = new AttendanceRecord({ month: input.month, employee: change.employee, day: change.day, baseWork, adjustedWork: change.work, reason: input.reason, history: [{ actor: req.auth!.userId, oldValue: oldWork, newValue: change.work, reason: input.reason, createdAt: new Date() }] });
    else { record.baseWork = baseWork; record.adjustedWork = change.work; record.reason = input.reason; record.history.push({ actor: req.auth!.userId, oldValue: oldWork, newValue: change.work, reason: input.reason, createdAt: new Date() }); }
    if (oldWork !== change.work) await record.save();
  }
  await AuditLog.create({ actor: req.auth!.userId, action: 'attendance.adjusted', targetType: 'attendance', targetId: input.month, summary: `Điều chỉnh ${input.records.length} ô công tháng ${input.month}`, details: { reason: input.reason, records: input.records } });
  res.json({ message: 'Đã lưu điều chỉnh công.', changed: input.records.length });
}));

attendanceRouter.post('/:month/close', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const parsed = monthSchema.safeParse(req.params.month);
  if (!parsed.success) return res.status(400).json({ message: 'Tháng không hợp lệ.' });
  const schedule = await Schedule.findOne({ month: parsed.data, status: 'published' });
  if (!schedule) return res.status(409).json({ message: 'Cần có lịch đã công bố trước khi chốt công.' });
  let period = await AttendancePeriod.findOne({ month: parsed.data });
  if (period?.status === 'closed') return res.status(409).json({ message: 'Tháng công đã được chốt.' });
  if (!period) period = new AttendancePeriod({ month: parsed.data, status: 'open', history: [] });
  period.status = 'closed'; period.history.push({ action: 'closed', actor: req.auth!.userId, reason: 'Chốt công cuối tháng.', createdAt: new Date() }); await period.save();
  await AuditLog.create({ actor: req.auth!.userId, action: 'attendance.closed', targetType: 'attendance', targetId: parsed.data, summary: `Chốt công tháng ${parsed.data}` });
  res.json({ period });
}));

attendanceRouter.post('/:month/reopen', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const parsed = monthSchema.safeParse(req.params.month);
  const { reason } = z.object({ reason: z.string().trim().min(3).max(1000) }).parse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Tháng không hợp lệ.' });
  const period = await AttendancePeriod.findOne({ month: parsed.data });
  if (!period || period.status !== 'closed') return res.status(409).json({ message: 'Tháng công chưa được chốt.' });
  period.status = 'open'; period.history.push({ action: 'reopened', actor: req.auth!.userId, reason, createdAt: new Date() }); await period.save();
  await AuditLog.create({ actor: req.auth!.userId, action: 'attendance.reopened', targetType: 'attendance', targetId: parsed.data, summary: `Mở lại công tháng ${parsed.data}`, details: { reason } });
  res.json({ period });
}));

attendanceRouter.get('/:month/history', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const parsed = monthSchema.safeParse(req.params.month);
  if (!parsed.success) return res.status(400).json({ message: 'Tháng không hợp lệ.' });
  const records = await AttendanceRecord.find({ month: parsed.data, 'history.0': { $exists: true } }).populate('employee', 'fullName').populate('history.actor', 'email').sort({ employee: 1, day: 1 }).lean();
  const period = await AttendancePeriod.findOne({ month: parsed.data }).populate('history.actor', 'email').lean();
  res.json({ records, period });
}));
