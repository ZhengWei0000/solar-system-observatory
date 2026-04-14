import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Solar System Observatory",
    template: "%s | Solar System Observatory",
  },
  description:
    "真实数据驱动的太阳系观测学习网站，强调轨道、物理参数、模型等级与来源透明度。",
  applicationName: "Solar System Observatory",
  keywords: [
    "solar system",
    "three.js",
    "planetary science",
    "天文",
    "太阳系",
    "卫星",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#030712] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
