# Thời khóa biểu THPT Chuyên Lý Tự Trọng, Cần Thơ

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-success" alt="Live" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/Express.js-5-000000?logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/Database-Turso-0A7A5C" alt="Turso" />
</p>

Web app tra cứu thời khóa biểu theo lớp, giáo viên và học sinh, với giao diện sạch, nhanh và dễ dùng.

- Live: https://xemtkb.io.vn
- Repo: https://github.com/cusc-ntuan/TKB_LTT

## Features

- Tìm lịch học theo lớp, giáo viên hoặc học sinh
- Xem theo tuần hoặc theo ngày
- Chia sẻ bộ lọc qua URL
- In / sao chép lịch hiện tại
- Trang quản trị `/import` để nhập dữ liệu từ Excel, CSV hoặc JSON
- Hỗ trợ analytics và gửi góp ý qua GitHub Issue

## Stack

- Node.js + Express.js
- Turso Database
- Static frontend + server-side API
- PWA-ready web app

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Required env vars:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=your-random-secret
```

## Project structure

```bash
public/   # frontend
src/      # server + routes + logic
data/     # sample/import data
test/     # automated tests
```

## Notes

This project is designed for internal school timetable management and public lookup in a simple, efficient workflow.
