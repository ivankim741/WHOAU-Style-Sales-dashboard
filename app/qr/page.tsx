"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface QRStyle {
  style_id: number;
  style_code: string;
  name: string;
  category: string;
  year_code: string;
  season_code: string;
  total_sold: number;
  total_remaining: number;
  total_stock: number;
  depletion_rate: number;
  depletion_rate_3m: number | null;
  first_sale_date: string;
  days_since_first_sale: number;
  needs_qr: boolean;
  qr_reason: string;
  qr_rate_7d: number;
  qr_rate_30d: number;
  qr_qty: number;
}

const YEAR_MAP: Record<string, string> = { A: "'21", B: "'22", C: "'23", D: "'24", E: "'25", F: "'26" };
const SEASON_MAP: Record<string, string> = { "1": "1Q", "2": "2Q", "3": "3Q", "4": "4Q" };

export default function QRPage() {
  const [data, setData] = useState<QRStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("전체");

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const categories = useMemo(() => ["전체", ...[...new Set(data.map((d) => d.category).filter(Boolean))].sort()], [data]);

  const filtered = useMemo(() => data.filter((d) => {
    if (category !== "전체" && d.category !== category) return false;
    if (reasonFilter !== "전체" && d.qr_reason !== reasonFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.style_code.toLowerCase().includes(q) || (d.name ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [data, search, category, reasonFilter]);

  const by7d  = filtered.filter((d) => d.qr_reason === "7d");
  const by30d = filtered.filter((d) => d.qr_reason === "30d");
  const totalQrQty = filtered.reduce((s, d) => s + d.qr_qty, 0);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">🔴 QR 오더 대시보드</h1>
        <p className="text-xs text-gray-400 mt-1">QR 필요 수량 = 현재 일평균 판매량 × 90일 (3개월 예상 생산량)</p>
      </div>

      {/* 고정 요약 카드 */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-red-400 mb-1">QR 대상 총계</p>
            <p className="text-2xl font-bold text-red-600">{filtered.length}<span className="text-sm font-normal ml-1">개</span></p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs text-orange-400 mb-1">7일 기준 초과</p>
            <p className="text-2xl font-bold text-orange-500">{by7d.length}<span className="text-sm font-normal ml-1">개</span></p>
            <p className="text-xs text-orange-300 mt-0.5">소진율 ≥ {((data[0]?.qr_rate_7d ?? 0.05) * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-red-400 mb-1">30일 기준 초과</p>
            <p className="text-2xl font-bold text-red-600">{by30d.length}<span className="text-sm font-normal ml-1">개</span></p>
            <p className="text-xs text-red-300 mt-0.5">소진율 ≥ {((data[0]?.qr_rate_30d ?? 0.30) * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs text-purple-400 mb-1">총 QR 필요 수량</p>
            <p className="text-2xl font-bold text-purple-600">{totalQrQty.toLocaleString()}<span className="text-sm font-normal ml-1">개</span></p>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="스타일코드 / 스타일명..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 outline-none focus:border-red-300 transition"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="전체">전체 기준</option>
          <option value="7d">7일 기준</option>
          <option value="30d">30일 기준</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length}개 스타일</span>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse text-sm">데이터 불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-green-500 text-sm font-medium">🎉 QR 대상 스타일이 없습니다!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-50 border-b border-red-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">QR 기준</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">카테고리</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">연도·시즌</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">스타일코드</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">스타일명</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400">판매일수</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400">판매량</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400">재고수량</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400">소진율</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400">3개월 소진율</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-purple-500">QR 필요 수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d) => (
                  <tr key={d.style_id} className="hover:bg-red-50/30 transition">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-bold px-2 py-1 rounded-full ${
                        d.qr_reason === "30d" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                      }`}>
                        🔴 {d.qr_reason === "30d" ? "30일 기준" : "7일 기준"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">{d.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex gap-1">
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-1.5 py-0.5 rounded">{YEAR_MAP[d.year_code] ?? d.year_code}</span>
                        <span className="bg-purple-50 text-purple-600 text-xs px-1.5 py-0.5 rounded">{SEASON_MAP[d.season_code] ?? d.season_code}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.style_code}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-44 truncate">{d.name ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{d.days_since_first_sale}일</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{d.total_sold.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{d.total_remaining.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">{d.depletion_rate.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      {d.depletion_rate_3m !== null ? `${d.depletion_rate_3m.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {d.qr_qty.toLocaleString()}개
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
