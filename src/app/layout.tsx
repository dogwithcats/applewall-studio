import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "果壁 Studio · 免费苹果生态 AI 壁纸工作台",
  description:
    "专为 iPhone / iPad / Mac 打造的免费 AI 壁纸平台：真人宠物高保真美化、风景艺术二创、锁屏时钟智能留白避让与全家桶三端联动适配。",
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
