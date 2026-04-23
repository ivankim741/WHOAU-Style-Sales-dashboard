"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface QRStyle {
  style_id: number;
  style_code: string;
  name: string;
  season: string;
  category: string;
  total_sold: number;
  total_remaining: number;
  total_stock: number;
  depletion_rate: number;
  first_sale_date: string;
  days_since_first_sale: number;
  needs_qr: boolean;
  qr_reason: string;
  qr_rate_7d: number;
  qr_rate_30d: number;
}

export default function QRPage() {
  const [data, setData] = useState<QRStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from("style_qr_status")
        .select("*")
        .eq("needs_qr", true)
        .order("depletion_rate", { ascending: false })
        .limit(1000);
      if (error) console.error(error);
      else setData(rows ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(data.map((d) => d.category).filter(Boolean))].sort();
    return ["전체", ...cats];
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((d) => {
      if (category !== "전체" && d.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.style_code.toLowerCase().includes(q) || (d.name ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, search, category]);

  const by7d = filtered.filter((d) => d.qr_reason === "7d");
  const by30d = filtered.filter((d) => d.qr_reason === "30d");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🔴 QR 오더 대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">재생산 요청이 필요한 스타일 목록</p>
      </div>

      {/* 요약 */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-red-400 mb-1">QR 대상 총계</p>
            <p className="text-3xl font-bold text-red-600">{filtered.length}<span className="text-sm font-normal ml-1">개</span></p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs text-orange-400 mb-1">7일 기준 초과</p>
            <p className="text-3xl font-bold text-orange-500">{by7d.length}<span className="text-sm font-normal ml-1">개</span></p>
            <p className="text-xs text-orange-300 mt-1">소진율 ≥ {(by7d[0]?.qr_rate_7d ?? 0.05) * 100}%</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-red-400 mb-1">30일 기준 초과</p>
            <p className="text-3xl font-bold text-red-600">{by30d.length}<span className="text-sm font-normal ml-1">개</span></p>
            <p className="text-xs text-red-300 mt-1">소진율 ≥ {(by30d[0]?.qr_rate_30d ?? 0.30) * 100}%</p>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="스타일코드 / 스타일명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 transition"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
        >
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length}개 스타일</span>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse text-sm">데이터 불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">QR 대상 스타일이 없습니다. 🎉</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-red-50 border-b border-red-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">QR 기준</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">카테고리</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">스타일코드</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">스타일명</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-red-400">판매일수</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-red-400">판매량</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-red-400">잔여재고</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-red-400">소진율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((d) => (
                <tr key={d.style_id} className="hover:bg-red-50/30 transition">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                      d.qr_reason === "30d"
                        ? "bg-red-100 text-red-600"
                        : "bg-orange-100 text-orange-600"
                    }`}>
                      🔴 {d.qr_reason === "30d" ? "30일 기준" : "7일 기준"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">{d.category}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.style_code}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-48 truncate">{d.name ?? "-"}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{d.days_since_first_sale}일</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{d.total_sold.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{d.total_remaining.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-red-500">{d.depletion_rate.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
