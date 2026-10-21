import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, ClipboardCheck, Gauge, Menu, Users, Wrench, X, LogOut, BookOpen, UserCog, Boxes } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const items = [
  { to: '/tong-quan', label: 'Tổng quan', icon: Gauge },
  { to: '/lich-truc', label: 'Lịch trực', icon: CalendarDays },
  { to: '/cham-cong', label: 'Chấm công', icon: ClipboardCheck },
  { to: '/nghi-phep', label: 'Đơn nghỉ / đổi ca', icon: CalendarDays },
  { to: '/khiem-khuyet', label: 'Khiếm khuyết', icon: Wrench, public: true },
  { to: '/thiet-bi', label: 'Thiết bị', icon: Boxes },
  { to: '/nhan-su', label: 'Nhân sự', icon: Users },
  { to: '/thong-bao', label: 'Thông báo', icon: Bell },
  { to: '/bao-cao', label: 'Báo cáo', icon: ClipboardCheck },
  { to: '/huong-dan', label: 'Hướng dẫn', icon: BookOpen, public: true },
];
const roleName: Record<string, string> = { admin: 'Quản trị viên', manager: 'Quản lý phân xưởng', employee: 'Nhân viên', leader: 'Lãnh đạo' };

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  async function logout() { await signOut(); navigate('/dang-nhap'); }
  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu icon-button" aria-label={open ? 'Đóng menu' : 'Mở menu'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <div className="brand-mark">SB</div><div className="brand-copy"><strong>EVNGENCO2</strong><span>CÔNG TY THỦY ĐIỆN SÔNG BUNG</span></div>
      <div className="system-title">HydroWork <span>· Quản lý nội bộ Phân xưởng sửa chữa</span></div>
      <div className="top-actions"><NavLink className="guide-link" to="/huong-dan">Hướng dẫn sử dụng</NavLink>{user ? <><div className="user-chip"><span>{user.employee?.fullName || user.email}</span><small>{roleName[user.role]}</small></div><button className="logout-button" onClick={logout}><LogOut size={17} /><span>Đăng xuất</span></button></> : <Link className="logout-button login-link" to="/dang-nhap">Đăng nhập</Link>}</div>
    </header>
    {open && <button className="scrim" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}><div className="sidebar-caption">MENU CHÍNH</div><nav>{items.filter(item => (user || item.public) && (item.to !== '/nhan-su' || user?.role === 'admin' || user?.role === 'manager') && (item.to !== '/bao-cao' || user?.role === 'admin' || user?.role === 'manager')).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}{user?.role === 'admin' && <><NavLink to="/quan-tri/to-cong-tac" onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><UserCog size={19} /><span>Tổ công tác</span></NavLink><NavLink to="/quan-tri/nhat-ky" onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><ClipboardCheck size={19} /><span>Nhật ký hoạt động</span></NavLink></>}</nav><div className="sidebar-bottom">Phiên bản nền tảng · 0.1</div></aside>
    <main className="main-content"><Outlet /></main>
  </div>;
}
