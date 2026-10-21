import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/tong-quan" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await signIn(email, password); navigate(location.state?.from?.pathname || '/tong-quan', { replace: true }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.'); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><div className="login-brand"><div className="brand-mark brand-large">SB</div><div><strong>EVNGENCO2</strong><span>CÔNG TY THỦY ĐIỆN SÔNG BUNG</span></div></div><section className="login-card"><div className="eyebrow">CỔNG QUẢN LÝ NỘI BỘ</div><h1>Đăng nhập HydroWork</h1><p className="muted">Dành cho cán bộ, nhân viên Phân xưởng sửa chữa.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Mật khẩu<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>{error && <div className="alert error">{error}</div>}<button className="primary-button full-button" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button></form><div className="login-note">Tài khoản được cấp bởi Quản trị viên hệ thống.</div></section><footer>© Công ty Thủy điện Sông Bung · HydroWork</footer></main>;
}
