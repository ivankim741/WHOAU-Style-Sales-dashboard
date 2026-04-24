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
            {/* 소진율 */}
            <div className="relative group">
              <a href="/" className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">소진율</a>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg
                             opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 leading-relaxed whitespace-normal">
                <p className="font-semibold mb-1 text-indigo-300">📊 소진율 기준</p>
                <p>누적 판매량 ÷ 총 입고량</p>
                <p className="text-gray-400 mt-1">스타일별 전체 재고 대비 얼마나 팔렸는지를 보여줍니다. 일평균·3개월 소진율도 함께 제공.</p>
                <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-gray-800 rotate-45"></div>
              </div>
            </div>

            {/* QR 오더 */}
            <div className="relative group">
              <a href="/qr" className="text-sm text-gray-600 hover:text-red-500 font-medium transition">🔴 QR 오더</a>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg
                             opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 leading-relaxed whitespace-normal">
                <p className="font-semibold mb-1 text-red-300">🔴 QR 오더 기준</p>
                <p>예상 판매량 − 잔여재고 = QR 필요 수량</p>
                <p className="text-gray-400 mt-1">예상 필업일 = 오늘 + 60일 (생산 리드타임). 시즌 마감까지 팔릴 양보다 재고가 부족한 스타일만 표시.</p>
                <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-gray-800 rotate-45"></div>
              </div>
            </div>

            {/* SKU 분석 */}
            <div className="relative group">
              <a href="/sku" className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">SKU 분석</a>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg
                             opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 leading-relaxed whitespace-normal">
                <p className="font-semibold mb-1 text-indigo-300">🔍 SKU 분석 기준</p>
                <p>컬러·사이즈 단위 판매 분석</p>
                <p className="text-gray-400 mt-1">최근 1개월 판매량 기본 정렬. 소진율 = 누적 판매 ÷ 총 입고.</p>
                <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-gray-800 rotate-45"></div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
