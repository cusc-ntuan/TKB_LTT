# Thời khóa biểu

Website xem thời khóa biểu, hỗ trợ nhập dữ liệu từ Excel hoặc CSV.

Mã nguồn công khai: [cusc-ntuan/TKB_LTT](https://github.com/cusc-ntuan/TKB_LTT).

## Chạy

```bash
npm install
npm start
```

Toàn bộ mã JavaScript của server, API, script, kiểm thử và giao diện dùng ES Modules.

Dữ liệu mẫu được đọc từ `data/TKB.xlsx` khi khởi tạo database.

Mở http://localhost:3001. Có thể đổi cổng bằng biến môi trường:

```bash
PORT=4000 npm start
```

Ứng dụng là PWA: mở bằng `localhost` hoặc HTTPS để trình duyệt cho phép cài đặt vào màn hình chính. Service worker lưu shell giao diện và dùng dữ liệu API đã cache khi tạm thời mất mạng.

Trong lúc phát triển, dùng `npm run dev` để chạy server trên mọi interface mạng nội bộ và tự khởi động lại khi các file mã nguồn, giao diện hoặc dữ liệu thay đổi. Truy cập bằng `http://<IP-máy-chạy-server>:3001` từ thiết bị cùng mạng.

Chạy kiểm thử bằng `npm test`.

## Sử dụng

- Chọn chế độ xem theo lớp, giáo viên hoặc học sinh trực tiếp trên trang chính.
- Có thể lọc thêm theo buổi hoặc tìm kiếm theo môn học, giáo viên, phòng và ghi chú.
- Nhấn **Nhập Excel** để thay toàn bộ dữ liệu hiện có trong SQLite.

Các truy vấn đọc lặp lại được cache trong bộ nhớ server để giảm tải SQLite. Cache được giới hạn tối đa 100 bộ lọc thời khóa biểu và tự xóa sau mỗi lần nhập dữ liệu.

Footer hiển thị số phiên đang trực tuyến dựa trên heartbeat mỗi 30 giây. Phiên không gửi heartbeat trong 90 giây sẽ được loại khỏi bộ đếm. Nếu biến môi trường `VERCEL_ANALYTICS_TOTAL` (hoặc `VERCEL_TOTAL_VISITORS`, `VERCEL_VISITOR_COUNT`, `VERCEL_VIEWERS_TOTAL`) được đặt trên Vercel, ứng dụng còn hiển thị số người đã từng xem trong footer. Nếu chưa cấu hình, nhãn sẽ là `—` để tránh hiển thị sai số.

## File Excel

Workbook có thể chứa sheet lịch chi tiết theo học sinh hoặc sheet ma trận theo lớp. Ứng dụng ưu tiên sheet có đủ `Họ và Tên`, `Lớp`, `Thứ` và `Tiết`; nếu không có, ứng dụng sẽ đọc sheet ma trận `Thứ`/`Buổi`/`Tiết`:

| Cột | Ý nghĩa |
| --- | --- |
| Lớp | Lớp |
| Họ và Tên | Học sinh / người học |
| Thứ | Thứ 2 … Thứ 7 |
| Buổi | Sáng / Chiều |
| Tiết | Số tiết |
| Môn Học | Môn |
| Phòng Học | Phòng |
| giáo viên | Giáo viên |
| Loại tiết | Lý thuyết, thực hành… |
| Ghi chú | Ghi chú |

Nhấn **Nhập Excel** trên website để thay toàn bộ dữ liệu trong SQLite.

## API

| Phương thức | Đường dẫn | Mô tả |
| --- | --- | --- |
| GET | `/api/stats` | Thống kê số tiết, lớp, giáo viên và phòng |
| GET | `/api/filters` | Danh sách giá trị dùng cho bộ lọc |
| GET | `/api/lessons` | Lấy thời khóa biểu theo query filter |
| POST | `/api/import` | Nhập file Excel/CSV với field `file` |
| POST | `/api/presence` | Cập nhật heartbeat và nhận số phiên trực tuyến |

Ví dụ:

```text
/api/lessons?lop=10A&buoi=Sáng
```

## Deploy Vercel

Vercel chạy SQLite trong `/tmp` và tự khởi tạo dữ liệu từ `data/TKB.xlsx` khi tạo instance mới. File Excel mẫu được đóng gói cùng source, còn dữ liệu import qua giao diện không được lưu bền vững sau khi instance bị thay thế hoặc khởi động lại. Nếu cần lưu dữ liệu lâu dài trên Vercel, hãy chuyển sang dịch vụ database bên ngoài như Turso hoặc Vercel Postgres.

Bật **Web Analytics** trong Vercel Project Settings để xem số người truy cập. Ứng dụng đã nhúng script `/_vercel/insights/script.js` trên trang chính.
