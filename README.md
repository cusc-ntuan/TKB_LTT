# Thời khóa biểu

Website xem thời khóa biểu, hỗ trợ nhập dữ liệu từ Excel hoặc CSV.

Mã nguồn công khai: [cusc-ntuan/TKB_LTT](https://github.com/cusc-ntuan/TKB_LTT).

## Chạy

```bash
npm install
npm start
```

Toàn bộ mã JavaScript của server, API, script, kiểm thử và giao diện dùng ES Modules.

Ứng dụng yêu cầu kết nối Turso ở cả local lẫn production. Sao chép `.env.example` thành `.env`, sau đó điền `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN` từ database Turso của bạn. Không commit `.env` hoặc chia sẻ auth token. Ứng dụng sẽ báo lỗi và dừng khởi động nếu thiếu cấu hình hoặc URL không hợp lệ; không có SQLite local làm dự phòng.

Khi database Turso chưa có bảng/dữ liệu, ứng dụng khởi tạo cấu trúc và nạp dữ liệu mẫu từ `data/TKB.xlsx`. Database đã có dữ liệu sẽ được giữ nguyên.

### Biến môi trường tùy chọn

Các biến bên cạnh Turso trong `.env.example` là tùy chọn:

| Biến | Mục đích |
| --- | --- |
| `PORT`, `HOST` | Cổng và địa chỉ bind khi chạy server local. |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | Cho API `/api/analytics` đọc số liệu Web Analytics của project. Bật Web Analytics trên Vercel và dùng token có quyền truy cập project. |
| `VERCEL_TEAM_ID` | Chỉ cần nếu project thuộc team; có thể lấy trong cài đặt team Vercel. |
| `VERCEL_ANALYTICS_TOTAL` | Số người truy cập tổng dự phòng để hiển thị ở footer khi không lấy được từ Vercel API. Chỉ điền số; có thể dùng thay cho gọi API. |
| `GITHUB_FEEDBACK_TOKEN` | Bật gửi góp ý thành GitHub Issue cho `cusc-ntuan/TKB_LTT`. Cần token có quyền **Issues: Read and write** trên repository đó. |

`VERCEL_TOTAL_VISITORS`, `VERCEL_VISITOR_COUNT` và `VERCEL_VIEWERS_TOTAL` là tên thay thế cho `VERCEL_ANALYTICS_TOTAL`; nếu đặt nhiều biến, ứng dụng ưu tiên theo thứ tự trên.

Mở http://localhost:3000. Có thể đổi cổng bằng biến môi trường:

```bash
PORT=4000 npm start
```

Ứng dụng có manifest để trình duyệt hỗ trợ cài vào màn hình chính.

Trong lúc phát triển, dùng `npm run dev` để chạy server trên mọi interface mạng nội bộ và tự khởi động lại khi các file mã nguồn, giao diện hoặc dữ liệu thay đổi. Truy cập bằng `http://<IP-máy-chạy-server>:3001` từ thiết bị cùng mạng.

Chạy kiểm thử bằng `npm test`.

## Sử dụng

- Chọn chế độ xem theo lớp, giáo viên hoặc học sinh trực tiếp trên trang chính.
- Nút **Hôm nay** mở lịch trong ngày; bộ lọc có thể được sao chép thành liên kết chia sẻ.
- Có thể sao chép lịch, tải CSV hoặc in lịch đang hiển thị.
- Nhấn **Nhập Excel** để xem trước file và xác nhận trước khi thay toàn bộ dữ liệu hiện có trong database.
- Nhấn **Góp ý** ở cuối trang để gửi đề xuất hoặc báo lỗi; nội dung sẽ được tạo thành GitHub Issue công khai trong repository `cusc-ntuan/TKB_LTT`. Không gửi thông tin cá nhân hoặc dữ liệu nhạy cảm trong góp ý.

Để bật tính năng góp ý, cấu hình secret `GITHUB_FEEDBACK_TOKEN` trên môi trường triển khai. Dùng fine-grained personal access token chỉ cấp quyền **Issues: Read and write** cho repository `cusc-ntuan/TKB_LTT`. Token chỉ được dùng phía server và không được đưa vào mã frontend.

Các truy vấn đọc lặp lại được cache trong bộ nhớ server để giảm tải Turso. Cache được giới hạn tối đa 100 bộ lọc thời khóa biểu, hết hạn sau 30 giây và được xóa sau mỗi lần nhập dữ liệu.

Footer hiển thị số phiên đang trực tuyến dựa trên heartbeat mỗi 30 giây. Phiên không gửi heartbeat trong 90 giây sẽ được loại khỏi bộ đếm. Nếu biến môi trường `VERCEL_ANALYTICS_TOTAL` (hoặc `VERCEL_TOTAL_VISITORS`, `VERCEL_VISITOR_COUNT`, `VERCEL_VIEWERS_TOTAL`) được đặt trên Vercel, ứng dụng còn hiển thị số người đã từng xem trong footer. Nếu chưa cấu hình, nhãn sẽ là `—` để tránh hiển thị sai số.

## File Excel

Trang nhập hỗ trợ workbook `.xlsx` và file `.csv`; định dạng Excel `.xls` cũ cần được lưu lại thành `.xlsx` hoặc `.csv` trước khi nhập.

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

Nhấn **Nhập Excel** trên website để thay toàn bộ dữ liệu trong database.

## API

| Phương thức | Đường dẫn | Mô tả |
| --- | --- | --- |
| GET | `/api/stats` | Thống kê số tiết, lớp, giáo viên và phòng |
| GET | `/api/filters` | Danh sách giá trị dùng cho bộ lọc |
| GET | `/api/lessons` | Lấy thời khóa biểu theo query filter |
| GET | `/api/data-status` | Thời điểm nhập dữ liệu thời khóa biểu gần nhất |
| POST | `/api/import/preview` | Phân tích file Excel/CSV và trả bản xem trước, không ghi database |
| POST | `/api/import` | Nhập file Excel/CSV với field `file` |
| POST | `/api/presence` | Cập nhật heartbeat và nhận số phiên trực tuyến |
| POST | `/api/feedback` | Tạo GitHub Issue từ góp ý gửi qua website |

Ví dụ:

```text
/api/lessons?lop=10A&buoi=Sáng
```

## Deploy Vercel

Trên Vercel, thêm hai biến bắt buộc sau trong **Project → Settings → Environment Variables**:

| Biến | Giá trị |
| --- | --- |
| `TURSO_DATABASE_URL` | URL database Turso, thường bắt đầu bằng `libsql://` |
| `TURSO_AUTH_TOKEN` | Auth Token đọc/ghi của database |

Thêm biến cho mọi môi trường cần dùng (Production, Preview hoặc Development), rồi redeploy để áp dụng. URL phải bắt đầu bằng `libsql://` hoặc `https://`. Không commit token vào Git. Các lần **Nhập Excel** ghi vào Turso nên dữ liệu vẫn tồn tại khi Vercel thay instance. Nếu database Turso đã có dữ liệu, khởi động ứng dụng sẽ không ghi đè bằng workbook mẫu.

Các log server ghi nhận kết quả khởi tạo database và nhập dữ liệu (số dòng, thời gian, trạng thái); không ghi URL, token hay nội dung từng dòng.

Bật **Web Analytics** trong Vercel Project Settings để xem số người truy cập. Ứng dụng đã nhúng script `/_vercel/insights/script.js` trên trang chính.
