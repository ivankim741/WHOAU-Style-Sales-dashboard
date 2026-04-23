"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface StyleRow {
  style_id: number;
  style_code: string;
  name: string;
  season: string;
  category: string;
  year_code: string;
  season_code: string;
  total_sold: number;
  sold_1m: number;
  total_remaining: number;
  total_stock: number;
  depletion_rate: number;
  depletion_rate_3m: number | null;
  first_sale_date: string | null;
  days_since_first_sale: number | null;
  needs_qr: boolean;
  qr_reason: string;
}

type SortKey = "depletion_rate" | "depletion_rate_3m" | "total_sold" | "sold_1m" | "style_code";

const YEAR_MAP: Record<string, string> = {
  A: "'21", B: "'22", C: "'23", D: "'24", E: "'25", F: "'26", G: "'26",
};
const SEASON_MAP: Record<string, string> = {
  "1": "1Q", "2": "2Q", "3": "3Q", "4": "4Q",
};

function SeasonBadge({ y, s }: { y: string; s: string }) {
  return (
    <span className="inline-flex gap-1">
      <span className="bg-indigo-50 text-indigo-600 text-xs px-1.5 py-0.5 rounded font-medium">
        {YEAR_MAP[y] ?? y}
      </span>
      <span className="bg-purple-50 text-purple-600 text-xs px-1.5 py-0.5 rounded font-medium">
        {SEASON_MAP[s] ?? s + "Q"}
      </span>
    </span>
  );
}

function DepletionBar({ rate, rate3m }: { rate: number; rate3m: number | null }) {
  const color = rate >= 70 ? "bg-red-500" : rate >= 40 ? "bg-amber-400" : "bg-indigo-500";
  const textColor = rate >= 70 ? "text-red-500" : rate >= 40 ? "text-amber-500" : "text-indigo-600";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
        </div>
        <span className={`text-xs font-bold w-10 text-right ${textColor}`}>{rate.toFixed(1)}%</span>
      </div>
      {rate3m !== null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(rate3m, 100)}%` }} />
          </div>
          <span className="text-xs text-emerald-600 w-10 text-right">{rate3m.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function SalesBadge({ days, rate }: { days: number | null; rate: number }) {
  if (days === null || days < 7) {
    return <span className="text-gray-300 text-xs">-</span>;
  }
  const isRed    = (days >= 7  && rate >= 5)  || (days >= 14 && rate >= 10);
  const isYellow = (days >= 7  && rate >= 4)  || (days >= 14 && rate >= 8);
  if (isRed)    return <span className="inline-flex items-center whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">🔴 QR 필요</span>;
  if (isYellow) return <span className="inline-flex items-center whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">🟡 주의</span>;
  return          <span className="inline-flex items-center whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-600">🟢 양호</span>;
}

export default function DepletionPage() {
  const [data, setData] = useState<StyleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [yearFilter, setYearFilter] = useState("전체");
  const [seasonFilter, setSeasonFilter] = useState("전체");
  const [sortKey, setSortKey] = useState<SortKey>("sold_1m");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [qrOnly, setQrOnly] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from("style_qr_status")
        .select("*")
        .order("depletion_rate", { ascending: false })
        .limit(2000);
      if (error) console.error(error);
      else setData((rows as StyleRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() =>
    ["전체", ...[...new Set(data.map((d) => d.category).filter(Boolean))].sort()], [data]);
  const years = useMemo(() =>
    ["전체", ...[...new Set(data.map((d) => YEAR_MAP[d.year_code] ?? d.year_code))].sort()], [data]);
  const seasons = useMemo(() =>
    ["전체", ...[...new Set(data.map((d) => SEASON_MAP[d.season_code] ?? d.season_code + "Q"))].sort()], [data]);

  const totals = useMemo(() => ({
    sold:      data.reduce((s, d) => s + d.total_sold, 0),
    remaining: data.reduce((s, d) => s + d.total_remaining, 0),
    stock:     data.reduce((s, d) => s + d.total_stock, 0),
    qr:        data.filter((d) => d.needs_qr).length,
    avgRate:   data.filter((d) => d.total_stock > 0).reduce((s, d, _, a) => s + d.depletion_rate / a.length, 0),
  }), [data]);

  const filtered = useMemo(() => {
    const arr = data.filter((d) => {
      if (qrOnly && !d.needs_qr) return false;
      if (category !== "전체" && d.category !== category) return false;
      if (yearFilter !== "전체" && (YEAR_MAP[d.year_code] ?? d.year_code) !== yearFilter) return false;
      if (seasonFilter !== "전체" && (SEASON_MAP[d.season_code] ?? d.season_code + "Q") !== seasonFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.style_code.toLowerCase().includes(q) || (d.name ?? "").toLowerCase().includes(q);
      }
      return true;
    });

    return arr.sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortKey === "style_code") return dir * a.style_code.localeCompare(b.style_code);
      if (sortKey === "depletion_rate_3m") return dir * ((a.depletion_rate_3m ?? 0) - (b.depletion_rate_3m ?? 0));
      if (sortKey === "total_sold") return dir * (a.total_sold - b.total_sold);
      if (sortKey === "sold_1m") return dir * (a.sold_1m - b.sold_1m);
      return dir * (a.depletion_rate - b.depletion_rate);
    });
  }, [data, search, category, yearFilter, seasonFilter, sortKey, sortDir, qrOnly]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === "desc" ? " ▼" : " ▲") : "";

  const thClass = "px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">소진율 대시보드</h1>
        <p className="text-xs text-gray-400 mt-1">
          누적 소진율 = 판매량 ÷ 입고총량 &nbsp;|&nbsp; 1개월 소진율(초록) = 판매 시작 후 30일 이내 판매량 ÷ 입고총량
        </p>
      </div>

      {/* 고정 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "총 판매량",   value: totals.sold.toLocaleString(),      unit: "건", color: "text-indigo-600" },
          { label: "총 재고수량", value: totals.remaining.toLocaleString(), unit: "개", color: "text-amber-500"  },
          { label: "총 입고총량", value: totals.stock.toLocaleString(),     unit: "개", color: "text-gray-700"   },
          { label: "평균 소진율", value: totals.avgRate.toFixed(1),         unit: "%",  color: "text-emerald-600"},
          { label: "QR 대상",    value: totals.qr.toLocaleString(),         unit: "개", color: "text-red-500"    },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>
              {c.value}<span className="text-xs font-normal text-gray-400 ml-1">{c.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="스타일코드 / 스타일명..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-52 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
          {seasons.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={qrOnly} onChange={(e) => setQrOnly(e.target.checked)} className="accent-red-500" />
          QR만 보기
        </label>
        <span className="ml-auto text-xs text-gray-400">{filtered.length}개 스타일</span>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse text-sm">데이터 불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">조건에 맞는 스타일이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">카테고리</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">연도·시즌</th>
                  <th className={thClass} onClick={() => handleSort("style_code")}>스타일코드{sortIcon("style_code")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">스타일명</th>
                  <th className={thClass} onClick={() => handleSort("sold_1m")}>
                    <span className={sortKey === "sold_1m" ? "text-indigo-500" : ""}>최근 1개월{sortIcon("sold_1m")}</span>
                  </th>
                  <th className={thClass} onClick={() => handleSort("total_sold")}>전체 판매량{sortIcon("total_sold")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">재고수량</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">입고총량</th>
                  <th className={thClass} onClick={() => handleSort("depletion_rate")}>
                    누적 소진율{sortIcon("depletion_rate")}
                  </th>
                  <th className={thClass} onClick={() => handleSort("depletion_rate_3m")}>
                    <span className="text-emerald-600">1개월 소진율{sortIcon("depletion_rate_3m")}</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">판매 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d) => (
                  <tr key={d.style_id} className={`hover:bg-gray-50 transition ${d.needs_qr ? "bg-red-50/20" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">{d.category}</span>
                    </td>
                    <td className="px-2 py-3"><SeasonBadge y={d.year_code} s={d.season_code} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.style_code}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-64 truncate">{d.name ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${d.sold_1m > 0 ? "text-indigo-600" : "text-gray-300"}`}>
                        {d.sold_1m.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{d.total_sold.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{d.total_remaining.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{d.total_stock.toLocaleString()}</td>
                    <td className="px-4 py-3 min-w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${d.depletion_rate >= 70 ? "bg-red-500" : d.depletion_rate >= 40 ? "bg-amber-400" : "bg-indigo-500"}`}
                            style={{ width: `${Math.min(d.depletion_rate, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-10 text-right ${d.depletion_rate >= 70 ? "text-red-500" : d.depletion_rate >= 40 ? "text-amber-500" : "text-indigo-600"}`}>
                          {d.depletion_rate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-32">
                      {d.depletion_rate_3m !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${Math.min(d.depletion_rate_3m, 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-emerald-600 w-10 text-right">
                            {d.depletion_rate_3m.toFixed(1)}%
                          </span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><SalesBadge days={d.days_since_first_sale} rate={d.depletion_rate} /></td>
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
