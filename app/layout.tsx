import "./globals.css";

export const metadata = {
  title: "Xóm Air — Aviation Customer Experience Analytics",
  description:
    "Case study phân tích 214.681 đánh giá hàng không bằng Python và SQL Server.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
