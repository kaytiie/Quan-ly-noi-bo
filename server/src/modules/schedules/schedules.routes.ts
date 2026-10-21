import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { Employee } from '../../models/Employee.js';
import { User } from '../../models/User.js';
import { ShiftSymbol } from '../../models/ShiftSymbol.js';
import { Schedule } from '../../models/Schedule.js';
import { ScheduleChange } from '../../models/ScheduleChange.js';
import { Notification } from '../../models/Notification.js';
import { AuditLog } from '../../models/AuditLog.js';

export const schedulesRouter = Router();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const editSchema = z.object({
  month: monthSchema,
  entries: z.array(z.object({ employee: objectId, cells: z.array(objectId.nullable()) })).min(1).max(300),
  transportDays: z.array(z.number().int().min(1).max(31)).max(31),
  leaders: z.array(z.object({ day: z.number().int().min(1).max(31), employee: objectId })).max(31),
  publish: z.boolean().optional().default(false),
  reason: z.string().trim().max(1000).optional().default(''),
});
const daysInMonth = (month: string) => { const [year, number] = month.split('-').map(Number); return new Date(Date.UTC(year, number, 0)).getUTCDate(); };
const weekDayLabel = (month: string, day: number) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day)).getUTCDay()];
const isManager = (role: string) => role === 'admin' || role === 'manager';
const asyncRoute = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res, next).catch(next); };
async function findVisibleEmployees(role: string, userId: string) {
  let filter: Record<string, unknown> = { status: 'active' };
  if (role === 'employee') {
    const employee = await Employee.findOne({ user: userId, status: 'active' }).select('_id team');
    filter = employee ? { status: 'active', $or: [{ team: employee.team }, { _id: employee._id }] } : { status: 'inactive' };
  }
  return Employee.find(filter).populate('team', 'name').populate('user', 'role').sort({ fullName: 1 }).lean();
}

schedulesRouter.get('/symbols', authenticate, asyncRoute(async (_req, res) => {
  res.json({ symbols: await ShiftSymbol.find({ active: true }).sort({ code: 1 }).lean() });
}));

schedulesRouter.get('/export', authenticate, asyncRoute(async (req, res) => {
  const parsed = monthSchema.safeParse(req.query.month);
  if (!parsed.success) return res.status(400).json({ message: 'Tháng không hợp lệ. Dùng định dạng YYYY-MM.' });
  const month = parsed.data;
  const [schedule, employees, symbols] = await Promise.all([
    Schedule.findOne({ month }).lean(), findVisibleEmployees(req.auth!.role, req.auth!.userId), ShiftSymbol.find({ active: true }).lean(),
  ]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HydroWork'; workbook.created = new Date(); workbook.modified = new Date();
  const sheet = workbook.addWorksheet(month, { views: [{ state: 'frozen', xSplit: 4, ySplit: 3 }] });
  const dayCount = daysInMonth(month);
  sheet.columns = [{ key: 'name', width: 28 }, { key: 'total', width: 12 }, { key: 'sb2', width: 10 }, { key: 'sb4', width: 10 }, ...Array.from({ length: dayCount }, (_, i) => ({ key: `d${i + 1}`, width: 7 }))];
  const dateHeaders = ['Nhân sự', 'Tổng công', 'Công SB2', 'Công SB4', ...Array.from({ length: dayCount }, (_, i) => String(i + 1))];
  const weekdays = ['', '', '', '', ...Array.from({ length: dayCount }, (_, i) => weekDayLabel(month, i + 1))];
  sheet.insertRow(1, [`Lịch trực tháng ${month}`, ...Array(dayCount + 3).fill('')]);
  sheet.mergeCells(1, 1, 1, dayCount + 4); sheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF153D60' } };
  sheet.addRow(dateHeaders); sheet.addRow(weekdays);
  for (const headerRow of [2, 3]) sheet.getRow(headerRow).eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerRow === 2 ? 'FF285A7D' : 'FF54728A' } }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });
  const symbolMap = new Map(symbols.map(symbol => [String(symbol._id), symbol]));
  const entryMap = new Map((schedule?.entries || []).map(entry => [String(entry.employee), entry]));
  const employeeMap = new Map(employees.map(employee => [String(employee._id), employee]));
  const counts = Array.from({ length: dayCount }, () => ({ SB2: 0, SB4: 0 }));
  for (const employee of employees) {
    const entry = entryMap.get(String(employee._id)); const cells: string[] = [];
    let total = 0, sb2 = 0, sb4 = 0;
    for (let day = 1; day <= dayCount; day += 1) {
      const symbolId = entry?.cells.find(cell => cell.day === day)?.symbol;
      const symbol = symbolId ? symbolMap.get(String(symbolId)) : undefined;
      cells.push(symbol?.code || '');
      if (symbol) { total += symbol.workFactor; if (symbol.plantKey === 'SB2') { sb2 += symbol.workFactor; counts[day - 1].SB2 += 1; } if (symbol.plantKey === 'SB4') { sb4 += symbol.workFactor; counts[day - 1].SB4 += 1; } }
    }
    sheet.addRow([employee.fullName, total, sb2, sb4, ...cells]);
  }
  const transport = new Set(schedule?.transportDays || []);
  sheet.addRow(['Xe đưa ca', '', '', '', ...Array.from({ length: dayCount }, (_, i) => transport.has(i + 1) ? 'X' : '')]);
  const sb2Row = sheet.addRow(['Số người trực SB2', '', '', '', ...counts.map(count => count.SB2)]);
  const sb4Row = sheet.addRow(['Số người trực SB4', '', '', '', ...counts.map(count => count.SB4)]);
  const leaderMap = new Map((schedule?.leaders || []).map(item => [item.day, item.employee]));
  sheet.addRow(['Lãnh đạo phân xưởng trực', '', '', '', ...Array.from({ length: dayCount }, (_, i) => employeeMap.get(String(leaderMap.get(i + 1)))?.fullName || '')]);
  for (const row of [sb2Row, sb4Row]) { row.font = { bold: true }; row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF1F6' } }; }
  for (let day = 1; day <= dayCount; day += 1) {
    const weekday = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day)).getUTCDay();
    if (weekday === 0 || weekday === 6) for (let row = 2; row <= sheet.rowCount; row += 1) sheet.getRow(row).getCell(day + 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F5F7' } };
    for (let row = 4; row < 4 + employees.length; row += 1) { const cell = sheet.getRow(row).getCell(day + 4); const entry = schedule?.entries.find(item => String(item.employee) === String(employees[row - 4]._id)); const record = entry?.cells.find(item => item.day === day); const symbol = record?.symbol ? symbolMap.get(String(record.symbol)) : undefined; if (symbol?.color) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${symbol.color.slice(1)}` } }; if (symbol || record?.adjusted) cell.font = { color: { argb: record?.adjusted ? 'FFB42318' : 'FF172B3A' }, bold: true }; if (!symbol && record?.adjusted) cell.value = '—'; }
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="HydroWork-lich-truc-${month}.xlsx"`);
  await workbook.xlsx.write(res); res.end();
}));

schedulesRouter.get('/', authenticate, asyncRoute(async (req, res) => {
  const parsed = monthSchema.safeParse(req.query.month);
  if (!parsed.success) return res.status(400).json({ message: 'Tháng không hợp lệ. Dùng định dạng YYYY-MM.' });
  const month = parsed.data;
  const [schedule, symbols] = await Promise.all([
    Schedule.findOne({ month }).populate('entries.employee', 'fullName title team user').populate('entries.cells.symbol').populate('leaders.employee', 'fullName title').populate('createdBy', 'email').populate('updatedBy', 'email').lean(),
    ShiftSymbol.find({ active: true }).sort({ code: 1 }).lean(),
  ]);
  const employees = await findVisibleEmployees(req.auth!.role, req.auth!.userId);
  let visibleSchedule = schedule;
  if (schedule && req.auth!.role === 'employee') {
    const allowed = new Set(employees.map(person => String(person._id)));
    visibleSchedule = { ...schedule, entries: Array.from(schedule.entries).filter(entry => allowed.has(String((entry.employee as unknown as { _id: unknown })._id))) } as unknown as typeof schedule;
  }
  if (schedule?.status === 'draft' && !isManager(req.auth!.role)) visibleSchedule = null;
  res.json({ month, daysInMonth: daysInMonth(month), schedule: visibleSchedule, symbols, employees });
}));

schedulesRouter.get('/:month/changes', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const parsed = monthSchema.safeParse(req.params.month);
  if (!parsed.success) return res.status(400).json({ message: 'Tháng không hợp lệ.' });
  const changes = await ScheduleChange.find({ month: parsed.data }).populate('employee', 'fullName').populate('changedBy', 'email employee').sort({ createdAt: -1 }).lean();
  res.json({ changes });
}));

schedulesRouter.post('/', authenticate, allowRoles('admin', 'manager'), asyncRoute(async (req, res) => {
  const input = editSchema.parse(req.body);
  const dayCount = daysInMonth(input.month);
  if (input.entries.some(entry => entry.cells.length !== dayCount)) return res.status(400).json({ message: `Mỗi nhân sự cần đủ ${dayCount} ô ngày.` });
  if (new Set(input.entries.map(entry => entry.employee)).size !== input.entries.length) return res.status(400).json({ message: 'Nhân sự bị lặp trong lịch.' });
  if (new Set(input.transportDays).size !== input.transportDays.length || input.transportDays.some(day => day > dayCount)) return res.status(400).json({ message: 'Ngày xe đưa ca không hợp lệ.' });
  if (new Set(input.leaders.map(item => item.day)).size !== input.leaders.length || input.leaders.some(item => item.day > dayCount)) return res.status(400).json({ message: 'Mỗi ngày chỉ chọn một lãnh đạo trực.' });
  const allEmployeeIds = [...new Set([...input.entries.map(entry => entry.employee), ...input.leaders.map(item => item.employee)])];
  const [employees, symbols] = await Promise.all([Employee.find({ _id: { $in: allEmployeeIds }, status: 'active' }).select('_id title team user').populate('user', 'role'), ShiftSymbol.find({ _id: { $in: input.entries.flatMap(entry => entry.cells.filter((id): id is string => !!id)) }, active: true }).lean()]);
  if (employees.length !== allEmployeeIds.length) return res.status(400).json({ message: 'Nhân sự không hợp lệ hoặc đã ngừng hoạt động.' });
  const symbolIds = new Set(symbols.map(symbol => String(symbol._id)));
  if (input.entries.some(entry => entry.cells.some(id => id && !symbolIds.has(id)))) return res.status(400).json({ message: 'Lịch có ký hiệu ca không hợp lệ hoặc đã ngừng sử dụng.' });
  if (input.publish && !input.entries.some(entry => entry.cells.some(Boolean))) return res.status(400).json({ message: 'Chưa có ca trực nào để công bố.' });
  const employeeMap = new Map(employees.map(person => [String(person._id), person]));
  for (const leader of input.leaders) {
    const person = employeeMap.get(leader.employee) as unknown as { title: string; user?: { role?: string } };
    if (person.user?.role !== 'leader' && !/lãnh đạo|quản lý/i.test(person.title)) return res.status(400).json({ message: 'Hàng lãnh đạo trực chỉ nhận nhân sự có chức danh lãnh đạo.' });
  }
  const current = await Schedule.findOne({ month: input.month });
  const oldCell = new Map<string, string>();
  for (const entry of current?.entries || []) for (const cell of entry.cells) if (cell.symbol) oldCell.set(`${entry.employee}:${cell.day}`, String(cell.symbol));
  const employeeName = new Map(employees.map(person => [String(person._id), person.fullName]));
  const symbolName = new Map(symbols.map(symbol => [String(symbol._id), symbol.code]));
  const changes: Array<Record<string, unknown>> = [];
  const entries = input.entries.map(entry => ({ employee: entry.employee, cells: entry.cells.map((symbol, index) => {
    const day = index + 1; const key = `${entry.employee}:${day}`; const previous = oldCell.get(key) || ''; const next = symbol || '';
    if (current?.status === 'published' && previous !== next) changes.push({ employee: entry.employee, day, field: 'shift', oldValue: symbolName.get(previous) || '', newValue: symbolName.get(next) || '', reason: input.reason, changedBy: req.auth!.userId });
    return { day, symbol: symbol || null, adjusted: current?.status === 'published' && previous !== next ? true : current?.entries.find(row => String(row.employee) === entry.employee)?.cells.find(cell => cell.day === day)?.adjusted || false };
  }) }));
  const oldTransport = new Set(current?.transportDays || []); const newTransport = new Set(input.transportDays);
  if (current?.status === 'published') for (let day = 1; day <= dayCount; day += 1) if (oldTransport.has(day) !== newTransport.has(day)) changes.push({ employee: null, day, field: 'transport', oldValue: oldTransport.has(day) ? 'X' : '', newValue: newTransport.has(day) ? 'X' : '', reason: input.reason, changedBy: req.auth!.userId });
  const oldLeaders = new Map((current?.leaders || []).map(item => [item.day, String(item.employee)])); const newLeaders = new Map(input.leaders.map(item => [item.day, item.employee]));
  if (current?.status === 'published') for (let day = 1; day <= dayCount; day += 1) if ((oldLeaders.get(day) || '') !== (newLeaders.get(day) || '')) changes.push({ employee: newLeaders.get(day) || oldLeaders.get(day) || input.entries[0].employee, day, field: 'leader', oldValue: employeeName.get(oldLeaders.get(day) || '') || '', newValue: employeeName.get(newLeaders.get(day) || '') || '', reason: input.reason, changedBy: req.auth!.userId });
  if (current?.status === 'published' && changes.length && input.reason.trim().length < 3) return res.status(400).json({ message: 'Cần ghi lý do khi sửa lịch đã công bố.' });
  const status = current?.status === 'published' || input.publish ? 'published' : 'draft';
  const update = { month: input.month, status, entries, transportDays: input.transportDays, leaders: input.leaders, updatedBy: req.auth!.userId, ...(status === 'published' && !current?.publishedAt ? { publishedAt: new Date(), publishedBy: req.auth!.userId } : {}) };
  let schedule;
  if (current) { Object.assign(current, update); schedule = await current.save(); }
  else schedule = await Schedule.create({ ...update, createdBy: req.auth!.userId });
  if (changes.length) await ScheduleChange.insertMany(changes.map(change => ({ ...change, schedule: schedule._id, month: input.month, reason: input.reason })));
  const firstPublish = status === 'published' && current?.status !== 'published';
  const affectedIds = firstPublish ? [...input.entries.map(entry => entry.employee), ...input.leaders.map(item => item.employee)] : changes.filter(change => change.employee).map(change => String(change.employee));
  const recipients = affectedIds.length ? await Employee.find({ _id: { $in: [...new Set(affectedIds)] }, user: { $ne: null } }).select('user').lean() : [];
  if (recipients.length) await Notification.insertMany(recipients.map(person => ({ user: person.user, title: firstPublish ? 'Lịch trực đã công bố' : 'Lịch trực được điều chỉnh', message: `Lịch tháng ${input.month}${firstPublish ? ' đã sẵn sàng.' : ' đã thay đổi.'}`, link: '/lich-truc' })));
  if (firstPublish || changes.length) await AuditLog.create({ actor: req.auth!.userId, action: firstPublish ? 'schedule.published' : 'schedule.adjusted', targetType: 'schedule', targetId: input.month, summary: firstPublish ? `Công bố lịch tháng ${input.month}` : `Sửa ${changes.length} mục lịch tháng ${input.month}`, details: changes.length ? { changes: changes.map(change => ({ employee: change.employee, day: change.day, field: change.field, oldValue: change.oldValue, newValue: change.newValue, reason: change.reason })) } : null });
  res.json({ schedule: await Schedule.findById(schedule._id).populate('entries.employee', 'fullName title team').populate('entries.cells.symbol').populate('leaders.employee', 'fullName title').lean(), changes: changes.length });
}));
