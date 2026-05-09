import "./globals.css";

export const metadata = {
  title: "球赛速递 - 体育赛事与新闻门户",
  description: "赛事、新闻、集锦和体育分类聚合演示站。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
