# Thời khóa biểu THPT Chuyên Lý Tự Trọng

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-success" alt="Live status" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/Database-Turso-0A7A5C" alt="Turso database" />
  <img src="https://img.shields.io/badge/License-Internal-lightgrey" alt="Internal project" />
</p>

Website tra cứu thời khóa biểu theo lớp, giáo viên và học sinh, đồng thời có khu vực quản trị riêng để nhập và đồng bộ dữ liệu từ trường.

- Live: https://xemtkb.io.vn
- GitHub: https://github.com/cusc-ntuan/TKB_LTT

## Tính năng nổi bật

- Tra cứu thời khóa biểu theo lớp, giáo viên hoặc học sinh
- Chuyển đổi giữa xem cả tuần và xem theo ngày
- Chia sẻ bộ lọc qua URL để gửi cho người khác
- In lịch hoặc sao chép lịch đang hiển thị
- Gửi góp ý qua GitHub Issue
- Quản trị riêng tại `/import` để nhập dữ liệu Excel/CSV hoặc JSON
- Tách biệt hoàn toàn trang công khai và trang admin

## Cấu trúc ứng dụng

- `public/` — giao diện người dùng và trang admin `/import`
- `src/` — server, route, API, auth admin, xử lý dữ liệu
- `data/` — dữ liệu mẫu và tài liệu hỗ trợ import
- `test/` — các kiểm thử tự động

## Yêu cầu

- Node.js 18+
- npm
- Database Turso
- File `.env` theo mẫu `.env.example`

## Cài đặt nhanh

```bash
npm install
cp .env.example .env
```

Cấu hình biến môi trường bắt buộc:

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

Chế độ phát triển:

```bash
npm run dev
```

Chạy kiểm thử:

```bash
npm test
```

## Biến môi trường

### Bắt buộc

| Biến | Mục đích |
| --- | --- |
| `TURSO_DATABASE_URL` | URL database Turso lưu dữ liệu thời khóa biểu |
| `TURSO_AUTH_TOKEN` | Token đọc/ghi database Turso |
| `ADMIN_USERNAME` | Tài khoản admin đăng nhập vào `/import` |
| `ADMIN_PASSWORD` | Mật khẩu admin đăng nhập vào `/import` |
| `ADMIN_SESSION_SECRET` | Secret ký phiên đăng nhập admin |

### Tùy chọn

| Biến | Mục đích |
| --- | --- |
| `PORT`, `HOST` | Cổng và host khi chạy local |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | Hỗ trợ API analytics trên Vercel |
| `VERCEL_TEAM_ID` | Dùng nếu project thuộc team Vercel |
| `VERCEL_ANALYTICS_TOTAL` | Số lượt xem dự phòng nếu API không phản hồi |
| `ADMIN_COOKIE_NAME` | Tên cookie phiên admin |
| `GITHUB_FEEDBACK_TOKEN` | Gửi góp ý lên GitHub Issue |

## Trang công khai

- Chọn chế độ xem theo lớp, giáo viên hoặc học sinh
- Có thể chia sẻ bộ lọc qua URL
- Hỗ trợ xem cả tuần hoặc theo ngày
- Có thể in và sao chép lịch hiện tại

## Trang quản trị `/import`

- Không hiển thị trên trang chủ
- Yêu cầu đăng nhập admin trước khi truy cập
- Hỗ trợ:
  - nhập dữ liệu từ Excel/CSV
  - nhập dữ liệu từ JSON của trường
  - xem trước dữ liệu trước khi ghi DB
  - xác nhận thay thế dữ liệu hiện có

## Dữ liệu đầu vào

### Excel / CSV

Trang import hỗ trợ file `.xlsx` và `.csv`.

### JSON

Khi nhập JSON, cần:

- nhập URL thư mục dữ liệu hoặc URL `versions.json`
- chọn phiên bản do trường phát hành
- xác nhận trước khi ghi vào database

## API chính

| Phương thức | Đường dẫn | Mô tả |
| --- | --- | --- |
| GET | `/api/stats` | Thống kê số tiết, lớp, giáo viên |
| GET | `/api/filters` | Lấy danh sách bộ lọc |
| GET | `/api/lessons` | Truy xuất thời khóa biểu theo filter |
| GET | `/api/data-status` | Thời điểm dữ liệu gần nhất |
| GET | `/api/import/versions` | Lấy danh sách phiên bản JSON |
| POST | `/api/import/json` | Nhập dữ liệu JSON |
| POST | `/api/import` | Nhập file Excel/CSV |
| POST | `/api/presence` | Heartbeat số người trực tuyến |
| POST | `/api/feedback` | Tạo GitHub Issue từ góp ý |

## Triển khai Vercel

Trên Vercel cần cấu hình các biến môi trường sau:

| Biến | Giá trị |
| --- | --- |
| `TURSO_DATABASE_URL` | URL kết nối Turso |
| `TURSO_AUTH_TOKEN` | Token quyền đọc/ghi database |

Sau đó redeploy. Nếu database Turso đã có dữ liệu, app sẽ giữ nguyên dữ liệu hiện có và không ghi đè bằng dữ liệu mẫu.

## SEO

- Trang công khai `/` được phép index bởi crawler
- Trang quản trị `/import` và `/api/*` bị chặn trong `robots.txt`
- File `sitemap.xml` chứa URL trang chính

## Bảo mật

- Không commit `.env`
- Không chia sẻ token hoặc secret vào mã nguồn
- `ADMIN_PASSWORD` và `ADMIN_SESSION_SECRET` nên dùng giá trị mạnh, riêng tư
- Token GitHub feedback chỉ được sử dụng ở server

## Ghi chú

Dự án này được phát triển cho mục đích quản lý và tra cứu thời khóa biểu nội bộ của trường.
