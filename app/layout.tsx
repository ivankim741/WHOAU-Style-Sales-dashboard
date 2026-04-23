import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "소진율 · QR 대시보드",
  description: "판매 데이터 분석 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 sticky top-0 z-10">
          <span className="font-bold text-gray-800 text-base">📊 WHO.A.U Dashboard</span>
          <div className="flex items-center gap-4 ml-4">
            <a href="/" className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">소진율</a>
            <a href="/qr" className="text-sm text-gray-600 hover:text-red-500 font-medium transition">🔴 QR 오더</a>
            <a href="/sku" className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">SKU 분석</a>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
