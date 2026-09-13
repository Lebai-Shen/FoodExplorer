import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata = {
  title: "FoodExplorer · 经营首页",
  description: "面向独立餐饮小店店主的经营决策助手",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
