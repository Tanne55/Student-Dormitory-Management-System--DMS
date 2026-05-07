# QLKTX — Hệ thống Quản lý Ký túc xá

> Nền tảng số hóa toàn diện cho ký túc xá sinh viên: đăng ký nội trú, hợp đồng, check-in/out, điện nước, hóa đơn, sửa chữa và thông báo trên cùng một hệ thống.
>
> _A full-stack dormitory management platform for student housing: applications, contracts, check-in/out, utilities, invoices, maintenance and notifications — all in one place._

---

## Mục lục / Table of Contents

- [Tổng quan / Overview](#tổng-quan--overview)
- [Tính năng chính / Features](#tính-năng-chính--features)
- [Kiến trúc & Tech stack](#kiến-trúc--tech-stack)
- [Cấu trúc thư mục / Project Structure](#cấu-trúc-thư-mục--project-structure)
- [Yêu cầu hệ thống / Requirements](#yêu-cầu-hệ-thống--requirements)
- [Cấu hình môi trường / Environment Variables](#cấu-hình-môi-trường--environment-variables)
- [Cài đặt & chạy / Getting Started](#cài-đặt--chạy--getting-started)
- [Database & Migrations](#database--migrations)
- [Các route chính / Main Routes](#các-route-chính--main-routes)
- [Ghi chú phát triển / Development Notes](#ghi-chú-phát-triển--development-notes)
- [License](#license)

---

## Tổng quan / Overview

**QLKTX** (viết tắt của *Quản Lý Ký Túc Xá*) là ứng dụng web dạng **monorepo** gồm hai phần:

- [`backend/`](backend/) — REST API viết bằng **NestJS 11** + **TypeORM** + **MySQL 8**, có tài liệu Swagger tại `/api`.
- [`frontend/`](frontend/) — Web client viết bằng **Next.js 16** (App Router) + **React 19** + **TailwindCSS 4**.

Hệ thống phục vụ ba nhóm người dùng (xem [`backend/src/modules/auth/entities/account.entity.ts`](backend/src/modules/auth/entities/account.entity.ts)):

| Vai trò / Role | Quyền chính |
|---|---|
| `student` | Đăng ký nội trú, xem hồ sơ, gửi báo cáo sự cố, xem & thanh toán hóa đơn, xin gia hạn phòng. |
| `staff`   | Duyệt đơn vào/gia hạn KTX, xếp phòng (check-in), trả phòng (check-out), xử lý sự cố, ghi chỉ số điện/nước, thu hóa đơn. |
| `admin`   | Toàn quyền nghiệp vụ + quản lý tòa/tầng/phòng, nhân viên, cấu hình hệ thống và xem nhật ký kiểm toán. |

> **EN.** QLKTX is a monorepo combining a NestJS REST API and a Next.js web client. It supports three roles (`student`, `staff`, `admin`) with role-based dashboards.

---

## Tính năng chính / Features

Bám theo các module nghiệp vụ trong [`backend/src/app.module.ts`](backend/src/app.module.ts) và các thẻ chức năng trên [`frontend/app/dashboard/page.tsx`](frontend/app/dashboard/page.tsx):

### Sinh viên / Student
- Đăng ký nội trú online (`/register-student`).
- Xem hồ sơ cá nhân, tình trạng lưu trú và liên lạc.
- Gửi báo cáo sự cố điện nước / cơ sở vật chất (repair requests).
- Xem hóa đơn điện nước theo tháng & lịch sử thanh toán.
- Đăng ký gia hạn phòng (dorm extensions).

### Cán bộ quản lý / Staff
- Duyệt đơn xin vào lưu trú và đơn gia hạn.
- Xếp phòng (**check-in**) — tự động lập hợp đồng.
- Trả phòng (**check-out**) — thanh lý hợp đồng, giải phóng phòng.
- Quản lý ticket sự cố từ sinh viên.
- Quét phòng và nhập chỉ số điện/nước hàng loạt (utility readings).
- Thu tiền và xuất hóa đơn.

### Quản trị viên / Admin
- Khai báo hệ thống tòa nhà & tầng (buildings, floors).
- Quản lý phòng và cấu hình phòng.
- Quản lý & phân quyền nhân viên BQL.
- Cấu hình tham số hệ thống (phí dịch vụ, giá điện/nước…).
- Xem nhật ký thao tác (audit logs) và dashboard analytics.

### Hạ tầng / Platform
- **Auth**: đăng ký / đăng nhập / quên mật khẩu / đặt lại mật khẩu (JWT Bearer).
- **Notifications**: thông báo nội bộ với chuông realtime ([`frontend/components/NotificationBell.tsx`](frontend/components/NotificationBell.tsx)).
- **Documents**: tạo & tải PDF (pdfmake) — xem [`frontend/lib/pdfDownload.ts`](frontend/lib/pdfDownload.ts).
- **Mail**: scaffold gửi mail qua SMTP (nodemailer).
- **VNPay**: scaffold tích hợp cổng thanh toán VNPay (sandbox/production).

---

## Kiến trúc & Tech stack

### Backend — `backend/`
- [NestJS 11](https://nestjs.com/) — framework Node.js theo module/DI.
- **TypeORM 0.3** + **mysql2** — ORM cho MySQL 8 (xem [`backend/src/database/database.config.ts`](backend/src/database/database.config.ts)).
- **JWT auth**: `@nestjs/jwt` + `passport-jwt` với guard toàn cục `JwtAuthGuard` và `RolesGuard` (xem [`backend/src/app.module.ts`](backend/src/app.module.ts)).
- **bcrypt** — hash mật khẩu.
- **Swagger** (`@nestjs/swagger`) — UI tại `http://localhost:3001/api`.
- **pdfmake** — sinh PDF (hợp đồng, hóa đơn).
- **nodemailer** — gửi mail SMTP.
- **class-validator / class-transformer** — DTO validation.

### Frontend — `frontend/`
- [Next.js 16](https://nextjs.org/) (App Router) + **React 19**.
- **TailwindCSS 4** + Material 3 design tokens (palette tùy biến trong [`frontend/app/globals.css`](frontend/app/globals.css)).
- **Recharts** — biểu đồ trong dashboard.
- **lucide-react** + **Material Symbols Outlined** — icon set.
- Font **Be Vietnam Pro** + **Geist** (`next/font/google`).
- Helper API & auth: [`frontend/lib/api.ts`](frontend/lib/api.ts), [`frontend/lib/auth.ts`](frontend/lib/auth.ts).

---

## Cấu trúc thư mục / Project Structure

```
QliKTX/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── app.module.ts       # Module gốc, đăng ký guards toàn cục
│   │   ├── main.ts             # Bootstrap, Swagger, CORS, static /uploads
│   │   ├── common/             # Middleware (logger), helpers chung
│   │   ├── database/           # TypeORM config + DatabaseModule
│   │   └── modules/            # 21 module nghiệp vụ
│   │       ├── auth/           # Login, JWT, roles, forgot/reset password
│   │       ├── students/       # Hồ sơ sinh viên
│   │       ├── buildings/      # Tòa nhà
│   │       ├── rooms/          # Phòng + tầng (floors)
│   │       ├── staffs/         # Nhân viên BQL
│   │       ├── dorm-registrations/
│   │       ├── dorm-extensions/
│   │       ├── contracts/
│   │       ├── checkins/  checkouts/
│   │       ├── repair-requests/
│   │       ├── utility-readings/
│   │       ├── invoices/  payments/
│   │       ├── notifications/
│   │       ├── analytics/
│   │       ├── audit/          # Audit logs
│   │       ├── documents/      # Sinh PDF
│   │       ├── mail/           # SMTP scaffold
│   │       ├── vnpay/          # VNPay scaffold
│   │       └── system/         # Cấu hình hệ thống
│   ├── migrations/             # Script SQL chạy thủ công (MySQL 8)
│   ├── uploads/                # Static files được phục vụ tại /uploads
│   └── package.json
│
├── frontend/                   # Next.js client
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout (font + Material Symbols)
│   │   ├── login/  forgot-password/  reset-password/
│   │   ├── register-student/   # Đăng ký nội trú
│   │   ├── staff/              # Khu vực dành cho staff
│   │   └── dashboard/          # Dashboard theo role (student/staff/admin)
│   ├── components/             # DashboardChrome, NotificationBell, …
│   ├── lib/                    # api.ts, auth.ts, floors.ts, pdfDownload.ts
│   └── package.json
│
├── docker-compose.yml          # Service DB (xem ghi chú bên dưới)
├── .env.example                # Mẫu biến môi trường
└── README.md                   # File này
```

---

## Yêu cầu hệ thống / Requirements

- **Node.js**: 20.x trở lên (NestJS 11 và Next.js 16 yêu cầu Node hiện đại).
- **npm**: 10.x trở lên (hoặc pnpm/yarn nếu thích, repo đã commit `package-lock.json`).
- **MySQL**: 8.x (InnoDB, charset `utf8mb4`, collation `utf8mb4_unicode_ci`).
- **Git**.

> **Lưu ý / Note.** File [`docker-compose.yml`](docker-compose.yml) ở gốc đang khai báo image `postgres:15-alpine`, nhưng codebase thực tế đang dùng **MySQL 8** (xem [`backend/src/database/database.config.ts`](backend/src/database/database.config.ts) — `type: 'mysql'`, dependency `mysql2` trong [`backend/package.json`](backend/package.json), và các migration `.sql` được viết cho MySQL trong [`backend/migrations/`](backend/migrations/)). Hãy chạy MySQL 8 cục bộ hoặc thay container Postgres trong `docker-compose.yml` bằng `mysql:8` trước khi cấu hình.

---

## Cấu hình môi trường / Environment Variables

Tham khảo [`.env.example`](.env.example). Tách thành **hai file** riêng cho backend và frontend.

### Backend — `backend/.env`

| Biến / Variable | Bắt buộc / Required | Mô tả / Description |
|---|---|---|
| `LISTEN_PORT` | optional (mặc định 3001) | Cổng HTTP của API. |
| `JWT_SECRET` | yes | Khoá ký JWT. **Phải đổi** khi triển khai production. |
| `DB_HOST` | yes | Hostname MySQL (ví dụ `127.0.0.1`). |
| `DB_PORT` | yes | Cổng MySQL (mặc định `3306`). |
| `DB_USER` | yes | Tài khoản MySQL. |
| `DB_PASS` | yes | Mật khẩu MySQL. |
| `DB_NAME` | yes | Tên database (ví dụ `qli_ktx`). |
| `MAIL_HOST` | optional | SMTP host (cho [`MailService`](backend/src/modules/mail/mail.service.ts)). |
| `MAIL_PORT` | optional | Cổng SMTP (587 / 465). |
| `MAIL_USER` | optional | Tài khoản SMTP. |
| `MAIL_PASS` | optional | Mật khẩu SMTP. |
| `MAIL_FROM` | optional | Địa chỉ người gửi, ví dụ `KTX <no-reply@school.edu.vn>`. |
| `MAIL_SECURE` | optional | `true`/`1` để bật TLS (thường dùng với port 465). |
| `VNPAY_TMN_CODE` | optional | Mã website VNPay. |
| `VNPAY_HASH_SECRET` | optional | Secret để ký `vnp_SecureHash`. |
| `VNPAY_URL` | optional | URL gateway (sandbox/production). |
| `VNPAY_RETURN_URL` | optional | URL trình duyệt quay lại sau thanh toán. |
| `VNPAY_IPN_URL` | optional | URL nhận IPN từ VNPay. |

### Frontend — `frontend/.env.local`

| Biến / Variable | Mô tả / Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL gốc của backend (mặc định `http://localhost:3001`). Dùng bởi [`frontend/lib/api.ts`](frontend/lib/api.ts). |

---

## Cài đặt & chạy / Getting Started

### 1. Clone & cài dependencies

```bash
git clone <repo-url> qliktx
cd qliktx
```

### 2. Tạo database MySQL

```sql
CREATE DATABASE qli_ktx
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 3. Backend

```bash
cd backend
cp ../.env.example .env       # rồi sửa lại DB_*, JWT_SECRET, ...
npm install
npm run start:dev             # http://localhost:3001  (Swagger: /api)
```

Các script khác (xem [`backend/package.json`](backend/package.json)):

```bash
npm run start                 # khởi động bình thường
npm run start:prod            # chạy bản build (dist/main)
npm run build                 # nest build
npm run lint                  # ESLint --fix
npm run test                  # Jest unit tests
npm run test:e2e              # Jest end-to-end
```

### 4. Frontend (terminal khác)

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm install
npm run dev                   # http://localhost:3000
```

Các script khác (xem [`frontend/package.json`](frontend/package.json)):

```bash
npm run build                 # next build
npm run start                 # next start (sau khi build)
npm run lint                  # ESLint
```

### 5. Truy cập

- **Web**: <http://localhost:3000>
- **API**: <http://localhost:3001>
- **Swagger UI**: <http://localhost:3001/api>

---

## Database & Migrations

- TypeORM được cấu hình `synchronize: true` ở dev (xem [`backend/src/database/database.config.ts`](backend/src/database/database.config.ts)) — schema tự sinh từ entity mỗi khi chạy. **Không bật ở production.**
- Các thay đổi schema không thể tự sinh (soft delete, indexes, seed dữ liệu mặc định, bảng `payments`, `buildings`, `floors`, `audit_logs`…) được viết tay dưới dạng file `.sql` trong [`backend/migrations/`](backend/migrations/):
  - [`20260413120000_add_payments_and_rooms_soft_delete.sql`](backend/migrations/20260413120000_add_payments_and_rooms_soft_delete.sql)
  - [`20260414000000_buildings_floors_staff_scope_audit_repair_room.sql`](backend/migrations/20260414000000_buildings_floors_staff_scope_audit_repair_room.sql)

Chạy thủ công:

```bash
mysql -u <user> -p qli_ktx < backend/migrations/20260413120000_add_payments_and_rooms_soft_delete.sql
mysql -u <user> -p qli_ktx < backend/migrations/20260414000000_buildings_floors_staff_scope_audit_repair_room.sql
```

> Các file migration đều **idempotent** — kiểm tra `information_schema` và `CREATE TABLE IF NOT EXISTS` nên có thể chạy lại nhiều lần an toàn.

---

## Các route chính / Main Routes

### Frontend (Next.js)

| Đường dẫn / Path | Vai trò / Role | Mô tả |
|---|---|---|
| `/` | public | Landing page (xem [`frontend/app/page.tsx`](frontend/app/page.tsx)). |
| `/login` | public | Đăng nhập. |
| `/register-student` | public | Đăng ký nội trú. |
| `/forgot-password` | public | Yêu cầu đặt lại mật khẩu. |
| `/reset-password` | public | Đặt lại mật khẩu bằng token. |
| `/dashboard` | logged-in | Dashboard tổng quan (cards lọc theo role). |
| `/dashboard/profile` | student | Hồ sơ sinh viên. |
| `/dashboard/repair-requests` | student/staff | Báo cáo & xử lý sự cố. |
| `/dashboard/invoices` | student/staff | Hóa đơn điện nước. |
| `/dashboard/dorm-extensions` | student | Đăng ký gia hạn phòng. |
| `/dashboard/manage-extensions` | staff/admin | Duyệt đơn gia hạn. |
| `/dashboard/checkins` · `/dashboard/checkouts` | staff/admin | Xếp phòng / trả phòng. |
| `/dashboard/maintenance` | staff/admin | Quản lý ticket sự cố. |
| `/dashboard/utility-readings` | staff/admin | Nhập chỉ số điện/nước. |
| `/dashboard/campus` | admin | Quản lý tòa & tầng. |
| `/dashboard/rooms` | admin | Quản lý phòng. |
| `/dashboard/manage-staffs` | admin | Quản lý nhân viên. |
| `/dashboard/audit-logs` | admin | Nhật ký thao tác. |
| `/dashboard/system-settings` | admin | Cấu hình hệ thống. |
| `/staff/dorm-approvals` | staff/admin | Duyệt đơn xin vào KTX. |

### Backend (NestJS)

- `GET /` — health check (xem [`backend/src/app.controller.ts`](backend/src/app.controller.ts)).
- `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password` — xem [`backend/src/modules/auth/auth.controller.ts`](backend/src/modules/auth/auth.controller.ts).
- `GET /uploads/*` — phục vụ file tĩnh từ thư mục `backend/uploads/`.
- `GET /api` — Swagger UI (mọi endpoint khác được liệt kê đầy đủ ở đây).

---

## Ghi chú phát triển / Development Notes

- **CORS** chỉ mở cho `http://localhost:3000` ở [`backend/src/main.ts`](backend/src/main.ts). Khi đổi cổng/host frontend, nhớ cập nhật.
- Mọi endpoint **mặc định cần JWT** (do `JwtAuthGuard` được đăng ký globally trong [`backend/src/app.module.ts`](backend/src/app.module.ts)). Dùng decorator `@Public()` từ [`backend/src/modules/auth/public.decorator.ts`](backend/src/modules/auth/public.decorator.ts) để bỏ qua guard cho các endpoint công khai.
- Kiểm soát quyền theo role bằng decorator `@Roles(...)` + `RolesGuard` ([`backend/src/modules/auth/roles.guard.ts`](backend/src/modules/auth/roles.guard.ts)).
- Frontend lưu token trong `localStorage` dưới key `token`. Helper [`requireAuth`](frontend/lib/auth.ts) dùng cho các trang yêu cầu đăng nhập, [`apiFetch`](frontend/lib/api.ts) gọi API với `cache: 'no-store'`.
- TypeORM `synchronize: true` đang bật — **chỉ dùng ở dev**. Production phải tắt và quản lý schema bằng migration.
- Forgot password hiện trả về `resetToken` trong response (chỉ phục vụ test); thay bằng gửi email khi đưa lên production — xem [`backend/src/modules/auth/auth.service.ts`](backend/src/modules/auth/auth.service.ts).
- Module `mail/` và `vnpay/` mới ở mức scaffold (load config) — sẽ được hoàn thiện trong các phase sau.

---

## License

Hiện chưa có file `LICENSE` ở repo. Vui lòng liên hệ chủ sở hữu dự án trước khi sử dụng cho mục đích thương mại.

> _No license file is shipped with this repository yet. Please contact the project owner before any commercial use._
