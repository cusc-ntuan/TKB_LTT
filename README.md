# Thời khóa biểu THPT Chuyên Lý Tự Trọng

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-success" alt="Live status" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/Express.js-5-000000?logo=express&logoColor=white" alt="Express.js 5" />
  <img src="https://img.shields.io/badge/Database-Turso-0A7A5C" alt="Turso database" />
  <img src="https://img.shields.io/badge/License-Internal-lightgrey" alt="Internal project" />
</p>

Website tra cứu thời khóa biểu theo lớp, giáo viên và học sinh, đồng thời cung cấp khu vực quản trị riêng để nhập và đồng bộ dữ liệu từ trường.

- Live: https://xemtkb.io.vn
- GitHub: https://github.com/cusc-ntuan/TKB_LTT

## Tổng quan

Dự án này giúp người dùng tra cứu lịch học nhanh chóng, dễ dàng và trực quan trên web. Người quản trị có thể cập nhật dữ liệu qua giao diện `/import`, hỗ trợ nhập từ file Excel, CSV hoặc JSON mà không cần thao tác thủ công trên database.

## Tính năng chính

- Tra cứu thời khóa biểu theo lớp, giáo viên hoặc học sinh
- Chuyển đổi giữa chế độ xem theo tuần và xem theo ngày
- Chia sẻ bộ lọc qua URL để gửi cho người khác
- In hoặc sao chép lịch đang hiển thị
- Gửi góp ý qua GitHub Issue
- Quản trị riêng tại `/import` để nhập dữ liệu từ Excel, CSV hoặc JSON
- Tách biệt rõ ràng giữa giao diện công khai và giao diện quản trị

## Cấu trúc thư mục

- `public/` — giao diện người dùng và trang quản trị `/import`
- `src/` — server, route, API, xác thực admin và xử lý dữ liệu
- `data/` — dữ liệu mẫu và tài liệu hỗ trợ import
- `test/` — các bài kiểm thử tự động
- `scripts/` — các script hỗ trợ build và asset management

## Yêu cầu hệ thống

- Node.js 18+
- npm
- Database Turso
- File `.env` theo mẫu `.env.example`

## Cài đặt

```bash
npm install
cp .env.example .env
```

Sau đó cấu hình các biến môi trường cần thiết:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=your-random-secret
```

## Chạy ứng dụng

Chạy ở môi trường production:

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
| `TURSO_DATABASE_URL` | URL database Turso dùng lưu dữ liệu thời khóa biểu |
| `TURSO_AUTH_TOKEN` | Token quyền truy cập database Turso |
| `ADMIN_USERNAME` | Tài khoản admin đăng nhập vào `/import` |
| `ADMIN_PASSWORD` | Mật khẩu admin đăng nhập vào `/import` |
| `ADMIN_SESSION_SECRET` | Secret dùng ký phiên đăng nhập admin |

### Tùy chọn

| Biến | Mục đích |
| --- | --- |
| `PORT`, `HOST` | Cổng và host khi chạy local |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | Hỗ trợ analytics trên Vercel |
| `VERCEL_TEAM_ID` | Dùng nếu project thuộc team Vercel |
| `VERCEL_ANALYTICS_TOTAL` | Số lượt xem dự phòng nếu API analytics không phản hồi |
| `ADMIN_COOKIE_NAME` | Tên cookie phiên admin |
| `GITHUB_FEEDBACK_TOKEN` | Gửi góp ý lên GitHub Issue |

## Trang công khai

- Chọn chế độ xem theo lớp, giáo viên hoặc học sinh
- Chia sẻ bộ lọc qua URL để gửi cho người khác
- Hỗ trợ xem cả tuần hoặc xem theo ngày
- Có thể in hoặc sao chép lịch hiện tại

## Trang quản trị `/import`

- Không hiển thị trên trang chủ
- Yêu cầu đăng nhập admin trước khi truy cập
- Hỗ trợ:
  - nhập dữ liệu từ Excel/CSV
  - nhập dữ liệu từ JSON của trường
  - xem trước dữ liệu trước khi ghi vào database
  - xác nhận trước khi thay thế dữ liệu hiện có

## Định dạng dữ liệu đầu vào

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
| GET | `/api/stats` | Lấy thống kê về số tiết, lớp, giáo viên |
| GET | `/api/filters` | Lấy danh sách bộ lọc |
| GET | `/api/lessons` | Truy xuất thời khóa biểu theo filter |
| GET | `/api/data-status` | Kiểm tra thời điểm dữ liệu gần nhất |
| GET | `/api/import/versions` | Lấy danh sách phiên bản JSON |
| POST | `/api/import/json` | Nhập dữ liệu JSON |
| POST | `/api/import` | Nhập file Excel/CSV |
| POST | `/api/presence` | Gửi heartbeat số người trực tuyến |
| POST | `/api/feedback` | Tạo GitHub Issue từ góp ý |

## Triển khai trên Vercel

Trên Vercel, cần cấu hình các biến môi trường sau:

| Biến | Giá trị |
| --- | --- |
| `TURSO_DATABASE_URL` | URL kết nối Turso |
| `TURSO_AUTH_TOKEN` | Token quyền đọc/ghi database |

Sau đó thực hiện redeploy. Nếu database Turso đã có dữ liệu, ứng dụng sẽ giữ nguyên dữ liệu hiện có và không ghi đè bằng dữ liệu mẫu.

## SEO và bảo mật

- Trang công khai `/` có thể được crawler index
- Trang quản trị `/import` và các endpoint `/api/*` bị chặn trong `robots.txt`
- File `sitemap.xml` chứa URL trang chính
- Không commit file `.env` vào mã nguồn
- Không chia sẻ token hoặc secret trong repository
- `ADMIN_PASSWORD` và `ADMIN_SESSION_SECRET` nên sử dụng giá trị mạnh, riêng tư
- Token GitHub feedback chỉ được sử dụng ở phía server

## Ghi chú

Dự án này được phát triển nhằm hỗ trợ quản lý và tra cứu thời khóa biểu nội bộ của trường một cách nhanh chóng, minh bạch và dễ duy trì.
