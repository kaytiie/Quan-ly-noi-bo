import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { TeamsPage } from './pages/TeamsPage';
import { DefectListPage } from './pages/DefectListPage';
import { DefectCreatePage } from './pages/DefectCreatePage';
import { DefectDetailPage } from './pages/DefectDetailPage';
import { DefectAcceptancePage, DefectAssignPage, DefectProgressPage } from './pages/DefectActionPages';
import { EquipmentDetailPage, EquipmentListPage } from './pages/EquipmentPages';
import { ScheduleEditorPage, SchedulePage } from './pages/SchedulePages';
import { AttendancePage } from './pages/AttendancePages';
import { RequestApprovalPage, RequestCreatePage, RequestListPage } from './pages/RequestPages';
import { NotificationPage } from './pages/NotificationPage';
import { GuidePage } from './pages/GuidePage';
import { AuditPage } from './pages/AuditPage';
import { ReportsPage } from './pages/ReportsPage';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><AuthProvider><Routes>
  <Route path="/dang-nhap" element={<LoginPage />} />
  <Route element={<AppLayout />}>
    <Route path="/khiem-khuyet" element={<DefectListPage />} /><Route path="/khiem-khuyet/tao-moi" element={<RequireAuth />}><Route index element={<DefectCreatePage />} /></Route>
    <Route path="/khiem-khuyet/:id" element={<DefectDetailPage />} />
    <Route element={<RequireAuth roles={['admin', 'manager']} />}><Route path="/khiem-khuyet/:id/phan-cong" element={<DefectAssignPage />} /><Route path="/khiem-khuyet/:id/nghiem-thu" element={<DefectAcceptancePage />} /></Route>
    <Route element={<RequireAuth roles={['admin', 'manager', 'employee']} />}><Route path="/khiem-khuyet/:id/cap-nhat" element={<DefectProgressPage />} /></Route>
    <Route path="/huong-dan" element={<GuidePage />} />
    <Route element={<RequireAuth />}><Route path="/tong-quan" element={<DashboardPage />} /><Route path="/lich-truc" element={<SchedulePage />} /><Route path="/cham-cong" element={<AttendancePage />} /><Route path="/nghi-phep" element={<RequestListPage />} /><Route path="/nghi-phep/tao-moi" element={<RequestCreatePage />} /><Route path="/thong-bao" element={<NotificationPage />} /><Route path="/thiet-bi" element={<EquipmentListPage />} /><Route path="/thiet-bi/:id" element={<EquipmentDetailPage />} /><Route path="/nhan-su" element={<RequireAuth roles={['admin', 'manager']} />}><Route index element={<EmployeesPage />} /></Route><Route path="/quan-tri/to-cong-tac" element={<RequireAuth roles={['admin']} />}><Route index element={<TeamsPage />} /></Route><Route element={<RequireAuth roles={['admin', 'manager']} />}><Route path="/lich-truc/chinh-sua" element={<ScheduleEditorPage />} /><Route path="/nghi-phep/duyet" element={<RequestApprovalPage />} /><Route path="/bao-cao" element={<ReportsPage />} /></Route><Route element={<RequireAuth roles={['admin']} />}><Route path="/quan-tri/nhat-ky" element={<AuditPage />} /></Route></Route>
  </Route>
  <Route path="*" element={<Navigate to="/tong-quan" replace />} />
</Routes></AuthProvider></BrowserRouter></React.StrictMode>);
