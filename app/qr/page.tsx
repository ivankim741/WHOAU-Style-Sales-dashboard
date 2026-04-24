"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 30;

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
  daily_avg_sold: number;
  season_end_date: string;
  estimated_fill_date: string;
  days_until_season_end: number;
  sellable_days_after_fill: number;
  projected_sales_remaining: number;
  qr_needed_qty: number;
  needs_qr: boolean;
  qr_reason: string;
  qr_rate_7d: number;
  qr_rate_30d: number;
}

const YEAR_MAP: Record<string, string> = { A: "'21", B: "'22", C: "'23", D: "'24", E: "'25", F: "'26", G: "'26" };
const SEASON_MAP: Record<string, string> = { "1": "1Q", "2": "2Q", "3": "3Q", "4": "4Q" };

function fmt(dateStr: string) {
  if (!dateStr) return "-";
  return dateStr.slice(0, 10).replace(/-/g, ".");
}

export default function QRPage() {
  const [data, setData] = useState<QRStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from("style_qr_status")
        .select("*")
        .eq("needs_qr", true)
        .order("qr_needed_qty", { ascending: false })
        .limit(1000);
      if (error) console.error(error);
      else setData(rows ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() =>
    ["전체", ...[...new Set(data.map((d) => d.category).filter(Boolean))].sort()], [data]);

  const filtered = useMemo(() => data.filter((d) => {
    if (category !== "전체" && d.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.style_code.toLowerCase().includes(q) || (d.name ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [data, search, category]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => { setPage(1); }, [search, category]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const totalQrNeeded = filtered.reduce((s, d) => s + d.qr_needed_qty, 0);
  const totalProjected = filtered.reduce((s, d) => s + d.projected_sales_remaining, 0);
  const estimatedFillDate = data[0]?.estimated_fill_date ?? "";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">🔴 QR 오더 대시보드</h1>
        <p className="text-xs text-gray-400 mt-1">
          QR 필요 수량 = 시즌 마감까지 예상 판매량 − 잔여재고 &nbsp;|&nbsp; 예상 필업일 = 오늘 + 60일 (생산 리드타임)
        </p>
      </div>

      {/* 요약 카드 */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-red-400 mb-1">QR 대상 스타일</p>
            <p className="text-2xl font-bold text-red-600">
              {filtered.length}<span className="text-sm font-normal ml-1">개</span>
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs text-orange-400 mb-1">예상 필업일</p>
            <p className="text-xl font-bold text-orange-600">{fmt(estimatedFillDate)}</p>
            <p className="text-xs text-orange-300 mt-0.5">오늘 기준 +60일</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs text-purple-400 mb-1">총 QR 필요 수량</p>
            <p className="text-2xl font-bold text-purple-600">
              {totalQrNeeded.toLocaleString()}<span className="text-sm font-normal ml-1">개</span>
            </p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs text-indigo-400 mb-1">총 앞으로 예상 판매량</p>
            <p className="text-2xl font-bold text-indigo-600">
              {totalProjected.toLocaleString()}<span className="text-sm font-normal ml-1">개</span>
            </p>
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
        <span className="ml-auto text-xs text-gray-400">{filtered.length}개 스타일 · {totalPages}페이지</span>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-red-400 whitespace-nowrap">카테고리</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-red-400 whitespace-nowrap">연도·시즌</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-red-400 whitespace-nowrap">스타일코드</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-red-400">스타일명</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400 whitespace-nowrap">판매일수</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400 whitespace-nowrap">일평균 판매</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400 whitespace-nowrap">소진율</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400 whitespace-nowrap">잔여재고</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-400 whitespace-nowrap">시즌 마감</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-orange-400 whitespace-nowrap">예상 필업일</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-indigo-400 whitespace-nowrap">앞으로 예상 판매량</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-purple-500 whitespace-nowrap">QR 필요 수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((d) => {
                  const urgentStock = d.total_remaining < d.daily_avg_sold * 14;
                  return (
                    <tr key={d.style_id} className="hover:bg-red-50/30 transition">
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
                      <td className="px-4 py-3 text-gray-700 max-w-64 truncate">{d.name ?? "-"}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{d.days_since_first_sale}일</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{d.daily_avg_sold.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-500">{d.depletion_rate.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">
                        <span className={urgentStock ? "font-bold text-red-600" : "text-gray-500"}>
                          {d.total_remaining.toLocaleString()}
                          {urgentStock && <span className="ml-1 text-xs">⚠️</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                        {fmt(d.season_end_date)}
                        <span className="block text-gray-300">({d.days_until_season_end}일 남음)</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs">
                          {fmt(d.estimated_fill_date)}
                        </span>
                        <span className="block text-xs text-gray-300 mt-0.5">판매가능 {d.sellable_days_after_fill}일</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-indigo-600">
                          {d.projected_sales_remaining.toLocaleString()}개
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.qr_needed_qty > 0 ? (
                          <span className="font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded text-sm">
                            {d.qr_needed_qty.toLocaleString()}개
                          </span>
                        ) : (
                          <span className="text-green-500 text-xs">재고 충분</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
