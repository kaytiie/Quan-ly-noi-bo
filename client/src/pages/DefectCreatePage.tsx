import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, History } from 'lucide-react';
import { request, type CatalogItem, type DefectTicket, formatDate, ticketPath } from '../api/defects';

export function DefectCreatePage() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<CatalogItem[]>([]); const [systems, setSystems] = useState<CatalogItem[]>([]); const [equipment, setEquipment] = useState<CatalogItem[]>([]); const [priorities, setPriorities] = useState<CatalogItem[]>([]); const [similar, setSimilar] = useState<DefectTicket[]>([]);
  const [plant, setPlant] = useState(''); const [system, setSystem] = useState(''); const [selectedEquipment, setSelectedEquipment] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [created, setCreated] = useState<DefectTicket | null>(null);
  const detectedDefault = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).replace(' ', 'T');
  useEffect(() => { Promise.all([request<{ plants: CatalogItem[] }>('/defects/plants'), request<{ priorities: CatalogItem[] }>('/defects/priorities')]).then(([p, pr]) => { setPlants(p.plants); setPriorities(pr.priorities); }).catch(e => setError(e instanceof Error ? e.message : 'Không tải được danh mục.')); }, []);
  useEffect(() => { if (!plant) { setSystems([]); return; } request<{ systems: CatalogItem[] }>(`/defects/systems?plant=${plant}`).then(r => setSystems(r.systems)).catch(() => setSystems([])); }, [plant]);
  useEffect(() => { if (!plant || !system) { setEquipment([]); return; } request<{ equipment: CatalogItem[] }>(`/defects/equipment?plant=${plant}&system=${system}`).then(r => setEquipment(r.equipment)).catch(() => setEquipment([])); }, [plant, system]);
  useEffect(() => { if (!selectedEquipment) { setSimilar([]); return; } request<{ tickets: DefectTicket[] }>(`/defects/equipment/${selectedEquipment}`).then(r => setSimilar(r.tickets.slice(0, 5))).catch(() => setSimilar([])); }, [selectedEquipment]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget); const files = data.getAll('files').filter((file): file is File => file instanceof File && file.size > 0);
    let savedTicket: DefectTicket | null = null;
    try {
      const result = await request<{ ticket: DefectTicket }>('/defects', { method: 'POST', body: JSON.stringify({ title: data.get('title'), detectedAt: new Date(`${String(data.get('detectedAt'))}:00+07:00`).toISOString(), plant, system, equipment: selectedEquipment, description: data.get('description'), priority: data.get('priority'), temporaryMeasure: data.get('temporaryMeasure') || '' }) });
      savedTicket = result.ticket;
      setCreated(savedTicket);
      if (files.length) { const upload = new FormData(); files.forEach(file => upload.append('files', file)); await request(`/defects/${savedTicket._id}/attachments`, { method: 'POST', body: upload }); }
      navigate(ticketPath(savedTicket._id));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể tạo phiếu.'); if (savedTicket) setCreated(savedTicket); }
    finally { setBusy(false); }
  }
  return <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">KHIẾM KHUYẾT</div><h1>Tạo phiếu khiếm khuyết</h1><p>Nhập thông tin để tiếp nhận và theo dõi xử lý.</p></div><Link to="/khiem-khuyet" className="secondary-button button-link"><ArrowLeft size={17} />Quay lại danh sách</Link></div>
    <div className="defect-create-layout"><section className="panel"><form className="defect-form" onSubmit={submit}>
      <label className="span-two">Tiêu đề *<input name="title" required minLength={3} maxLength={160} placeholder="Mô tả ngắn gọn khiếm khuyết" /></label>
      <label>Ngày giờ phát hiện *<input name="detectedAt" type="datetime-local" required defaultValue={detectedDefault} /></label>
      <label>Nhà máy *<select required value={plant} onChange={e => { setPlant(e.target.value); setSystem(''); setSelectedEquipment(''); }}><option value="">Chọn nhà máy</option>{plants.map(p => <option key={p._id} value={p._id}>{p.code} · {p.name}</option>)}</select></label>
      <label>Hệ thống thiết bị *<select required value={system} disabled={!plant} onChange={e => { setSystem(e.target.value); setSelectedEquipment(''); }}><option value="">Chọn hệ thống</option>{systems.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></label>
      <label>Thiết bị *<select required value={selectedEquipment} disabled={!system} onChange={e => setSelectedEquipment(e.target.value)}><option value="">Chọn thiết bị</option>{equipment.map(e => <option key={e._id} value={e._id}>{e.code} · {e.name}</option>)}</select></label>
      <label>Mức độ ưu tiên *<select name="priority" required defaultValue=""><option value="">Chọn mức độ</option>{priorities.map(p => <option key={p._id} value={p._id}>{p.name} · mục tiêu {p.targetHours} giờ</option>)}</select></label>
      <label className="span-two">Mô tả hiện tượng *<textarea name="description" required minLength={5} maxLength={8000} rows={5} placeholder="Triệu chứng, điều kiện xuất hiện và thông tin liên quan" /></label>
      <label className="span-two">Biện pháp tạm thời<textarea name="temporaryMeasure" maxLength={3000} rows={3} placeholder="Nếu đã thực hiện" /></label>
      <label className="span-two file-field"><span><Paperclip size={17} /> Ảnh hoặc tài liệu đính kèm</span><input name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.docx,.xlsx" /><small>Tối đa 5 tệp, mỗi tệp không quá 10 MB. Ảnh, PDF, DOCX hoặc XLSX.</small></label>
      {error && <div className="alert error span-two">{error}{created && <> Phiếu {created.code} đã được tạo. <Link to={ticketPath(created._id)}>Mở phiếu</Link>.</>}</div>}
      <div className="form-actions span-two"><Link to="/khiem-khuyet" className="secondary-button button-link">Hủy</Link><button className="primary-button" disabled={busy}>{busy ? 'Đang lưu…' : 'Tạo phiếu'}</button></div>
    </form></section>
    <aside className="panel similar-panel"><div className="similar-heading"><History size={19} /><div><strong>Khiếm khuyết tương tự</strong><span>Các phiếu gần đây của thiết bị</span></div></div>{!selectedEquipment ? <div className="similar-empty">Chọn thiết bị để xem lịch sử khiếm khuyết.</div> : similar.length === 0 ? <div className="similar-empty">Chưa có phiếu cũ cho thiết bị này.</div> : <div className="similar-list">{similar.map(item => <Link key={item._id} to={ticketPath(item._id)} className="similar-item"><strong>{item.code}</strong><span>{formatDate(item.detectedAt)} · {item.title}</span><small><b>Nguyên nhân:</b> {item.lastCause || 'Chưa ghi nhận'}<br /><b>Cách xử lý:</b> {item.lastAction || item.description.slice(0, 90)}</small></Link>)}</div>}</aside></div>
  </div>;
}
