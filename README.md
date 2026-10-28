# Thời khóa biểu THPT Chuyên Lý Tự Trọng

Website tra cứu thời khóa biểu theo lớp, giáo viên và học sinh, đồng thời có khu vực quản trị riêng để nhập và đồng bộ dữ liệu từ trường.

Trang web chính: https://xemtkb.io.vn

Mã nguồn: https://github.com/cusc-ntuan/TKB_LTT

## Tính năng chính

- Tra cứu thời khóa biểu theo lớp, giáo viên hoặc học sinh.
- Chuyển đổi giữa xem cả tuần và xem theo ngày.
- Chia sẻ link bộ lọc hiện tại.
- In lịch và sao chép lịch đang hiển thị.
- Gửi góp ý qua GitHub Issue.
- Quản trị riêng tại `/import` để nhập dữ liệu từ Excel/CSV hoặc đồng bộ JSON từ trường.
- Quản trị yêu cầu đăng nhập admin, tách biệt hoàn toàn với trang tìm kiếm thời khóa biểu công khai.

## Yêu cầu hệ thống

- Node.js 18+
- npm
- Database Turso
- File `.env` cấu hình theo mẫu `.env.example`

## Cài đặt

```bash
npm install
cp .env.example .env
```

Sau đó điền các biến môi trường cần thiết, ví dụ:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=your-random-secret
```

Khởi động ứng dụng:

```bash
npm start
```

Chạy ở chế độ dev:

```bash
npm run dev
```

Chạy test:

```bash
npm test
```

## Biến môi trường

### Bắt buộc

| Biến | Mục đích |
| --- | --- |
| `TURSO_DATABASE_URL` | URL database Turso để lưu dữ liệu thời khóa biểu. |
| `TURSO_AUTH_TOKEN` | Token đọc/ghi cho database Turso. |
| `ADMIN_USERNAME` | Tài khoản admin đăng nhập vào `/import`. |
| `ADMIN_PASSWORD` | Mật khẩu admin đăng nhập vào `/import`. |
| `ADMIN_SESSION_SECRET` | Secret ký phiên đăng nhập admin. |

### Tùy chọn

| Biến | Mục đích |
| --- | --- |
| `PORT`, `HOST` | Cổng và địa chỉ bind khi chạy local. |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | Hỗ trợ `/api/analytics` đọc Web Analytics trên Vercel. |
| `VERCEL_TEAM_ID` | Cần khi project thuộc team Vercel. |
| `VERCEL_ANALYTICS_TOTAL` | Số lượt xem dự phòng nếu API Vercel không phản hồi. |
| `ADMIN_COOKIE_NAME` | Tên cookie phiên admin; mặc định là `tkb_admin_session`. |
| `GITHUB_FEEDBACK_TOKEN` | Bật gửi góp ý thành GitHub Issue. Cần quyền Issues: Read and write cho repo `cusc-ntuan/TKB_LTT`. |

Các biến thay thế cho `VERCEL_ANALYTICS_TOTAL` gồm: `VERCEL_TOTAL_VISITORS`, `VERCEL_VISITOR_COUNT`, `VERCEL_VIEWERS_TOTAL`.

## Cấu trúc dự án

- `src/server.js` — khởi tạo Express server.
- `src/lib/` — logic dữ liệu, auth, analytics, import, validation.
- `src/routes/` — route server và API.
- `public/` — giao diện người dùng web, bao gồm cả trang công khai và trang admin `/import`.
- `data/` — dữ liệu mẫu và tài liệu hỗ trợ. 
- `test/` — các test tự động của dự án.

## Sử dụng ứng dụng

### Trang công khai

- Chọn chế độ xem theo lớp, giáo viên hoặc học sinh.
- Có thể chia sẻ bộ lọc qua URL.
- Nút **Hôm nay** chuyển tới ngày hợp lệ theo dữ liệu.
- Có thể in lịch hoặc sao chép lịch hiện tại.

### Trang quản trị `/import`

- Route `/import` là trang riêng dành cho admin.
- Truy cập cần đăng nhập bằng tài khoản admin.
- Khi đã đăng nhập, admin có thể:
  - nhập dữ liệu từ file Excel/CSV
  - nhập dữ liệu từ nguồn JSON của trường
  - xem trước dữ liệu trước khi ghi database
  - xác nhận thay thế toàn bộ dữ liệu hiện có

### Góp ý

Nhấn **Góp ý** ở footer để gửi đề xuất hoặc báo lỗi. Nội dung sẽ được tạo thành GitHub Issue công khai trong repo `cusc-ntuan/TKB_LTT`.

Không gửi dữ liệu cá nhân nhạy cảm trong góp ý.

## File Excel/CSV

Trang nhập hỗ trợ file `.xlsx` và `.csv`.

Các sheet có thể là:

- bảng thời khóa biểu theo học sinh
- bảng ma trận theo lớp hoặc theo ngày, buổi, tiết

Ứng dụng ưu tiên các cột như: `Họ và Tên`, `Lớp`, `Thứ`, `Buổi`, `Tiết`, `Môn Học`.

## JSON import

Khi nhập dữ liệu JSON, cần:

- nhập URL thư mục dữ liệu hoặc URL `versions.json`
- chọn phiên bản do trường phát hành
- xác nhận trước khi ghi dữ liệu vào database

URL nguồn phải là HTTPS và trỏ tới nguồn dữ liệu công khai đáng tin cậy.

## API chính

| Phương thức | Đường dẫn | Mô tả |
| --- | --- | --- |
| GET | `/api/stats` | Thống kê số tiết, lớp, giáo viên |
| GET | `/api/filters` | Lấy danh sách giá trị bộ lọc |
| GET | `/api/lessons` | Truy xuất thời khóa biểu theo filter |
| GET | `/api/data-status` | Trạng thái thời điểm dữ liệu gần nhất |
| GET | `/api/import/versions` | Lấy danh sách phiên bản từ URL dữ liệu JSON |
| GET | `/api/import/preview` | Xem trước dữ liệu JSON trước khi nhập |
| POST | `/api/import/json` | Nhập dữ liệu JSON vào database |
| POST | `/api/import/preview` | Phân tích file Excel/CSV trước khi ghi |
| POST | `/api/import` | Nhập file Excel/CSV vào database |
| POST | `/api/presence` | Heartbeat số người trực tuyến |
| POST | `/api/feedback` | Tạo issue góp ý trên GitHub |

## Triển khai Vercel

Trên Vercel cần cấu hình các biến môi trường sau:

| Biến | Giá trị |
| --- | --- |
| `TURSO_DATABASE_URL` | URL kết nối Turso, bắt đầu bằng `libsql://` hoặc `https://` |
| `TURSO_AUTH_TOKEN` | Token quyền đọc/ghi database |

Sau đó redeploy. Khi database Turso đã có dữ liệu, ứng dụng sẽ giữ nguyên dữ liệu hiện có và không ghi đè bằng dữ liệu mẫu.

## SEO

- Trang công khai `/` được phép index bởi crawler.
- Trang quản trị `/import` và API `/api/*` bị chặn crawl trong `robots.txt`.
- File `sitemap.xml` chứa URL trang chính để hỗ trợ indexing.

## Bảo mật

- Không commit file `.env`.
- Không chia sẻ token hoặc secret vào mã nguồn.
- `ADMIN_SESSION_SECRET` và `ADMIN_PASSWORD` nên dùng giá trị mạnh, riêng tư.
- Token GitHub feedback chỉ được sử dụng ở server, không hiển thị lên frontend.

## Ghi chú

Dự án này được phát triển cho mục đích quản lý và tra cứu thời khóa biểu nội bộ của trường.
