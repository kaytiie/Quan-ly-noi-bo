# PROMPT XÂY DỰNG WEBSITE HYDROWORK (BẢN 2 – ĐƠN GIẢN HÓA, MERN STACK)

## 1. VAI TRÒ VÀ MỤC TIÊU

Bạn là lập trình viên full-stack (MERN) kiêm thiết kế UI/UX, có kinh nghiệm làm hệ thống quản lý nội bộ cho nhà máy thủy điện.

Hãy xây dựng website **HydroWork – Quản lý nội bộ Phân xưởng sửa chữa**, thuộc Công ty Thủy điện Sông Bung (EVNGENCO2), phục vụ hai nhà máy **Sông Bung 2 (SB2)** và **Sông Bung 4 (SB4)**.

Website có **hai chức năng chính**:
1. **Lịch trực và chấm công** (giống bảng lịch tháng: hàng là nhân viên, cột là ngày).
2. **Cổng hỗ trợ xử lý khiếm khuyết** (danh sách phiếu, tạo phiếu, theo dõi xử lý).

Ngoài ra có: Tổng quan, Quản lý nhân sự, Báo cáo, Thông báo, Quản trị.

**Nguyên tắc chung**
- Đây là website **đơn giản, dễ dùng**, không làm dư thừa. Không làm chức năng chưa được yêu cầu.
- **Mỗi chức năng là một trang riêng** (một địa chỉ URL riêng). Không gộp nhiều thứ vào một trang. Chữ trên trang phải đủ lớn, dễ đọc.
- Là ứng dụng thật: có frontend, backend, cơ sở dữ liệu. Dữ liệu lưu bền vững, không mất khi tải lại trang.
- Dễ mở rộng thêm chức năng sau này (mỗi chức năng là một module riêng ở cả frontend và backend).
- Không tuyên bố hoàn thành khi chưa chạy thử.
- **Chỗ nào chưa rõ: dùng phương án mặc định đã ghi trong prompt, ghi lại vào file `GIA_DINH.md`, và hỏi lại tôi, không tự đoán rồi làm tiếp những phần phụ thuộc.**

## 2. CÔNG NGHỆ (MERN STACK, KHÔNG DÙNG NEXT.JS)

| Phần | Công nghệ |
|---|---|
| Frontend | React (dùng Vite), React Router, Tailwind CSS, JavaScript hoặc TypeScript (chọn TypeScript nếu thuận tiện) |
| Backend | Node.js + Express (REST API) |
| Cơ sở dữ liệu | MongoDB, dùng **Mongoose** (không dùng Prisma, không dùng PostgreSQL) |
| Đăng nhập | JWT lưu trong cookie httpOnly, mật khẩu băm bằng bcrypt |
| Kiểm tra dữ liệu | zod hoặc express-validator ở backend; kiểm tra thêm ở frontend |
| Tệp đính kèm | Lưu trên ổ đĩa máy chủ (multer), chỉ người đã đăng nhập mới tải được |
| Xuất báo cáo | Excel (exceljs) và in/PDF từ trình duyệt |
| Quản lý mã nguồn | Git |

Cấu trúc thư mục (gợi ý):
```
hydrowork/
  client/            (React + Vite)
    src/pages/       (mỗi trang một file)
    src/components/
    src/api/
  server/            (Express)
    src/models/      (Mongoose)
    src/routes/
    src/controllers/
    src/middleware/  (xác thực, phân quyền, kiểm tra dữ liệu)
    src/seed/        (dữ liệu mẫu)
  .env.example
  README.md
```

## 3. GIAO DIỆN CHUNG

Giữ phong cách của cổng hỗ trợ hiện có (EVNGENCO2):
- Thanh trên màu trắng: logo, chữ **EVNGENCO2 / CÔNG TY THỦY ĐIỆN SÔNG BUNG / tên hệ thống**, bên phải là nút *Hướng dẫn sử dụng* và *Đăng nhập* (khi đã đăng nhập thì hiện tên người dùng + *Đăng xuất*).
- Menu trái nền xanh đậm; mục đang chọn tô màu vàng.
- Khu vực nội dung nền xám nhạt; mỗi khối là một thẻ trắng bo góc.
- Nút chính màu xanh đậm; nút phụ viền xám.
- Chữ tối thiểu 14–16px. Bảng tối đa khoảng 7–8 cột; thông tin còn lại xem ở trang chi tiết.
- Tiếng Việt; ngày dd/MM/yyyy; giờ 24h; múi giờ Asia/Ho_Chi_Minh.
- Dùng được trên máy tính và điện thoại (menu thu gọn trên điện thoại).
- Có trạng thái đang tải, không có dữ liệu, báo lỗi dễ hiểu, hộp thoại xác nhận khi xóa/hủy/đóng phiếu.
- Mọi nút hiển thị đều phải hoạt động.

**Menu chính:** Tổng quan · Lịch trực · Chấm công · Nghỉ phép/Đổi ca · Khiếm khuyết · Thiết bị · Nhân sự · Báo cáo · Thông báo · Quản trị (menu con chỉ hiện khi có quyền).

## 4. PHÂN QUYỀN (ĐƠN GIẢN, 4 VAI TRÒ CỐ ĐỊNH)

| Vai trò | Quyền chính |
|---|---|
| **Quản trị viên** | Tất cả; quản lý tài khoản, danh mục, xem nhật ký |
| **Quản lý phân xưởng** | Lập/duyệt/công bố lịch trực; duyệt nghỉ phép, đổi ca, điều chỉnh công; tiếp nhận, phân công, nghiệm thu khiếm khuyết; xem báo cáo |
| **Nhân viên** | Xem lịch của mình và của tổ; gửi đơn nghỉ phép/đổi ca/điều chỉnh công; tạo phiếu khiếm khuyết; xử lý phiếu được giao; xem thông báo |
| **Lãnh đạo (chỉ xem)** | Xem tổng quan, lịch, báo cáo, khiếm khuyết; không sửa dữ liệu |

Quy tắc: kiểm tra quyền **ở backend** cho mọi API (không chỉ ẩn nút ở giao diện); người dùng không tự nâng quyền; hành động quan trọng (duyệt, đổi trạng thái, sửa lịch đã công bố) được ghi vào nhật ký.

Mặc định: **khách chưa đăng nhập chỉ xem được danh sách và chi tiết khiếm khuyết (chỉ đọc), giống cổng hỗ trợ hiện có**; mọi thao tác khác cần đăng nhập. *(Cần tôi xác nhận.)*

## 5. DANH SÁCH TRANG (MỖI TRANG MỘT CHỨC NĂNG)

### Chung
1. `/dang-nhap` – Đăng nhập.
2. `/tong-quan` – **Dashboard duy nhất** của hệ thống (xem mục 6). *Không làm thêm dashboard riêng cho từng phân hệ.*
3. `/huong-dan` – Hướng dẫn sử dụng (văn bản ngắn).
4. `/thong-bao` – Danh sách thông báo; đánh dấu đã đọc; bấm để mở bản ghi liên quan.

### Lịch trực và chấm công
5. `/lich-truc` – **Lịch trực tháng**, dạng lưới như bảng lịch hiện có (xem mục 7).
6. `/lich-truc/chinh-sua` – Lập/chỉnh sửa lịch trực của một tháng (chỉ quản lý); có nút *Sao chép từ tháng trước*, *Lưu nháp*, *Công bố*.
7. `/cham-cong` – Bảng chấm công theo tháng (xem mục 8).
8. `/nghi-phep` – Danh sách đơn nghỉ phép và đổi ca của tôi (hoặc của tất cả nếu là quản lý); lọc theo trạng thái.
9. `/nghi-phep/tao-moi` – Form tạo đơn nghỉ phép / đổi ca.
10. `/nghi-phep/duyet` – Danh sách đơn chờ duyệt (chỉ quản lý): duyệt / từ chối kèm lý do. Gồm cả đề nghị điều chỉnh công.

### Cổng hỗ trợ khiếm khuyết
11. `/khiem-khuyet` – **Danh sách phiếu** (xem mục 9), có bộ lọc và tìm kiếm.
12. `/khiem-khuyet/tao-moi` – Form tạo phiếu.
13. `/khiem-khuyet/:id` – Chi tiết phiếu: thông tin, người phụ trách, lịch sử xử lý (timeline), nút hành động theo trạng thái và quyền.
14. `/khiem-khuyet/:id/phan-cong` – Tiếp nhận và phân công (chỉ quản lý).
15. `/khiem-khuyet/:id/cap-nhat` – Cập nhật tiến độ xử lý (người được giao).
16. `/khiem-khuyet/:id/nghiem-thu` – Nghiệm thu: đạt / không đạt (chỉ quản lý).
17. `/thiet-bi` – Danh sách thiết bị (lọc theo nhà máy, hệ thống).
18. `/thiet-bi/:id` – Chi tiết thiết bị và danh sách khiếm khuyết đã xảy ra trên thiết bị đó.

### Nhân sự
19. `/nhan-su` – Danh sách nhân sự (tìm theo tên, chức danh).
20. `/nhan-su/:id` – Hồ sơ nhân viên: xem/sửa thông tin, đổi tổ, đổi trạng thái làm việc, liên kết tài khoản.

### Báo cáo
21. `/bao-cao/cham-cong` – Báo cáo công tháng; xuất Excel, in.
22. `/bao-cao/khiem-khuyet` – Báo cáo khiếm khuyết; xuất Excel, in.

### Quản trị (chỉ Quản trị viên)
23. `/quan-tri/tai-khoan` – Quản lý tài khoản (tạo, khóa/mở khóa, đặt lại mật khẩu, gán vai trò).
24. `/quan-tri/to-cong-tac` – Quản lý tổ công tác (ví dụ: Tổ sửa chữa – bảo trì, Tổ xây dựng; tên cấu hình được).
25. `/quan-tri/ky-hieu-ca` – Quản lý ký hiệu ca/vị trí trực (SB2, SB4, Ô.thi, nghỉ…; màu hiển thị).
26. `/quan-tri/he-thong-thiet-bi` – Quản lý nhà máy, hệ thống thiết bị, thiết bị.
27. `/quan-tri/muc-do-uu-tien` – Mức độ ưu tiên và thời hạn xử lý mục tiêu.
28. `/quan-tri/nhat-ky` – Nhật ký hoạt động (ai làm gì, lúc nào); chỉ đọc.

## 6. TRANG TỔNG QUAN (`/tong-quan`) – CHỈ MỘT DASHBOARD

Gồm tối đa 4 khối, mỗi khối là thẻ riêng, bấm vào mở trang danh sách tương ứng:
- **Hàng thẻ số liệu:** Khiếm khuyết chưa đóng · Phiếu quá hạn · Phiếu chờ nghiệm thu · Đơn chờ duyệt.
- **Trực hôm nay:** ai trực ở SB2, ai trực ở SB4, lãnh đạo phân xưởng (lấy từ lịch trực đã công bố).
- **Khiếm khuyết theo tháng:** một biểu đồ cột (SB2 so với SB4).
- **Việc của tôi:** phiếu được giao cho tôi, lịch trực 7 ngày tới của tôi.

Mọi số liệu tính từ cơ sở dữ liệu thật.

## 7. LỊCH TRỰC THÁNG (`/lich-truc`)

Giống bảng lịch hiện có:
- Chọn tháng/năm; nút tháng trước/sau; nút *Xuất Excel*, *In*.
- Hàng = nhân viên; cột = các ngày trong tháng, ghi kèm thứ (T2…CN). Cột T7/CN tô nền khác.
- Bên trái: họ tên, **tổng công**, số công tại **SB2**, số công tại **SB4**.
- Mỗi ô ghi **ký hiệu** (SB2, SB4, Ô.thi…), tô màu theo ký hiệu. Ô đã điều chỉnh sau khi công bố hiển thị **chữ đỏ**.
- Hàng đầu: đánh dấu **X** ở những ngày có xe đưa ca.
- Các hàng cuối: **số người trực mỗi ngày tại SB2**, **tại SB4** và hàng **lãnh đạo phân xưởng trực**. Ngày thiếu người tô đỏ.
- Tổng công tự cộng từ các ô.

Trạng thái lịch: *Nháp → Đã công bố*. Sau khi công bố nếu sửa thì lưu: người sửa, thời gian, lý do, giá trị cũ; và gửi thông báo cho người bị ảnh hưởng.
*(Quy tắc phân ca theo từng đợt 3 ngày, số người tối thiểu mỗi nhà máy cần tôi xác nhận.)*

## 8. CHẤM CÔNG (`/cham-cong`)

- Mặc định, **công được tính từ lịch trực đã công bố** theo ký hiệu (mỗi ký hiệu có hệ số công do quản trị cấu hình).
- Quản lý có thể điều chỉnh công từng ngày; nhân viên gửi đề nghị điều chỉnh (lý do, minh chứng) ở trang đơn; quản lý duyệt ở `/nghi-phep/duyet`. Mọi thay đổi lưu lịch sử.
- Cuối tháng quản lý bấm **Chốt công**; sau khi chốt không sửa được trừ khi mở lại (ghi nhật ký).
- Chưa làm: nhập giờ vào/ra từ máy chấm công, nhập file Excel (để giai đoạn sau).

## 9. KHIẾM KHUYẾT

### 9.1. Danh sách (`/khiem-khuyet`) – giống cổng hỗ trợ hiện có
- Bộ lọc: Nhà máy (SB2/SB4), Hệ thống thiết bị, Mức độ ưu tiên, Người xử lý, Tình trạng, Từ ngày, Đến ngày, ô tìm kiếm (mã phiếu, nội dung, tên thiết bị, người phát hiện); nút *Tìm kiếm*, *Làm mới*, *Thêm khiếm khuyết*.
- Chọn số dòng/trang; phân trang.
- Cột hiển thị: STT · Mã phiếu · Người phát hiện · Nhà máy · Thiết bị · Mức độ · Ngày phát hiện · Tình trạng. (Nội dung, kết quả xem ở trang chi tiết.)
- Tình trạng có màu rõ ràng; phiếu quá hạn có nhãn đỏ.

### 9.2. Tạo phiếu
Trường: tiêu đề, ngày giờ phát hiện, người phát hiện (mặc định là người đăng nhập), nhà máy, hệ thống thiết bị, thiết bị, mô tả hiện tượng, mức độ ưu tiên, ảnh/tài liệu đính kèm, biện pháp tạm thời (nếu có). Trường bắt buộc đánh dấu *. Mã phiếu tự sinh, duy nhất (ví dụ `KK-2026-0001`).

**Khiếm khuyết tương tự:** khi chọn thiết bị, hiện bên cạnh danh sách tối đa 5 phiếu cũ của cùng thiết bị (mã, ngày, nguyên nhân, cách đã xử lý) để tham khảo.

### 9.3. Trạng thái (rút gọn)
**Mới tạo → Đã tiếp nhận (đã phân công) → Đang xử lý → Chờ nghiệm thu → Đã đóng.**
Trạng thái phụ: *Chờ vật tư*, *Tạm dừng*, *Từ chối tiếp nhận*, *Cần xử lý lại*, *Hủy*.
Backend chỉ cho chuyển trạng thái hợp lệ và đúng quyền. Không đóng phiếu nếu chưa nghiệm thu đạt. Mỗi lần đổi trạng thái lưu: ai, lúc nào, lý do.

### 9.4. Phân công (trang riêng)
Quản lý chọn tổ xử lý, người phụ trách, người phối hợp, thời hạn. Hạn mặc định lấy theo mức ưu tiên đã cấu hình.

### 9.5. Cập nhật tiến độ (trang riêng)
Người được giao nhập: nguyên nhân xác định, phương án khắc phục, công việc đã làm, vật tư sử dụng (tên, số lượng, đơn vị – chỉ ghi chú, không thay thế phần mềm kho), ảnh trước/sau. Mỗi lần cập nhật là **một dòng mới** trong timeline, không ghi đè dòng cũ.

### 9.6. Nghiệm thu (trang riêng)
Quản lý chọn *Đạt* (phiếu chuyển sang Đã đóng) hoặc *Không đạt* (nhập lý do, phiếu quay lại Đang xử lý).

### 9.7. Thiết bị
Danh sách thiết bị theo nhà máy và hệ thống (tua-bin, điều tốc, máy phát, kích từ, máy biến áp, đóng cắt, bảo vệ – đo lường, PLC/SCADA, dầu áp lực, khí nén, làm mát, nước kỹ thuật, cửa van, nguồn DC/UPS, thông tin liên lạc, khác). Danh mục có thể thêm/sửa/ngừng sử dụng ở trang quản trị. Trang chi tiết thiết bị cho thấy toàn bộ khiếm khuyết đã xảy ra để phát hiện lỗi lặp lại.

### 9.8. An toàn
Mức ưu tiên trên phần mềm **không thay thế** đánh giá an toàn và quy trình báo cáo sự cố chính thức của nhà máy. Hệ thống **không kết nối hay gửi lệnh** tới PLC, DCS, SCADA hay thiết bị bảo vệ.

## 10. NHÂN SỰ

- Danh sách toàn bộ nhân sự phân xưởng (lãnh đạo, tổ trưởng, tổ phó, kỹ thuật viên, nhân viên): họ tên, ngày sinh, giới tính, chức danh, tổ, trạng thái làm việc, liên hệ, có tài khoản hay chưa.
- Lãnh đạo phân xưởng không thuộc tổ nào.
- Không xóa cứng hồ sơ đã có dữ liệu; nghỉ việc thì chuyển sang "không còn hoạt động".

## 11. THÔNG BÁO (TRONG ỨNG DỤNG)

Gửi đúng người nhận khi: lịch trực được công bố hoặc thay đổi; đơn nghỉ phép/đổi ca/điều chỉnh công có kết quả; có đơn mới chờ duyệt (cho quản lý); có phiếu mới; phiếu được giao; phiếu đổi trạng thái; phiếu sắp/đã quá hạn; có yêu cầu nghiệm thu. Có chuông và số chưa đọc trên thanh trên. Chưa gửi email/Zalo (để lại chỗ mở rộng).

## 12. BÁO CÁO

- **Công tháng:** bảng công theo tháng và theo tổ, danh sách đơn chờ duyệt, thống kê nghỉ phép.
- **Khiếm khuyết:** số phiếu theo tháng / hệ thống / mức ưu tiên / tổ; phiếu quá hạn; tỷ lệ xử lý đúng hạn; thời gian xử lý trung bình; thiết bị lặp lại nhiều lần.
- Công thức mỗi chỉ số ghi rõ ngay trên trang báo cáo. Xuất Excel và in; việc xuất áp dụng đúng quyền xem.

## 13. CƠ SỞ DỮ LIỆU (MONGODB – MONGOOSE)

Collections: `users`, `employees`, `teams`, `shiftSymbols`, `schedules` (theo tháng, gồm các ô theo nhân viên và ngày), `scheduleChanges`, `attendanceRecords`, `requests` (nghỉ phép, đổi ca, điều chỉnh công; có trường loại và trạng thái), `plants`, `equipmentSystems`, `equipment`, `defectTickets`, `defectLogs` (timeline xử lý và đổi trạng thái), `defectAttachments`, `priorities`, `notifications`, `auditLogs`, `settings`.

Yêu cầu: mã phiếu duy nhất; có người tạo/sửa và thời gian; xóa mềm khi cần giữ lịch sử; chỉ mục cho các trường hay lọc (nhà máy, trạng thái, ngày, thiết bị, người xử lý); tránh ghi đè khi hai người sửa cùng lúc (dùng version của Mongoose); giá trị hay thay đổi (tổ, ký hiệu ca, mức ưu tiên, hạn xử lý) lưu trong cơ sở dữ liệu, không viết cứng trong mã.

## 14. BẢO MẬT

Băm mật khẩu bcrypt; giới hạn số lần đăng nhập sai; cookie httpOnly, bật HTTPS khi triển khai; chống NoSQL injection (kiểm tra dữ liệu đầu vào, không đưa trực tiếp object của người dùng vào truy vấn), chống XSS và CSRF; kiểm tra loại và dung lượng tệp tải lên; tệp không công khai; không để lộ lỗi nội bộ; khóa bí mật chỉ trong `.env`; không đưa dữ liệu thật của nhà máy lên kho mã công khai.

## 15. DỮ LIỆU MẪU VÀ KIỂM THỬ

Dữ liệu mẫu **hoàn toàn giả lập**: 2 nhà máy (SB2, SB4), 2 tổ, khoảng 15–20 nhân viên, lịch trực một tháng, khoảng 15–20 phiếu khiếm khuyết ở nhiều trạng thái, vài đơn nghỉ phép/đổi ca, một số thiết bị. Tài khoản demo cho mỗi vai trò, **chỉ dùng khi phát triển**; production phải tạo tài khoản quản trị mới với mật khẩu mạnh.

Phải thử và báo kết quả: đăng nhập/đăng xuất; phân quyền (thử truy cập trái phép bằng API); lập – công bố – sửa lịch trực; tính tổng công; tạo và duyệt đơn nghỉ phép; tạo phiếu → phân công → cập nhật → nghiệm thu không đạt → xử lý lại → nghiệm thu đạt → đóng; lịch sử trạng thái; thông báo; lọc và tìm kiếm; xuất Excel; tải tệp; giao diện điện thoại.

## 16. KẾ HOẠCH (MỖI GIAI ĐOẠN CHẠY ĐƯỢC VÀ THỬ XONG MỚI SANG GIAI ĐOẠN SAU)

1. **Nền tảng:** khởi tạo client/server, kết nối MongoDB, đăng nhập, phân quyền, bố cục chung (thanh trên + menu), trang Nhân sự, Tổ công tác.
2. **Khiếm khuyết:** danh mục nhà máy/thiết bị, danh sách (giống hình mẫu), tạo phiếu, chi tiết, phân công, cập nhật, nghiệm thu, thiết bị và lịch sử.
3. **Lịch trực:** ký hiệu ca, lưới lịch tháng, chỉnh sửa, công bố, lịch sử sửa.
4. **Chấm công và đơn từ:** bảng chấm công, nghỉ phép, đổi ca, điều chỉnh công, duyệt, chốt công.
5. **Hoàn thiện:** Tổng quan, thông báo, báo cáo và xuất Excel, nhật ký, hướng dẫn, kiểm thử tổng thể, tài liệu triển khai và sao lưu (`mongodump`).

*(Thứ tự giai đoạn 2 và 3 có thể đổi theo ý tôi.)*

## 17. BÀN GIAO

Mã nguồn client và server; `.env.example`; script tạo dữ liệu mẫu; `README.md` (cài đặt, chạy dev, build, triển khai); hướng dẫn sao lưu/phục hồi MongoDB; danh sách API ngắn gọn; `GIA_DINH.md` ghi các giả định đã dùng.

## 18. CHỈ THỊ BẮT ĐẦU

1. Trước tiên, trình bày **ngắn gọn** (không quá một trang): cấu trúc thư mục, các collection chính, các giả định cần tôi xác nhận.
2. **Hỏi tôi các điểm chưa rõ** (nếu có) rồi bắt đầu **Giai đoạn 1** bằng cách tạo file thật trong workspace, không chỉ trả lời bằng kế hoạch.
3. Sau mỗi giai đoạn: nói rõ cái gì đã chạy được, cái gì đã thử, cái gì chưa làm.
4. Không dùng dữ liệu thật, mật khẩu thật hay thông tin nhạy cảm trong mã nguồn hoặc dữ liệu mẫu.

Kết quả cuối cùng phải là một website chạy được, dùng được trên máy tính và điện thoại, không phải bản trình diễn tĩnh.
