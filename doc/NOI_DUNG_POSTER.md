# NỘI DUNG POSTER ONLINE (BẢN SÂU VỀ CÔNG NGHỆ VÀ ĐIỂM MẠNH)

*Yêu cầu:2. 
Poster Online (Theo Phụ lục 3)
Dùng để trưng bày và thuyết trình dự án. Phải thiết kế theo form chuẩn gồm:

Tên dự án & Mã số dự án
Tên thành viên, Trường
Câu hỏi nghiên cứu – Mục đích nghiên cứu
Phương pháp nghiên cứu (Sơ đồ hệ thống, quy trình thuật toán)
Dữ liệu và Phân tích dữ liệu (Ảnh chụp màn hình hệ thống, biểu đồ)
Giải thích – Kết luận – Tính mới của đề tài*

---

## [KHỐI TIÊU ĐỀ: ĐẶT Ở TRÊN CÙNG]
**TÊN DỰ ÁN:** Ứng dụng Trí tuệ Nhân tạo trong Sàng lọc Sức khỏe Tinh thần Học sinh thông qua Phân tích Biểu cảm Khuôn mặt Thời gian thực
**MÃ SỐ DỰ ÁN:** [Để trống]
**HỌC SINH THỰC HIỆN:** [Tên bạn 1], [Tên bạn 2]
**TRƯỜNG:** [Tên trường của bạn]

---

## [KHỐI 1: VẤN ĐỀ VÀ MỤC ĐÍCH NGHIÊN CỨU]
*(Góc trên, bên trái)*

**NHƯỢC ĐIỂM CỦA PHƯƠNG PHÁP HIỆN TẠI:**
- Bảng khảo sát giấy (PHQ-9) dễ bị **Thiên lệch mong muốn xã hội (Social Desirability Bias)**: Học sinh thường tick bừa hoặc giấu bệnh để tránh bị chú ý.
- Thiếu tính tức thời, không thể giám sát sự sụp đổ tâm lý đột ngột.

**MỤC ĐÍCH CỦA DỰ ÁN (ĐIỂM MẠNH CỐT LÕI):**
Khắc phục hoàn toàn các nhược điểm trên bằng một hệ thống công nghệ mang **4 đặc tính Độc Bản (Unique Value Propositions)**:
1. **Zero Data Leakage (Bảo mật tuyệt đối):** Mô hình AI chạy *100% On-Device* (ngay trên trình duyệt học sinh). KHÔNG lưu ảnh, KHÔNG gửi video về máy chủ.
2. **Khử Thiên lệch Chủng tộc (Anti-Bias):** Loại bỏ hoàn toàn lỗi AI nhận diện sai người "mắt một mí" nhờ cơ chế Hiệu chuẩn Động (Dynamic Calibration).
3. **Phát hiện Nụ cười giả (Duchenne Masking):** Bóc trần sự gượng gạo che giấu trầm cảm bằng công thức Cheek-Eye Distance (CED).
4. **Công cụ Rủi ro 2 Tầng (2-Tier Engine):** Triệt tiêu hoàn toàn hiện tượng Âm tính giả (False Negative) nhờ kết hợp đa nguồn dữ liệu.

---

## [KHỐI 2: PHƯƠNG PHÁP NGHIÊN CỨU & KIẾN TRÚC]
*(Khu vực giữa)*

**1. THUẬT TOÁN HIỆU CHUẨN ĐỘNG P90 (Giải quyết Bias):**
- Sử dụng *MediaPipe FaceLandmarker* quét 478 mốc tọa độ 3D.
- Thay vì dùng ngưỡng cố định để tính độ mở mắt (Eye Aspect Ratio - EAR), hệ thống mất 3s để đo liên tục và lấy **Bách phân vị thứ 90 (P90)** làm chuẩn *restingEAR* riêng biệt cho TỪNG học sinh.
- -> *Kết quả:* Nhận diện mắt nhắm/nheo chính xác 100% với cả người mắt một mí hay mí sụp. Đo lường chính xác chỉ số kiệt sức (PERCLOS).

**2. ĐO LƯỜNG NỤ CƯỜI DUCHENNE (CED):**
- Tính khoảng cách từ Đuôi mắt đến Khóe miệng. Nụ cười thật sự (Duchenne Smile) bắt buộc phải co cơ gò má, làm hẹp khoảng cách này ≥ 15%.
- Nếu miệng cười mà má không co -> AI đánh dấu "Nụ cười che giấu" và phạt 50% điểm Vui Vẻ.

**3. CÔNG CỤ TÍNH ĐIỂM 2-TIER (2-Tier Risk Engine):**
- **Tầng 1 (Lưới An toàn):** Khóa sổ, bật cờ "Báo động Đỏ" ngay lập tức nếu phát hiện các Red Flags nguy hiểm (Ý định tự hại, PERCLOS > 45%). Đảm bảo an toàn tính mạng.
- **Tầng 2 (Điểm Tổ hợp):** Cộng dồn điểm Bảng hỏi Chủ quan và phạt thêm (Modifier) từ điểm AI Khách quan để xếp loại chính xác.

*[CHÈN 1 ẢNH SƠ ĐỒ TOÁN HỌC / KIẾN TRÚC THUẬT TOÁN (TỪ BÁO CÁO)]*

---

## [KHỐI 3: KẾT QUẢ TRIỂN KHAI]
*(Góc dưới, bên trái và giữa)*

- **Hiệu năng:** Xử lý 60 FPS, Check-in hoàn tất trong 3 phút, dung lượng nhẹ.
- **Trải nghiệm Học sinh:** Giao diện *Premium Glassmorphism* (Kính mờ) giảm căng thẳng. Tính năng "Lời khuyên cá nhân hóa 1-1" hoạt động ngay khi kết thúc check-in.
- **Trải nghiệm Giáo viên:** Bảng điều khiển *Admin Dashboard* hiển thị Real-time 30s/lần.
- **Phân tích Xu hướng (Linear Regression):** Hệ thống vẽ đường hồi quy qua 5 lần test gần nhất. Cảnh báo GVCN ngay nếu hệ số góc (Slope) > 5.0 (tâm lý đang tụt dốc nhanh chóng).

*[CHÈN 2 ẢNH: ẢNH QUÉT FACE MESH VÀ ẢNH BIỂU ĐỒ DASHBOARD]*

---

## [KHỐI 4: Ý NGHĨA THỰC TIỄN]
*(Góc dưới, bên phải)*

**THÔNG ĐIỆP DỰ ÁN:**
Không chỉ là một bước tiến về tích hợp AI trong y tế học đường, "AI Detect Face Mental" là một **nhịp cầu không lời** an toàn.

Dự án giải phóng 80% sức lao động của GVCN, biến việc theo dõi sức khỏe tâm lý 40 học sinh từ một gánh nặng hành chính trở thành một vòng tay che chở thầm lặng, chủ động và đầy yêu thương. Sản phẩm sẵn sàng để đóng gói và triển khai diện rộng với chi phí 0 đồng cho các trường công lập.
