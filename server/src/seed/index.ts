import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Team } from '../models/Team.js';
import { Employee } from '../models/Employee.js';
import { User } from '../models/User.js';
import { Plant } from '../models/Plant.js';
import { EquipmentSystem } from '../models/EquipmentSystem.js';
import { Equipment } from '../models/Equipment.js';
import { Priority } from '../models/Priority.js';
import { Counter } from '../models/Counter.js';
import { DefectTicket } from '../models/DefectTicket.js';
import { DefectLog } from '../models/DefectLog.js';
import { ShiftSymbol } from '../models/ShiftSymbol.js';
import { Schedule } from '../models/Schedule.js';

await connectDatabase();
if (env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production.');
const teams = await Promise.all([
  Team.findOneAndUpdate({ name: 'Tổ sửa chữa – bảo trì' }, { name: 'Tổ sửa chữa – bảo trì', description: 'Dữ liệu mẫu' }, { upsert: true, new: true, setDefaultsOnInsert: true }),
  Team.findOneAndUpdate({ name: 'Tổ xây dựng' }, { name: 'Tổ xây dựng', description: 'Dữ liệu mẫu' }, { upsert: true, new: true, setDefaultsOnInsert: true }),
]);
let user = await User.findOne({ email: env.SEED_ADMIN_EMAIL.toLowerCase() });
if (!user) {
  user = await User.create({ email: env.SEED_ADMIN_EMAIL, passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12), role: 'admin' });
  const employee = await Employee.create({ fullName: 'Quản trị viên demo', title: 'Quản trị viên', team: null, status: 'active', user: user._id });
  user.employee = employee._id;
  await user.save();
}
const demoUsers = [
  { email: 'manager@hydrowork.local', password: 'Manager-Demo-2026!', role: 'manager' as const, fullName: 'Nguyễn Minh An (demo)', title: 'Quản lý phân xưởng', team: null },
  { email: 'employee@hydrowork.local', password: 'Employee-Demo-2026!', role: 'employee' as const, fullName: 'Trần Gia Bình (demo)', title: 'Kỹ thuật viên', team: 'Tổ sửa chữa – bảo trì' },
  { email: 'leader@hydrowork.local', password: 'Leader-Demo-2026!', role: 'leader' as const, fullName: 'Lê Thu Hà (demo)', title: 'Lãnh đạo phân xưởng', team: null },
];
for (const demo of demoUsers) {
  let demoUser = await User.findOne({ email: demo.email });
  if (!demoUser) demoUser = await User.create({ email: demo.email, passwordHash: await bcrypt.hash(demo.password, 12), role: demo.role });
  let employee = await Employee.findOne({ fullName: demo.fullName });
  if (!employee) employee = await Employee.create({ fullName: demo.fullName, title: demo.title, team: demo.team ? teams.find(team => team.name === demo.team)?._id : null, status: 'active', user: demoUser._id });
  if (!demoUser.employee) { demoUser.employee = employee._id; await demoUser.save(); }
}
const sampleStaff = Array.from({ length: 12 }, (_, index) => ({
  fullName: `Nhân viên mẫu ${String(index + 1).padStart(2, '0')}`,
  title: ['Kỹ thuật viên', 'Nhân viên kỹ thuật', 'Tổ phó', 'Nhân viên sửa chữa'][index % 4],
  team: teams[index % teams.length]._id,
  status: 'active' as const,
  phone: '',
}));
await Promise.all(sampleStaff.map(person => Employee.findOneAndUpdate({ fullName: person.fullName }, { $setOnInsert: person }, { upsert: true, new: true, setDefaultsOnInsert: true })));
const symbolSeeds = [
  { code: 'SB2', name: 'SB2', color: '#d8ecf7', workFactor: 1, plantKey: 'SB2' as const },
  { code: 'SB4', name: 'SB4', color: '#dff1e7', workFactor: 1, plantKey: 'SB4' as const },
  { code: 'OFFICE', name: 'Ô.thi', color: '#f6e6c8', workFactor: 1, plantKey: null },
  { code: 'OFF', name: 'Nghỉ', color: '#edf0f3', workFactor: 0, plantKey: null },
];
const shiftSymbols = await Promise.all(symbolSeeds.map(item => ShiftSymbol.findOneAndUpdate({ code: item.code }, { ...item, active: true }, { upsert: true, new: true, setDefaultsOnInsert: true })));
const plants = await Promise.all([
  Plant.findOneAndUpdate({ code: 'SB2' }, { code: 'SB2', name: 'Nhà máy Thủy điện Sông Bung 2', active: true }, { upsert: true, new: true, setDefaultsOnInsert: true }),
  Plant.findOneAndUpdate({ code: 'SB4' }, { code: 'SB4', name: 'Nhà máy Thủy điện Sông Bung 4', active: true }, { upsert: true, new: true, setDefaultsOnInsert: true }),
]);
const systemNames = ['Tua-bin', 'Máy phát', 'Điều tốc', 'Bảo vệ – đo lường', 'PLC/SCADA', 'Máy biến áp'];
const systems = await Promise.all(plants.flatMap(plant => systemNames.map(name => EquipmentSystem.findOneAndUpdate({ plant: plant._id, name }, { plant: plant._id, name, active: true }, { upsert: true, new: true, setDefaultsOnInsert: true }))));
const equipmentSeeds = systems.flatMap((system, systemIndex) => [
  { code: `TB-${systemIndex + 1}A`, name: `Thiết bị mẫu ${systemNames[systemIndex % systemNames.length]} A`, plant: system.plant, system: system._id, active: true },
  { code: `TB-${systemIndex + 1}B`, name: `Thiết bị mẫu ${systemNames[systemIndex % systemNames.length]} B`, plant: system.plant, system: system._id, active: true },
]);
const equipment = await Promise.all(equipmentSeeds.map(item => Equipment.findOneAndUpdate({ code: item.code }, item, { upsert: true, new: true, setDefaultsOnInsert: true })));
const prioritySeeds = [
  { name: 'Khẩn cấp', level: 1, targetHours: 8, color: '#b42318' },
  { name: 'Cao', level: 2, targetHours: 24, color: '#d97706' },
  { name: 'Trung bình', level: 3, targetHours: 72, color: '#2563eb' },
  { name: 'Thấp', level: 4, targetHours: 168, color: '#64748b' },
];
const priorities = await Promise.all(prioritySeeds.map(item => Priority.findOneAndUpdate({ level: item.level }, { ...item, active: true }, { upsert: true, new: true, setDefaultsOnInsert: true })));

if ((await DefectTicket.countDocuments()) === 0) {
  const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
  await Counter.findOneAndUpdate({ _id: `defect-${year}` }, { $setOnInsert: { value: 15 } }, { upsert: true, new: true });
  const statuses = ['new', 'new', 'new', 'accepted', 'in_progress', 'in_progress', 'waiting_material', 'paused', 'awaiting_acceptance', 'rejected', 'needs_rework', 'closed', 'closed', 'closed', 'closed'] as const;
  const sampleTickets = await Promise.all(statuses.map(async (status, index) => {
    const detectedAt = new Date(Date.now() - (index + 1) * 86400000);
    const code = `KK-${year}-${String(index + 1).padStart(4, '0')}`;
    const ticket = await DefectTicket.create({ code, title: `Khiếm khuyết mô phỏng số ${index + 1}`, detectedAt, reporterName: `Nhân viên mẫu ${((index % 8) + 1).toString().padStart(2, '0')}`, createdBy: user!._id, plant: plants[index % plants.length]._id, system: systems[index % systems.length]._id, equipment: equipment[index % equipment.length]._id, description: 'Dữ liệu mô phỏng để kiểm tra quy trình. Không phải tình trạng thiết bị thực tế.', priority: priorities[index % priorities.length]._id, temporaryMeasure: 'Theo dõi và ghi nhận theo hướng dẫn giả lập.', status, assignedTeam: ['new', 'rejected'].includes(status) ? null : teams[index % teams.length]._id, assignee: ['new', 'rejected'].includes(status) ? null : user!._id, dueAt: new Date(detectedAt.getTime() + priorities[index % priorities.length].targetHours * 3600000), closedAt: status === 'closed' ? new Date(detectedAt.getTime() + 3600000) : null });
    await DefectLog.create({ ticket: ticket._id, actor: user!._id, action: 'created', toStatus: 'new', note: 'Tạo phiếu dữ liệu mô phỏng.', createdAt: detectedAt });
    if (status !== 'new') await DefectLog.create({ ticket: ticket._id, actor: user!._id, action: 'status', fromStatus: 'new', toStatus: status, note: 'Trạng thái mô phỏng để kiểm thử.', createdAt: new Date(detectedAt.getTime() + 60_000) });
    return ticket;
  }));
  console.log(`Sample defect tickets: ${sampleTickets.length}`);
}
const currentYear = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
const sequenceCodes = await DefectTicket.find({ code: new RegExp(`^KK-${currentYear}-(\\d+)$`) }).select('code').lean();
const highestSequence = sequenceCodes.reduce((max, ticket) => Math.max(max, Number(ticket.code.split('-').at(-1)) || 0), 0);
await Counter.findOneAndUpdate({ _id: `defect-${currentYear}` }, { $max: { value: highestSequence } }, { upsert: true, new: true, setDefaultsOnInsert: true });
const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(new Date());
if (!(await Schedule.exists({ month: currentMonth }))) {
  const [staff, leader] = await Promise.all([Employee.find({ status: 'active' }).sort({ fullName: 1 }), Employee.findOne({ fullName: 'Lê Thu Hà (demo)' })]);
  const days = new Date(Date.UTC(Number(currentMonth.slice(0, 4)), Number(currentMonth.slice(5, 7)), 0)).getUTCDate();
  const symbolByCode = new Map(shiftSymbols.map(symbol => [symbol.code, symbol]));
  const choices = ['SB2', 'SB4', 'OFFICE', 'OFF', 'SB2', 'SB4'];
  const entries = staff.map((employee, employeeIndex) => ({ employee: employee._id, cells: Array.from({ length: days }, (_, index) => ({ day: index + 1, symbol: symbolByCode.get(choices[(employeeIndex + index) % choices.length])!._id, adjusted: false })) }));
  const leaders = leader ? Array.from({ length: days }, (_, index) => ({ day: index + 1, employee: leader._id })) : [];
  await Schedule.create({ month: currentMonth, status: 'published', entries, transportDays: Array.from({ length: days }, (_, index) => index + 1).filter(day => day % 4 === 1), leaders, createdBy: user!._id, updatedBy: user!._id, publishedBy: user!._id, publishedAt: new Date() });
}
console.log(`Seed complete. Teams: ${teams.length}. Plants: ${plants.length}. Equipment: ${equipment.length}. Shift symbols: ${shiftSymbols.length}. Demo accounts: ${env.SEED_ADMIN_EMAIL}, manager@hydrowork.local, employee@hydrowork.local, leader@hydrowork.local.`);
process.exit(0);
