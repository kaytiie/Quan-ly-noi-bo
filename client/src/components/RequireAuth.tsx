import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function RequireAuth({ roles }: { roles?: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="center-state">Đang kiểm tra phiên đăng nhập…</main>;
  if (!user) return <Navigate to="/dang-nhap" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/tong-quan" replace />;
  return <Outlet />;
}
