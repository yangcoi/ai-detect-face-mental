# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN 

---
## PHẦN 1: CÀI ĐẶT CÁC PHẦN MỀM NỀN TẢNG
Trước khi chạy code, máy tính của bạn cần có 3 công cụ cơ bản: **Python** (để chạy AI), **Node.js** (để chạy Giao diện) và **PostgreSQL** (để lưu trữ dữ liệu).
### 1.1. Cài đặt Python
- **Windows:** Lên Google gõ `Download Python` (hoặc vào python.org), tải bản mới nhất (từ 3.9 trở lên). **LƯU Ý CỰC QUAN TRỌNG KHI CÀI ĐẶT:** Ở màn hình cài đặt đầu tiên, bạn bắt buộc phải tích chọn ô **`Add Python.exe to PATH`** ở dưới cùng. Sau đó bấm Install Now.
- **MacBook:** Mở ứng dụng **Terminal** (bấm Command + Space, gõ Terminal), copy dòng lệnh sau dán vào và nhấn Enter:
  ```bash
  brew install python
  ```
### 1.2. Cài đặt Node.js
- **Windows & Mac:** Lên trang chủ `nodejs.org`, tải phiên bản có chữ **LTS (Long Term Support)** và cài đặt bình thường (cứ bấm Next liên tục cho đến khi Finish).
### 1.3. Cài đặt Cơ sở dữ liệu PostgreSQL
- **Windows:** 
  1. Tải bộ cài từ trang chủ EnterpriseDB (tìm Google: `Download PostgreSQL Windows`).
  2. Cài đặt bình thường. Khi đến bước nhập **Password (Mật khẩu)**, hãy nhập chính xác là: **`123456`**. 
  3. Cổng (Port) cứ để mặc định là `5432`.
  4. Mở app **pgAdmin 4** (vừa được cài chung), đăng nhập bằng mật khẩu `123456`. Nhấp chuột phải vào phần Databases -> Create -> Database... Đặt tên là **`mental_checkin`**. Cuối cùng, tạo một User (Login/Group Roles) tên là **`admin`** với mật khẩu **`123456`**.
- **MacBook:** Mở ứng dụng Postgres.app (tải từ trang chủ postgresapp.com) HOẶC dùng Terminal chạy 2 lệnh sau:
  ```bash
  brew install postgresql
  brew services start postgresql
  ```
  Sau đó, tạo user và database bằng lệnh:
  ```bash
  psql postgres -c "CREATE USER admin WITH PASSWORD '123456';"
  psql postgres -c "CREATE DATABASE mental_checkin OWNER admin;"