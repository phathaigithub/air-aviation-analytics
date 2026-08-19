import "./globals.css";

export const metadata = {
  title: "Xóm Air — Aviation Customer Experience Analytics",
  description:
    "A data analytics case study transforming 214,681 aviation reviews into a validated evidence base.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
