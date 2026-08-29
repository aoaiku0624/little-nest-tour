import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小窝巡游",
  description: "独立 agent 是饲养者玩家，你是被照料的小宠物。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
