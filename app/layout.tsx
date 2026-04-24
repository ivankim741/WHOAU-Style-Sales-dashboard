import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Depletion · QR Dashboard",
  description: "Sales Data Analysis Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 sticky top-0 z-10">
          <span className="font-bold text-gray-800 text-base">📊 WHO.A.U Dashboard</span>
          <div className="flex items-center gap-4 ml-4">
            {/* Depletion Rate */}
            <div className="relative group">
              <a href="/" className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">Depletion</a>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg
                             opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 leading-relaxed whitespace-normal">
                <p className="font-semibold mb-1 text-indigo-300">📊 Depletion Rate Criteria</p>
                <p>Cumulative Sales ÷ Total Stock In</p>
                <p className="text-gray-400 mt-1">Shows how much of each style has sold vs. total inbound. Includes daily avg & 1-month depletion rate.</p>
                <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-gray-800 rotate-45"></div>
              </div>
            </div>

            {/* QR Order */}
            <div className="relative group">
              <a href="/qr" className="text-sm text-gray-600 hover:text-red-500 font-medium transition">🔴 QR Order</a>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg
                             opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 leading-relaxed whitespace-normal">
                <p className="font-semibold mb-1 text-red-300">🔴 QR Order Criteria</p>
                <p>Projected Sales − Remaining Stock = QR Qty Needed</p>
                <p className="text-gray-400 mt-1">Est. fill date = Today + 60 days (production lead time). Only styles with insufficient stock before season end.</p>
                <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-gray-800 rotate-45"></div>
              </div>
            </div>

            {/* SKU Analysis */}
            <div className="relative group">
              <a href="/sku" className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">SKU Analysis</a>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg
                             opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 leading-relaxed whitespace-normal">
                <p className="font-semibold mb-1 text-indigo-300">🔍 SKU Analysis Criteria</p>
                <p>Sales breakdown by color & size</p>
                <p className="text-gray-400 mt-1">Default sort: last 1-month sales. Depletion = cumulative sales ÷ total stock in.</p>
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
