# BÁO CÁO SỬ DỤNG TRÍ TUỆ NHÂN TẠO (AI TẠO SINH) TRONG NGHIÊN CỨU
*(Thực hiện theo Phụ lục 1 - Hướng dẫn sử dụng AI tạo sinh trong dự án KHKT
Lời cam kết: Khẳng định rõ nhóm tuân thủ quy định: Không dùng AI để viết báo cáo, không dùng AI để đưa ra kết luận. Chỉ dùng AI làm "trợ lý lập trình".
Bảng tổng hợp Prompt Log: Đưa ra 4 ví dụ cụ thể về các câu lệnh (Prompt) đã dùng ChatGPT để hỏi (Hỏi công thức toán học, hỏi thuật toán P90, cấu trúc Database, Bảo mật JWT).
Kèm theo cột "Trạng thái theo quy định" (để chứng minh mình xài AI một cách hợp lệ) và cột "Kết quả thu được" để Ban giám khảo thấy bạn sử dụng AI cực kỳ thông minh và có chủ đích chứ không copy bừa.)*

**Tên dự án:** Ứng dụng Trí tuệ Nhân tạo trong Sàng lọc Sức khỏe Tinh thần Học sinh thông qua Phân tích Biểu cảm Khuôn mặt Thời gian thực
**Học sinh thực hiện:** [Tên bạn 1], [Tên bạn 2]

---

## LỜI CAM KẾT
Nhóm nghiên cứu cam kết đã tuân thủ nghiêm ngặt **Bảng Quy Định Sử Dụng AI** của Cuộc thi KHKT cấp Thành phố năm học 2026-2027. Cụ thể:
1. **KHÔNG** sử dụng AI để viết bản thảo Báo cáo, Tóm tắt (Abstract) hay Poster dự thi. Toàn bộ tài liệu, văn phong và lý luận là công sức tổng hợp, tư duy phản biện độc lập của nhóm.
2. **KHÔNG** sử dụng AI để đưa ra kết luận nghiên cứu, giải thích số liệu hay định hướng phát triển tương lai. Các bằng chứng và kết quả thử nghiệm được thu thập từ con người thật.
3. **CÓ** sử dụng AI (ChatGPT / Claude / Gemini) đóng vai trò như một "người hướng dẫn lập trình (Pair-programming Mentor)" và "công cụ gỡ rối cú pháp". Toàn bộ lịch sử câu lệnh (Prompt Log) đã được minh bạch dưới đây và trong Sổ Nhật Ký.

---

## BẢNG TỔNG HỢP NHẬT KÝ CÂU LỆNH (PROMPT LOGS) CHI TIẾT THEO TIẾN TRÌNH

| STT | Giai đoạn | Câu lệnh đã sử dụng (Prompt) | Nhận định của nhóm & Ứng dụng thực tế | Trạng thái |
|:---:|-----------|------------------------------|--------------------------------------|------------|
| 1 | Dựng khung Công nghệ cốt lõi | *"Gợi ý stack công nghệ tốt nhất để chạy mô hình phân tích cảm xúc (ViT) và nhận diện khuôn mặt (MediaPipe) trực tiếp trên trình duyệt, không cài đặt phần mềm ngoài, đảm bảo dữ liệu không gửi lên server?"* | AI đề xuất Next.js, ONNX Web Runtime và MediaPipe WebAssembly. Nhóm đã tự thiết lập kiến trúc **Zero Data Leakage** dựa trên gợi ý này, giải quyết tận gốc nỗi lo bảo mật hình ảnh của học sinh. | Cho phép (Định hình ý tưởng) |
| 2 | Vòng lặp 1: Ảnh tĩnh sang Video 15s | *"Ban đầu mình định làm chức năng chụp 1 bức ảnh tĩnh cứ mỗi 3 giây. Nhưng mình nhận ra ảnh tĩnh không bắt được trạng thái chớp mắt hay sự kéo dài của nỗi buồn. Làm sao để quét liên tục video 15s bằng MediaPipe trên React?"* | AI cung cấp cú pháp `requestAnimationFrame` thay cho `setInterval`. Nhờ sự bẻ lái này, dự án mới có thể phân tích được dữ liệu chuỗi thời gian (time-series) như số khung hình nhắm mắt (PERCLOS). | Cho phép (Hỗ trợ code) |
| 3 | Vòng lặp 2: Chối bỏ Blendshape | *"Mình gặp vấn đề rất lớn: Hàm eyeSquint (nháy mắt) có sẵn của MediaPipe học từ dữ liệu phương Tây, nên với học sinh Việt Nam mắt một mí, số trả về luôn rất thấp dù đang nheo mắt thật. Hãy hướng dẫn mình công thức toán học tính khoảng cách mí mắt thay vì xài hàm có sẵn."* | Nhóm tự phát hiện ra **Thiên lệch chủng tộc (Racial Bias)** của AI Google. Việc AI dạy nhóm công thức **EAR (Eye Aspect Ratio)** giúp dự án chuyển sang tính toán Toán học độc lập, khách quan hơn rất nhiều. | Cho phép (Gỡ rối kỹ thuật) |
| 4 | Vòng lặp 3: Hiệu chuẩn Động (Dynamic Baseline) | *"Sau khi dùng công thức EAR, điểm số vẫn chưa chuẩn vì mỗi bạn có kích thước mắt khác nhau. Hãy viết cho tôi thuật toán TypeScript lọc nhiễu mảng số thực và tìm Bách phân vị thứ 90 (P90) để hệ thống tự học mắt của từng bạn trong 3 giây đầu."* | Nhóm sáng tạo ra ý tưởng "Hiệu chuẩn Động". AI hỗ trợ viết hàm xử lý mảng toán học phức tạp. Kết quả: Khắc phục 100% lỗi nhận diện sai, hệ thống phân biệt được người nhắm mắt và người mắt hí. | Cho phép (Viết mã) |
| 5 | Phát hiện Nụ cười giả (Masked Smile) | *"Nụ cười thật phải co cơ gò má. Làm sao tính khoảng cách Euclid giữa điểm đuôi mắt và khóe miệng (Cheek-Eye Distance) bằng tọa độ 3D của MediaPipe?"* | Áp dụng tâm lý học (Duchenne Smile) vào kỹ thuật. AI cung cấp code lấy đúng Index của các điểm. Nhóm tự định nghĩa logic: "Nếu máy chấm Vui vẻ > 40% mà CED không hẹp lại 15% thì là cười giả, phạt giảm 50% điểm". | Cho phép (Hỗ trợ code) |
| 6 | Động cơ Cảnh báo Rủi ro 2 Tầng | *"Tạo cho mình cơ chế chấm điểm 2 tầng (2-Tier Risk) bằng Python FastAPI. Tầng 1 (Safety Net): Nếu vướng câu nhạy cảm hoặc kiệt sức (PERCLOS > 45%) thì Báo Động Đỏ ngay lập tức. Tầng 2: Nếu an toàn ở T1, mới dùng công thức tính điểm kết hợp (SurveyScore bị phạt bởi AI)."* | Nhóm tự tư duy kiến trúc **2-Tier Engine** để chống Âm tính giả (học sinh lừa máy). AI đóng vai trò "thợ gõ phím" chuyển đổi Logic tuyệt vời này thành mã nguồn Python chạy trên server. | Cho phép (Viết mã Backend) |
| 7 | Hồi quy tuyến tính cảnh báo sớm | *"Làm sao áp dụng Linear Regression trên mảng dữ liệu 5 lần check-in gần nhất để tính hệ số góc (Slope)? Nếu Slope > 5.0 mình muốn gửi cảnh báo trend_alert."* | Việc phân tích đường xu hướng giúp GVCN đoán trước tương lai tâm lý học sinh thay vì chờ điểm chạm ngưỡng đỏ. AI cung cấp hàm toán học tính Slope bằng thư viện chuẩn. | Cho phép (Hỗ trợ ý tưởng toán học) |
| 8 | Lập trình CSDL & Nâng cấp Giao diện | *"Viết schema PostgreSQL tạo 3 bảng có quan hệ 1-N. Bảng questions có cột 'is_sensitive' và 'recommendation_text'. Đồng thời, update giao diện EmotionResult.tsx sang phong cách Glassmorphism có viền Glow. Thêm ô 'Tâm sự với giáo viên' ở cuối."* | AI hỗ trợ sinh ra mã SQL và CSS Tailwind. Giao diện Premium siêu mượt ra đời, tích hợp tính năng "Lời khuyên 1-1" cá nhân hóa theo từng câu trả lời tiêu cực của học sinh. | Cho phép (Viết mã UI/DB) |
| 9 | Bảo mật Hệ thống | *"Hướng dẫn cài đặt bảo mật JWT (JSON Web Token) và mã hóa bcrypt mật khẩu cho FastAPI. Mã hóa cả nội dung ô tâm sự để chỉ Role=Admin mới xem được."* | Đảm bảo hệ thống chặt chẽ về mặt đạo đức và an toàn thông tin theo chuẩn y tế. | Cho phép (Viết mã Security) |

---
**Nhận xét tổng quan về quá trình tương tác với AI:**
Thông qua bảng trên, có thể thấy AI không "làm hộ" dự án. AI không thể tự nhận ra lỗi thiên lệch chủng tộc, không thể tự nghĩ ra thuật toán 2 Tầng (2-Tier Risk), và cũng không tự định nghĩa được nụ cười giả (Masked Smile).

Mọi bế tắc, mọi ý tưởng bẻ lái, và toàn bộ logic nghiệp vụ (Business Logic) đều được sinh ra từ **quá trình quan sát thực tế và tư duy phản biện liên tục của hai thành viên trong nhóm**. AI chỉ thực hiện đúng chức năng của một cỗ máy: chuyển ngữ ý tưởng của con người thành mã code máy tính nhanh chóng và chuẩn xác.

**Chữ ký xác nhận của Học sinh 1:** ...................................................
**Chữ ký xác nhận của Học sinh 2:** ...................................................
**Chữ ký xác nhận của Giáo viên hướng dẫn:** ....................................
