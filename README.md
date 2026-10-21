# HydroWork

Nền tảng quản lý nội bộ Phân xưởng sửa chữa – Công ty Thủy điện Sông Bung. Ứng dụng dùng React/Vite, Express/Node.js và MongoDB/Mongoose.

## Trạng thái

Đã triển khai giao diện/API cho các giai đoạn 1–5: nhân sự/tổ, khiếm khuyết/thiết bị, lịch trực thủ công, công và đơn từ, dashboard, thông báo, báo cáo khiếm khuyết, nhật ký một phần và hướng dẫn. Build production đã chạy thành công. Kiểm thử tích hợp yêu cầu MongoDB đang chạy; chưa thể thực hiện nếu môi trường không có MongoDB.

## Yêu cầu

- Node.js 20 trở lên
- MongoDB 7 trở lên đang chạy cục bộ hoặc URI MongoDB riêng

## Chạy phát triển

```powershell
Copy-Item .env.example .env
npm install
npm run seed
npm run dev
```

Mở `http://localhost:5173`. API chạy tại `http://localhost:4000/api`. Seed tạo danh mục và dữ liệu khiếm khuyết giả lập, 16 hồ sơ nhân sự và các tài khoản demo sau:

| Vai trò | Email | Mật khẩu phát triển |
|---|---|---|
| Quản trị viên | Giá trị `SEED_ADMIN_EMAIL` trong `.env` | Giá trị `SEED_ADMIN_PASSWORD` trong `.env` |
| Quản lý | `manager@hydrowork.local` | `Manager-Demo-2026!` |
| Nhân viên | `employee@hydrowork.local` | `Employee-Demo-2026!` |
| Lãnh đạo | `leader@hydrowork.local` | `Leader-Demo-2026!` |

Tài khoản demo chỉ dùng phát triển. Seed bị chặn khi `NODE_ENV=production`.

## Build

```powershell
npm run build
```

## Biến môi trường

Xem `.env.example`. Không đưa `.env` vào kho mã. Khi triển khai, đặt `NODE_ENV=production`, dùng `JWT_SECRET` ngẫu nhiên dài ít nhất 32 ký tự, đặt `COOKIE_SECURE=true`, cấu hình HTTPS và `CLIENT_ORIGIN` đúng domain frontend.

## API hiện có

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/health` | Công khai | Kiểm tra dịch vụ |
| POST | `/api/auth/login` | Công khai | Đăng nhập, giới hạn thử sai |
| POST | `/api/auth/logout` | Phiên hiện tại | Xóa cookie phiên |
| GET | `/api/auth/me` | Đăng nhập | Tài khoản hiện tại |
| GET | `/api/employees` | Đăng nhập | Danh sách, tìm theo tên |
| POST/PATCH | `/api/employees` | Quản lý, quản trị | Tạo/cập nhật hồ sơ |
| GET | `/api/teams` | Đăng nhập | Danh sách tổ đang hoạt động |
| POST/PATCH | `/api/teams` | Quản trị | Tạo/cập nhật/ngừng tổ |
| GET | `/api/defects` và `/api/defects/:id` | Công khai, chỉ đọc | Danh sách, lọc, phân trang và chi tiết phiếu |
| GET | `/api/defects/plants`, `/systems`, `/priorities` | Công khai, chỉ đọc | Danh mục dùng cho bộ lọc khiếm khuyết |
| POST | `/api/defects` | Nhân viên, quản lý, quản trị | Tạo phiếu, mã tự sinh `KK-YYYY-NNNN` |
| POST | `/api/defects/:id/assign`, `/reject`, `/acceptance` | Quản lý, quản trị | Tiếp nhận, phân công, từ chối, nghiệm thu |
| POST | `/api/defects/:id/progress` | Người được giao/phối hợp, quản lý, quản trị | Thêm cập nhật timeline và chuyển trạng thái hợp lệ |
| POST | `/api/defects/:id/attachments` | Người tạo/người xử lý, quản lý, quản trị | Tải tối đa 5 tệp, 10 MB/tệp |
| GET | `/api/defects/attachments/:id` | Đăng nhập | Tải tệp đính kèm riêng tư |
| GET | `/api/defects/equipment` và `/api/defects/equipment/:id` | Đăng nhập | Danh sách thiết bị và lịch sử khiếm khuyết |
| POST | `/api/defects/equipment` | Quản trị | Thêm thiết bị vào danh mục |
| GET | `/api/schedules?month=YYYY-MM` | Đăng nhập | Lịch tháng; nhân viên chỉ nhận lịch tổ của mình |
| POST | `/api/schedules` | Quản lý, quản trị | Lưu nháp/công bố lịch; sửa lịch đã công bố cần lý do |
| GET | `/api/schedules/:month/changes` | Quản lý, quản trị | Lịch sử chỉnh sửa sau công bố |
| GET | `/api/schedules/export?month=YYYY-MM` | Đăng nhập | Xuất lưới lịch trực Excel |
| GET | `/api/attendance?month=YYYY-MM` | Đăng nhập | Công tháng lấy từ lịch đã công bố; nhân viên thấy tổ của mình |
| POST | `/api/attendance/adjustments` | Quản lý, quản trị | Điều chỉnh công, yêu cầu lý do và lưu lịch sử |
| POST | `/api/attendance/:month/close`, `/reopen` | Quản lý, quản trị | Chốt hoặc mở lại công tháng |
| GET/POST | `/api/requests` | Đăng nhập | Danh sách đơn và gửi đơn nghỉ, đổi ca, điều chỉnh công |
| POST | `/api/requests/:id/decision` | Quản lý, quản trị | Duyệt/từ chối đơn; quyết định được áp dụng vào lịch hoặc công |
| POST/GET | `/api/requests/:id/attachments`, `/attachments/:id` | Chủ đơn, quản lý, quản trị | Tệp minh chứng riêng tư |
| GET | `/api/dashboard` | Đăng nhập | Thẻ tổng quan, trực hôm nay, việc của tôi |
| GET/POST | `/api/notifications`, `/read-all`, `/:id/read` | Đăng nhập | Thông báo và trạng thái đã đọc |
| GET | `/api/reports/defects` | Quản lý, quản trị | Tổng hợp phiếu theo ngày, nhà máy, hệ thống, ưu tiên |
| GET | `/api/reports/defects/export` | Quản lý, quản trị | Xuất báo cáo khiếm khuyết Excel |
| GET | `/api/audit` | Quản trị | Nhật ký thao tác công và đơn từ |

Mọi dữ liệu mẫu dùng tên, phiếu và thiết bị giả lập. Không có dữ liệu thật của nhà máy. Các tệp tải lên lưu trong `server/uploads/` và không được phục vụ công khai.

## Sao lưu và phục hồi MongoDB

Sau khi cài MongoDB Database Tools, dùng URI đã cấu hình:

```powershell
mongodump --uri="$env:MONGODB_URI" --out .\backups\hydrowork
mongorestore --uri="$env:MONGODB_URI" .\backups\hydrowork
```

Thư mục sao lưu có thể chứa dữ liệu nhạy cảm khi triển khai thật; lưu trữ và phân quyền theo quy định nội bộ.
