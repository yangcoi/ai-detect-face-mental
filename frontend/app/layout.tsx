import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mental Check-in | Theo dõi sức khỏe tinh thần",
  description: "Hệ thống AI giúp học sinh theo dõi trạng thái tinh thần hàng ngày thông qua phân tích khuôn mặt và câu hỏi check-in.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
