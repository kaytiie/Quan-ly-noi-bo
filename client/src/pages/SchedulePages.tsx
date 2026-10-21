import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Download, Printer, Save, Send, Copy } from 'lucide-react';
import { request, type Ref, formatDateTime } from '../api/defects';
import { useAuth } from '../auth/AuthContext';

type EmployeeRow = { _id: string; fullName: string; title: string; team?: Ref | null; user?: { role: string } | null };
type Shift = { _id: string; code: string; name: string; color: string; workFactor: number; plantKey: 'SB2' | 'SB4' | null };
type Cell = { day: number; symbol: Shift | string | null; adjusted: boolean };
type Entry = { employee: EmployeeRow | string; cells: Cell[] };
type ScheduleData = {
  month: string; daysInMonth: number; employees: EmployeeRow[]; symbols: Shift[];
  schedule: null | { _id: string; status: 'draft' | 'published'; entries: Entry[]; transportDays: number[]; leaders: Array<{ day: number; employee: EmployeeRow | string }>; publishedAt?: string; updatedAt?: string };
};
type ScheduleChangeItem = { _id: string; day: number; field: 'shift' | 'transport' | 'leader'; employee?: EmployeeRow | null; oldValue: string; newValue: string; reason: string; changedBy?: Ref; createdAt: string };
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const monthNow = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(new Date());
const shiftId = (symbol: Cell['symbol'] | undefined) => typeof symbol === 'string' ? symbol : symbol?._id || '';
const personId = (employee: EmployeeRow | string) => typeof employee === 'string' ? employee : employee._id;
function changeMonth(month: string, delta: number) { const [year, value] = month.split('-').map(Number); const date = new Date(Date.UTC(year, value - 1 + delta, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; }
function weekDay(month: string, day: number) { return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day)).getUTCDay()]; }
function isWeekend(month: string, day: number) { const weekday = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day)).getUTCDay(); return weekday === 0 || weekday === 6; }
function rosterTotals(cells: Cell[], shifts: Shift[]) {
  let total = 0, sb2 = 0, sb4 = 0;
  for (const cell of cells) { const symbol = shifts.find(item => item._id === shiftId(cell.symbol)); if (!symbol) continue; total += symbol.workFactor; if (symbol.plantKey === 'SB2') sb2 += symbol.workFactor; if (symbol.plantKey === 'SB4') sb4 += symbol.workFactor; }
  return { total, sb2, sb4 };
}
function useSchedule(month: string) {
  const [data, setData] = useState<ScheduleData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async (value: string) => { setLoading(true); setError(''); try { setData(await request<ScheduleData>(`/schedules?month=${value}`)); } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được lịch trực.'); setData(null); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(month); }, [month, load]);
  return { data, setData, loading, error, reload: () => load(month) };
}

export function SchedulePage() {
  const [month, setMonth] = useState(monthNow()); const { data, loading, error } = useSchedule(month); const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const entryMap = useMemo(() => new Map((data?.schedule?.entries || []).map(entry => [personId(entry.employee), entry])), [data]);
  const leaderMap = useMemo(() => new Map((data?.schedule?.leaders || []).map(item => [item.day, typeof item.employee === 'string' ? item.employee : item.employee._id])), [data]);
  const transportDays = new Set(data?.schedule?.transportDays || []);
  const countAt = (day: number, plantKey: 'SB2' | 'SB4') => (data?.employees || []).reduce((count, person) => { const symbol = data?.symbols.find(item => item._id === shiftId(entryMap.get(person._id)?.cells.find(cell => cell.day === day)?.symbol)); return count + (symbol?.plantKey === plantKey ? 1 : 0); }, 0);
  return <div className="page-wrap schedule-page"><div className="page-heading"><div><div className="eyebrow">LỊCH LÀM VIỆC</div><h1>Lịch trực tháng</h1><p>Lịch phân công theo nhà máy và nhân sự.</p></div><div className="schedule-actions"><input type="month" value={month} onChange={e => setMonth(e.target.value)} /><button className="secondary-button" onClick={() => { window.location.href = `${API_URL}/schedules/export?month=${month}`; }}><Download size={16} />Xuất Excel</button><button className="secondary-button" onClick={() => window.print()}><Printer size={16} />In</button>{canEdit && <Link className="primary-button button-link" to={`/lich-truc/chinh-sua?month=${month}`}>Chỉnh sửa</Link>}</div></div>
    <section className="panel schedule-panel"><div className="schedule-monthbar"><button className="icon-button" aria-label="Tháng trước" onClick={() => setMonth(changeMonth(month, -1))}><ArrowLeft size={18} /></button><strong><CalendarDays size={18} />Tháng {month.slice(5, 7)}/{month.slice(0, 4)}</strong><button className="icon-button" aria-label="Tháng sau" onClick={() => setMonth(changeMonth(month, 1))}><ArrowRight size={18} /></button><span className={`schedule-state ${data?.schedule?.status || 'empty'}`}>{data?.schedule?.status === 'published' ? 'Đã công bố' : data?.schedule?.status === 'draft' ? 'Bản nháp' : 'Chưa có lịch'}</span></div>
      {error && <div className="alert error">{error}</div>}{loading ? <div className="empty-state">Đang tải lịch…</div> : !data?.schedule ? <div className="empty-state"><CalendarDays /><strong>Chưa có lịch trực được công bố</strong>{canEdit && <Link className="primary-button button-link" to={`/lich-truc/chinh-sua?month=${month}`}>Lập lịch tháng này</Link>}</div> : <div className="schedule-scroll"><table className="schedule-table"><thead><tr><th className="schedule-name-col">Nhân sự / thống kê</th><th className="schedule-total-col">Tổng công</th><th className="schedule-total-col">SB2</th><th className="schedule-total-col">SB4</th>{Array.from({ length: data.daysInMonth }, (_, index) => <th key={index} className={isWeekend(month, index + 1) ? 'weekend' : ''}><span>{index + 1}</span><small>{weekDay(month, index + 1)}</small></th>)}</tr></thead><tbody>
        <tr className="transport-row"><th>Xe đưa ca</th><td colSpan={3}>X đánh dấu ngày có xe</td>{Array.from({ length: data.daysInMonth }, (_, index) => <td key={index} className={isWeekend(month, index + 1) ? 'weekend' : ''}>{transportDays.has(index + 1) ? <strong>X</strong> : ''}</td>)}</tr>
        {data.employees.map(person => { const entry = entryMap.get(person._id); const cells = entry?.cells || []; const totals = rosterTotals(cells, data.symbols); return <tr key={person._id}><th className="schedule-person"><strong>{person.fullName}</strong><small>{person.title}{person.team?.name ? ` · ${person.team.name}` : ''}</small></th><td className="numeric-cell">{totals.total}</td><td className="numeric-cell">{totals.sb2}</td><td className="numeric-cell">{totals.sb4}</td>{Array.from({ length: data.daysInMonth }, (_, index) => { const cell = cells.find(item => item.day === index + 1); const symbol = data.symbols.find(item => item._id === shiftId(cell?.symbol)); return <td key={index} className={`${isWeekend(month, index + 1) ? 'weekend' : ''} ${cell?.adjusted ? 'adjusted-cell' : ''}`}>{symbol ? <span className="shift-badge" style={{ background: symbol.color }}>{symbol.name}</span> : cell?.adjusted ? '—' : ''}</td>; })}</tr>; })}
        <tr className="count-row"><th>Số người trực SB2</th><td colSpan={3}>Thống kê theo lịch</td>{Array.from({ length: data.daysInMonth }, (_, index) => <td key={index} className={isWeekend(month, index + 1) ? 'weekend' : ''}>{countAt(index + 1, 'SB2')}</td>)}</tr>
        <tr className="count-row"><th>Số người trực SB4</th><td colSpan={3}>Thống kê theo lịch</td>{Array.from({ length: data.daysInMonth }, (_, index) => <td key={index} className={isWeekend(month, index + 1) ? 'weekend' : ''}>{countAt(index + 1, 'SB4')}</td>)}</tr>
        <tr className="leader-row"><th>Lãnh đạo phân xưởng trực</th><td colSpan={3}>Theo lịch phân công</td>{Array.from({ length: data.daysInMonth }, (_, index) => { const leader = data.employees.find(person => person._id === leaderMap.get(index + 1)); return <td key={index} className={isWeekend(month, index + 1) ? 'weekend' : ''}>{leader?.fullName || ''}</td>; })}</tr>
      </tbody></table></div>}
    </section>{data?.schedule && <section className="panel schedule-legend"><strong>Ký hiệu ca</strong>{data.symbols.map(symbol => <span key={symbol._id}><i style={{ background: symbol.color }} />{symbol.name} <small>{symbol.workFactor} công</small></span>)}<span className="legend-adjusted">Ô đỏ: đã điều chỉnh sau khi công bố</span></section>}</div>;
}

export function ScheduleEditorPage() {
  const { user } = useAuth();
  const initial = new URLSearchParams(window.location.search).get('month') || monthNow();
  const [month, setMonth] = useState(initial); const { data, loading, error, reload } = useSchedule(month);
  const [cells, setCells] = useState<Record<string, string[]>>({}); const [transportDays, setTransportDays] = useState<number[]>([]); const [leaders, setLeaders] = useState<Record<number, string>>({}); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ScheduleChangeItem[]>([]);
  useEffect(() => {
    if (!data) return;
    const entries: Record<string, string[]> = {};
    for (const employee of data.employees) { const saved = data.schedule?.entries.find(entry => personId(entry.employee) === employee._id); entries[employee._id] = Array.from({ length: data.daysInMonth }, (_, index) => shiftId(saved?.cells.find(cell => cell.day === index + 1)?.symbol)); }
    setCells(entries); setTransportDays(data.schedule?.transportDays || []); setLeaders(Object.fromEntries((data.schedule?.leaders || []).map(item => [item.day, personId(item.employee)]))); setReason('');
  }, [data]);
  useEffect(() => { if (data?.schedule?.status !== 'published') { setHistory([]); return; } request<{ changes: ScheduleChangeItem[] }>(`/schedules/${month}/changes`).then(result => setHistory(result.changes)).catch(() => setHistory([])); }, [data?.schedule?.status, month, data?.schedule?.updatedAt]);
  const leaderPeople = (data?.employees || []).filter(person => person.user?.role === 'leader' || /lãnh đạo|quản lý/i.test(person.title));
  function setCell(employee: string, dayIndex: number, symbol: string) { setCells(current => ({ ...current, [employee]: current[employee].map((value, index) => index === dayIndex ? symbol : value) })); }
  function toggleTransport(day: number) { setTransportDays(current => current.includes(day) ? current.filter(item => item !== day) : [...current, day].sort((a, b) => a - b)); }
  function setLeader(day: number, employee: string) { setLeaders(current => { const next = { ...current }; if (employee) next[day] = employee; else delete next[day]; return next; }); }
  async function copyLastMonth() {
    const previousMonth = changeMonth(month, -1);
    try {
      const previous = await request<ScheduleData>(`/schedules?month=${previousMonth}`);
      const copied: Record<string, string[]> = {};
      for (const employee of data?.employees || []) { const old = previous.schedule?.entries.find(entry => personId(entry.employee) === employee._id); copied[employee._id] = Array.from({ length: data?.daysInMonth || 0 }, (_, index) => index < (previous.daysInMonth || 0) ? shiftId(old?.cells.find(cell => cell.day === index + 1)?.symbol) : ''); }
      setCells(copied); setTransportDays((previous.schedule?.transportDays || []).filter(day => day <= (data?.daysInMonth || 0))); setLeaders(Object.fromEntries((previous.schedule?.leaders || []).filter(item => item.day <= (data?.daysInMonth || 0)).map(item => [item.day, personId(item.employee)]))); setMessage(`Đã chép dữ liệu từ ${previousMonth}. Hãy rà soát trước khi lưu.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Không thể chép tháng trước.'); }
  }
  async function save(publish: boolean) {
    if (!data) return;
    if (publish && !window.confirm(`Công bố lịch trực tháng ${month}?`)) return;
    setBusy(true); setMessage('');
    const body = { month, entries: data.employees.map(employee => ({ employee: employee._id, cells: (cells[employee._id] || Array(data.daysInMonth).fill('')).map(value => value || null) })), transportDays, leaders: Object.entries(leaders).map(([day, employee]) => ({ day: Number(day), employee })), publish, reason };
    try { await request('/schedules', { method: 'POST', body: JSON.stringify(body) }); setMessage(publish ? 'Lịch đã được công bố.' : 'Đã lưu bản nháp.'); await reload(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Không thể lưu lịch.'); }
    finally { setBusy(false); }
  }
  if (user?.role !== 'admin' && user?.role !== 'manager') return <div className="page-wrap"><div className="alert error">Bạn không có quyền chỉnh sửa lịch trực.</div></div>;
  return <div className="page-wrap schedule-page"><div className="page-heading"><div><div className="eyebrow">LỊCH LÀM VIỆC</div><h1>{data?.schedule?.status === 'published' ? 'Chỉnh sửa lịch đã công bố' : 'Lập lịch trực'}</h1><p>Nhập thủ công các ký hiệu theo từng ngày. Không áp dụng chu kỳ tự sinh.</p></div><Link to="/lich-truc" className="secondary-button button-link"><ArrowLeft size={17} />Xem lịch</Link></div>
    <section className="panel schedule-editor-toolbar"><label>Tháng <input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label><button className="secondary-button" onClick={copyLastMonth}><Copy size={16} />Sao chép từ tháng trước</button><span className={`schedule-state ${data?.schedule?.status || 'empty'}`}>{data?.schedule?.status === 'published' ? 'Đã công bố' : 'Bản nháp'}</span></section>
    {error && <div className="alert error">{error}</div>}{message && <div className={message.includes('không') || message.includes('Cần ghi') ? 'alert error' : 'alert schedule-message'}>{message}</div>}
    {data?.schedule?.status === 'published' && <section className="panel schedule-reason"><label>Lý do chỉnh sửa lịch đã công bố *<input value={reason} onChange={e => setReason(e.target.value)} minLength={3} maxLength={1000} placeholder="Ghi rõ lý do thay đổi để lưu vào lịch sử" /></label><small>Các ô thay đổi sẽ hiển thị màu đỏ và ghi lại giá trị cũ, giá trị mới, người sửa, thời điểm và lý do.</small></section>}
    {loading ? <section className="panel empty-state">Đang tải dữ liệu lịch…</section> : data && <section className="panel schedule-panel"><div className="schedule-monthbar"><strong>Tháng {month.slice(5, 7)}/{month.slice(0, 4)} · {data.daysInMonth} ngày</strong><span>{data.employees.length} nhân sự</span></div><div className="schedule-scroll"><table className="schedule-table editor-table"><thead><tr><th className="schedule-name-col">Nhân sự</th>{Array.from({ length: data.daysInMonth }, (_, index) => <th key={index} className={isWeekend(month, index + 1) ? 'weekend' : ''}><span>{index + 1}</span><small>{weekDay(month, index + 1)}</small></th>)}</tr></thead><tbody>
      <tr className="transport-row"><th>Xe đưa ca</th>{Array.from({ length: data.daysInMonth }, (_, index) => <td key={index} className={isWeekend(month, index + 1) ? 'weekend' : ''}><label className="transport-check"><input type="checkbox" checked={transportDays.includes(index + 1)} onChange={() => toggleTransport(index + 1)} /><span>X</span></label></td>)}</tr>
      {data.employees.map(employee => <tr key={employee._id}><th className="schedule-person"><strong>{employee.fullName}</strong><small>{employee.title}{employee.team?.name ? ` · ${employee.team.name}` : ''}</small></th>{Array.from({ length: data.daysInMonth }, (_, index) => { const symbolId = cells[employee._id]?.[index] || ''; const symbol = data.symbols.find(item => item._id === symbolId); return <td key={index} className={`${isWeekend(month, index + 1) ? 'weekend' : ''} ${data.schedule?.entries.find(entry => personId(entry.employee) === employee._id)?.cells.find(cell => cell.day === index + 1)?.adjusted ? 'adjusted-cell' : ''}`}><select aria-label={`${employee.fullName}, ngày ${index + 1}`} value={symbolId} style={symbol ? { background: symbol.color } : undefined} onChange={e => setCell(employee._id, index, e.target.value)}><option value="">—</option>{data.symbols.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></td>; })}</tr>)}
      <tr className="leader-row"><th>Lãnh đạo phân xưởng trực</th>{Array.from({ length: data.daysInMonth }, (_, index) => <td key={index} className={isWeekend(month, index + 1) ? 'weekend' : ''}><select aria-label={`Lãnh đạo trực ngày ${index + 1}`} value={leaders[index + 1] || ''} onChange={e => setLeader(index + 1, e.target.value)}><option value="">—</option>{leaderPeople.map(person => <option key={person._id} value={person._id}>{person.fullName}</option>)}</select></td>)}</tr>
    </tbody></table></div><div className="schedule-legend inline-legend">{data.symbols.map(symbol => <span key={symbol._id}><i style={{ background: symbol.color }} />{symbol.name} <small>{symbol.workFactor} công</small></span>)}</div><div className="schedule-editor-footer">{data.schedule?.status === 'published' && <div className="schedule-warning">Lịch đã công bố. Mọi thay đổi đều được lưu vào lịch sử.</div>}<div className="form-actions"><button className="secondary-button" disabled={busy || loading} onClick={() => void save(false)}><Save size={16} />Lưu nháp</button><button className="primary-button" disabled={busy || loading} onClick={() => void save(true)}><Send size={16} />{busy ? 'Đang lưu…' : data.schedule?.status === 'published' ? 'Lưu thay đổi' : 'Công bố'}</button></div></div></section>}
    {data?.schedule?.status === 'published' && <section className="panel schedule-history"><div className="panel-title"><CalendarDays size={18} /><h2>Lịch sử sửa lịch đã công bố</h2></div>{history.length === 0 ? <p className="muted-text">Chưa có lần điều chỉnh nào.</p> : <div className="table-scroll"><table><thead><tr><th>Ngày</th><th>Nhân sự / nội dung</th><th>Giá trị cũ</th><th>Giá trị mới</th><th>Lý do</th><th>Người sửa · thời điểm</th></tr></thead><tbody>{history.map(item => <tr key={item._id}><td>{String(item.day).padStart(2, '0')}/{month.slice(5, 7)}</td><td>{item.field === 'transport' ? 'Xe đưa ca' : item.field === 'leader' ? `Lãnh đạo · ${item.employee?.fullName || ''}` : item.employee?.fullName || '—'}</td><td>{item.oldValue || '—'}</td><td>{item.newValue || '—'}</td><td>{item.reason}</td><td>{item.changedBy?.email || '—'}<small className="history-time">{formatDateTime(item.createdAt)}</small></td></tr>)}</tbody></table></div>}</section>}
  </div>;
}
