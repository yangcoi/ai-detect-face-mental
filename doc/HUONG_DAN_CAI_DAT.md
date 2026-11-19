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
  ```

---

## PHẦN 2: CHẠY MÁY CHỦ AI (BACKEND)
Phần này sẽ khởi động bộ não AI của hệ thống.

**Bước 1:** Mở công cụ gõ lệnh (Windows mở **Command Prompt / CMD**, Mac mở **Terminal**).
**Bước 2:** Di chuyển vào thư mục `backend` của mã nguồn bằng lệnh `cd` (thay đường dẫn bên dưới bằng đường dẫn thực tế trên máy bạn):
```bash
# Ví dụ trên Mac:
cd "/Users/yangcoi/Documents/AI dectect face mental/backend"

# Ví dụ trên Windows:
cd "C:\Users\TenBan\Desktop\AI_dectect_face_mental\backend"
```

**Bước 3:** Cài đặt các thư viện AI cần thiết bằng lệnh:
```bash
pip install -r requirements.txt
```
*(Đợi 2-3 phút để máy tính tải các thư viện như FastAPI, Uvicorn, Passlib... về máy)*

**Bước 4:** Bật máy chủ AI lên:
```bash
uvicorn main:app --reload
```
*(Để nguyên cửa sổ này không được tắt. Backend đang chạy ở địa chỉ `http://localhost:8000`)*

*(Lưu ý: Ngay khi máy chủ AI chạy, hệ thống sẽ tự động tạo dữ liệu mẫu và các tài khoản vào Database luôn cho bạn).*

---

## PHẦN 3: CHẠY GIAO DIỆN NGƯỜI DÙNG (FRONTEND)
Đây là phần hiển thị Website cho học sinh và giáo viên sử dụng.

**Bước 1:** Mở một cửa sổ gõ lệnh **MỚI** (không tắt cửa sổ của Backend ở Phần 2).
**Bước 2:** Di chuyển vào thư mục `frontend`:
```bash
# Ví dụ trên Mac:
cd "/Users/yangcoi/Documents/AI dectect face mental/frontend"

# Ví dụ trên Windows:
cd "C:\Users\TenBan\Desktop\AI_dectect_face_mental\frontend"
```

**Bước 3:** Tải các gói thư viện giao diện về:
```bash
npm install
```
*(Đợi khoảng 1-2 phút)*

**Bước 4:** Bật Website lên:
```bash
npm run dev
```

---

## PHẦN 4: TRẢI NGHIỆM THÀNH QUẢ
Xin chúc mừng! Bạn đã cài đặt thành công.

Bây giờ, hãy mở trình duyệt web (Google Chrome hoặc Safari) và truy cập vào địa chỉ:
👉 **http://localhost:3000**

**Tài khoản đăng nhập có sẵn để thử nghiệm:**
- **Tài khoản Giáo viên (Admin):**
  - Tên đăng nhập: `admin`
  - Mật khẩu: `admin123`
- **Tài khoản Học sinh:**
  - Tên đăng nhập: `hs001` (hoặc từ hs001 đến hs005)
  - Mật khẩu: `pass123`

**Lưu ý khi test AI quét mặt:** Khi trình duyệt hỏi xin quyền truy cập Camera, hãy nhớ bấm **Cho phép (Allow)** nhé!

*(Mẹo: Khi không sử dụng nữa, bạn mở lại 2 cửa sổ lệnh lúc nãy, bấm tổ hợp phím `Ctrl + C` để tắt máy chủ đi là xong).*

---

## PHẦN 5: CÀI ĐẶT NHANH BẰNG DOCKER (Cách chuyên nghiệp)
Nếu máy bạn đã cài sẵn **Docker Desktop**, bạn không cần phải cài Python, Node.js hay thiết lập Database lằng nhằng như ở trên nữa. Mọi thứ chỉ cần 1 dòng lệnh duy nhất!

**Bước 1:** Mở công cụ gõ lệnh (Terminal / CMD) và di chuyển vào thư mục gốc của dự án (thư mục chứa file `docker-compose.yml`).
**Bước 2:** Chạy lệnh sau:
```bash
docker-compose up --build
```
*(Nếu bạn dùng phiên bản Docker mới, lệnh có thể là `docker compose up --build`)*

**Bước 3:** Chờ Docker tự động tải và cài đặt mọi thứ (mất khoảng 3-5 phút cho lần đầu tiên).
Khi thấy màn hình dừng lại và báo Backend chạy ở `0.0.0.0:8000`, Frontend chạy ở `0.0.0.0:3000` là xong.

Bạn chỉ việc vào **http://localhost:3000** để sử dụng.
*(Lưu ý: Database trong Docker cũng sẽ tự động được tạo và nạp sẵn dữ liệu mẫu như trên).*

Khi muốn tắt dự án, bạn chỉ cần bấm `Ctrl + C` hoặc gõ lệnh:
```bash
docker-compose down
```
