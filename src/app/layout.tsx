import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "果壁 Studio · 富士胶片滤镜与苹果生态壁纸工作台",
  description:
    "专为 iPhone / iPad / Mac 打造的免费本地胶片壁纸工作台：内置 10 款经典富士胶片模拟与 22 款壁纸滤镜、锁屏时钟智能留白避让与全家桶三端无损导出。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-[#07080d] text-zinc-100 antialiased selection:bg-blue-500/30">
        {children}
      </body>
    </html>
  );
}
