# Giả định và quyết định

## Đã xác nhận

- Khách chưa đăng nhập được xem danh sách và chi tiết khiếm khuyết ở chế độ chỉ đọc. Mọi thao tác khác cần đăng nhập.
- Quy tắc xoay ca theo chu kỳ 3 ngày chưa chốt. Lịch giai đoạn hiện tại được lập thủ công; không tự sinh ca.
- Không áp dụng định mức tối thiểu nhân sự trực cố định. Lịch sẽ thống kê tổng số người trực tại SB2 và SB4 theo từng ngày.
- Seed phát triển tạo một lịch tháng giả lập đã công bố để kiểm tra giao diện; các ký hiệu trong lịch mẫu chỉ là dữ liệu minh họa, không phải quy tắc phân ca.

## Mặc định triển khai

- Frontend dùng React, Vite, TypeScript, React Router và Tailwind CSS.
- Backend dùng Node.js, Express, TypeScript, Mongoose, JWT trong cookie httpOnly và bcrypt.
- URI MongoDB và khóa JWT chỉ đọc từ biến môi trường. Dữ liệu demo hoàn toàn giả lập.
- Giai đoạn 1 tạo tài khoản Quản trị viên demo qua seed phát triển; phải đổi mật khẩu khi triển khai thật. Không dùng thông tin người dùng hoặc nhà máy thật.
- Dữ liệu seed phát triển dùng tên/email/phiếu giả lập; chạy seed bị chặn nếu `NODE_ENV=production`.
- Tệp đính kèm khiếm khuyết: tối đa 5 tệp mỗi lần, tối đa 10 MB/tệp; chỉ nhận JPEG, PNG, WEBP, PDF, DOCX, XLSX; tệp lưu ngoài vùng phục vụ tĩnh và chỉ tài khoản đăng nhập tải được.
- Danh mục nhà máy/hệ thống/mức ưu tiên chỉ mở API đọc để bộ lọc danh sách công khai hoạt động; API thiết bị và thao tác khác yêu cầu đăng nhập.
- Lãnh đạo phân xưởng không thuộc tổ công tác; hồ sơ nhân sự được ngừng hoạt động thay vì xóa cứng.
- Đơn nghỉ được duyệt sẽ đánh dấu ngày liên quan là OFF trên lịch trực đã công bố; đơn đổi ca đổi ký hiệu giữa hai nhân sự trong cùng ngày; điều chỉnh công cần lịch đã công bố và tháng công chưa chốt.
- Nhân viên chỉ xem đơn của mình; quản lý và quản trị xem, duyệt mọi đơn. Nhân viên xem bảng công của tổ mình.
- Tệp minh chứng đơn từ nhận JPEG, PNG, WEBP hoặc PDF, tối đa 5 tệp, 10 MB/tệp; tải xuống cần phiên đăng nhập có quyền.
- Chấm công được tính theo hệ số ký hiệu trong lịch, điều chỉnh ghi người thực hiện, thời điểm, lý do và giá trị trước/sau.
- Giai đoạn 1–5 đã có giao diện/API nền tảng, khiếm khuyết, lịch trực, chấm công, đơn từ, dashboard, thông báo, báo cáo khiếm khuyết, nhật ký một số thao tác và hướng dẫn. Nhật ký hiện ghi các hoạt động công/đơn từ; các thao tác khiếm khuyết và lịch trực vẫn có timeline/lịch sử nghiệp vụ riêng.
- Môi trường làm việc hiện tại không có MongoDB/mongod và không có `.env`; kiểm thử tích hợp cơ sở dữ liệu cần thực hiện sau khi cấu hình MongoDB theo README.

## Chưa triển khai do còn phụ thuộc quy tắc nghiệp vụ

- Sinh lịch tự động theo chu kỳ 3 ngày: cần quy tắc luân phiên cụ thể nếu muốn tự động hóa sau này.
