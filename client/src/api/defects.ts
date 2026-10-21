import { request } from './http';

export type Ref = { _id: string; id?: string; name?: string; code?: string; email?: string; fullName?: string; level?: number; color?: string; employee?: { fullName?: string } };
export type DefectStatus = 'new' | 'accepted' | 'in_progress' | 'waiting_material' | 'paused' | 'awaiting_acceptance' | 'rejected' | 'needs_rework' | 'closed' | 'cancelled';
export type DefectTicket = {
  _id: string; code: string; title: string; detectedAt: string; reporterName: string; description: string; temporaryMeasure: string;
  plant: Ref; system: Ref; equipment: Ref; priority: Ref; status: DefectStatus; assignedTeam?: Ref | null;
  assignee?: (Ref & { employee?: { fullName: string } }) | null; createdBy?: Ref; dueAt?: string | null; closedAt?: string | null;
  collaborators?: Array<Ref & { employee?: { fullName: string } }>;
  lastCause?: string; lastAction?: string;
};
export type DefectLog = { _id: string; actor?: Ref; action: string; fromStatus?: DefectStatus; toStatus?: DefectStatus; note: string; rootCause?: string; correctiveAction?: string; workDone?: string; materials?: Array<{ name: string; quantity: number; unit: string }>; acceptanceResult?: 'pass' | 'fail' | null; createdAt: string };
export type DefectAttachment = { _id: string; originalName: string; mimeType: string; size: number; createdAt: string; log?: string | null };
export type CatalogItem = Ref & { active?: boolean; targetHours?: number; plant?: Ref; system?: Ref; description?: string };
export const statusLabels: Record<DefectStatus, string> = {
  new: 'Mới tạo', accepted: 'Đã tiếp nhận', in_progress: 'Đang xử lý', waiting_material: 'Chờ vật tư', paused: 'Tạm dừng',
  awaiting_acceptance: 'Chờ nghiệm thu', rejected: 'Từ chối tiếp nhận', needs_rework: 'Cần xử lý lại', closed: 'Đã đóng', cancelled: 'Đã hủy',
};
export const statusClass: Record<DefectStatus, string> = {
  new: 'new', accepted: 'accepted', in_progress: 'in-progress', waiting_material: 'waiting', paused: 'paused',
  awaiting_acceptance: 'acceptance', rejected: 'rejected', needs_rework: 'rework', closed: 'closed', cancelled: 'cancelled',
};
export function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—'; }
export function formatDateTime(value?: string | null) { return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—'; }
export function ticketPath(id: string) { return `/khiem-khuyet/${id}`; }
export { request };
