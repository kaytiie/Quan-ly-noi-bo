import { useLocation } from 'react-router-dom';

const labels: Record<string, [string, string]> = {
  '/lich-truc': ['Lịch trực', 'Lịch trực tháng sẽ được triển khai trong giai đoạn lịch trực.'],
  '/cham-cong': ['Chấm công', 'Bảng chấm công sẽ được triển khai sau khi hoàn thành lịch trực.'],
  '/khiem-khuyet': ['Khiếm khuyết', 'Cổng hỗ trợ khiếm khuyết sẽ được triển khai trong giai đoạn tiếp theo.'],
  '/thong-bao': ['Thông báo', 'Thông báo trong ứng dụng sẽ được triển khai ở giai đoạn hoàn thiện.'],
  '/huong-dan': ['Hướng dẫn sử dụng', 'Tài liệu hướng dẫn sẽ được bổ sung khi các chức năng được hoàn thiện.'],
};
export function PlaceholderPage() { const { pathname } = useLocation(); const [title, text] = labels[pathname] || ['Trang', 'Chức năng đang được phát triển.']; return <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">HYDROWORK</div><h1>{title}</h1><p>{text}</p></div></div><section className="panel empty-state"><strong>Chức năng đang được phát triển</strong><span>Nền tảng hiện tại đang hoàn thiện các chức năng ở Giai đoạn 1.</span></section></div>; }
