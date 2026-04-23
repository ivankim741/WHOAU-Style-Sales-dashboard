"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface StyleDepletion {
  style_id: number;
  style_code: string;
  name: string;
  season: string;
  category: string;
  year_code: string;
  season_code: string;
  total_sold: number;
  total_remaining: number;
  total_stock: number;
  depletion_rate: number;
  depletion_rate_3m: number | null;
  first_sale_date: string | null;
  needs_qr: boolean;
  qr_reason: string;
}

const YEAR_MAP: Record<string, string> = {
  A: "'21", B: "'22", C: "'23", D: "'24", E: "'25", F: "'26",
};
const SEASON_MAP: Record<string, string> = {
  "1": "1Q", "2": "2Q", "3": "3Q", "4": "4Q",
};

function SeasonBadge({ yearCode, seasonCode }: { yearCode: string; seasonCode: string }) {
  const year = YEAR_MAP[yearCode] ?? yearCode;
  const season = SEASON_MAP[seasonCode] ?? seasonCode + "Q";
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="bg-indigo-50 text-indigo-600 text-xs px-1.5 py-0.5 rounded font-medium">{year}</span>
      <span className="bg-purple-50 text-purple-600 text-xs px-1.5 py-0.5 rounded font-medium">{season}</span>
    </span>
  );
}

function DepletionBar({ rate, rate3m }: { rate: number; rate3m: number | null }) {
  const color = rate >= 70 ? "bg-red-500" : rate >= 40 ? "bg-amber-400" : "bg-indigo-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
        </div>
        <span className={`text-xs font-bold w-10 text-right ${rate >= 70 ? "text-red-500" : rate >= 40 ? "text-amber-500" : "text-indigo-600"}`}>
          {rate.toFixed(1)}%
        </span>
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

function QRBadge({ reason }: { reason: string }) {
  if (reason === "normal" || reason === "no_sales") return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      reason === "30d" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
    }`}>
      🔴 QR {reason === "30d" ? "30일" : "7일"}
    </span>
  );
}

export default function DepletionPage() {
  const [data, setData] = useState<StyleDepletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [yearFilter, setYearFilter] = useState("전체");
  const [seasonFilter, setSeasonFilter] = useState("전체");
  const [sortBy, setSortBy] = useState<"depletion_rate" | "total_sold" | "style_code" | "depletion_rate_3m">("depletion_rate");
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
      else setData(rows ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => ["전체", ...[...new Set(data.map((d) => d.category).filter(Boolean))].sort()], [data]);
  const years = useMemo(() => ["전체", ...[...new Set(data.map((d) => YEAR_MAP[d.year_code] ?? d.year_code).filter(Boolean))].sort()], [data]);
  const seasons = useMemo(() => ["전체", ...[...new Set(data.map((d) => SEASON_MAP[d.season_code] ?? d.season_code).filter(Boolean))].sort()], [data]);

  // 전체 합계
  const totals = useMemo(() => ({
    sold: data.reduce((s, d) => s + d.total_sold, 0),
    remaining: data.reduce((s, d) => s + d.total_remaining, 0),
    stock: data.reduce((s, d) => s + d.total_stock, 0),
    qr: data.filter((d) => d.needs_qr).length,
    avgRate: data.filter((d) => d.total_stock > 0).reduce((s, d, _, a) => s + d.depletion_rate / a.length, 0),
  }), [data]);

  const filtered = useMemo(() => {
    return data
      .filter((d) => {
        if (qrOnly && !d.needs_qr) return false;
        if (category !== "전체" && d.category !== category) return false;
        if (yearFilter !== "전체" && (YEAR_MAP[d.year_code] ?? d.year_code) !== yearFilter) return false;
        if (seasonFilter !== "전체" && (SEASON_MAP[d.season_code] ?? d.season_code) !== seasonFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return d.style_code.toLowerCase().includes(q) || (d.name ?? "").toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        const v = sortDir === "desc" ? -1 : 1;
        if (sortBy === "style_code") return v * a.style_code.localeCompare(b.style_code);
        if (sortBy === "depletion_rate_3m") {
          return v * ((a.depletion_rate_3m ?? 0) - (b.depletion_rate_3m ?? 0));
        }
        return v * ((a[sortBy] as number) - (b[sortBy] as number));
      });
  }, [data, search, category, yearFilter, seasonFilter, sortBy, sortDir, qrOnly]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  const Th = ({ col, children }: { col: typeof sortBy; children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none"
      onClick={() => toggleSort(col)}>
      {children}{sortBy === col ? (sortDir === "desc" ? " ▼" : " ▲") : ""}
    </th>
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">소진율 대시보드</h1>
        <p className="text-xs text-gray-400 mt-1">소진율 = 판매량 ÷ 입고총량 &nbsp;|&nbsp; 3개월 소진율 = 입고 후 90일 이내 판매량 ÷ 입고총량</p>
      </div>

      {/* 고정 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "총 판매량",  value: totals.sold.toLocaleString(),      unit: "건", color: "text-indigo-600" },
          { label: "총 재고수량", value: totals.remaining.toLocaleString(), unit: "개", color: "text-amber-500" },
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
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">카테고리</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">연도·시즌</th>
                  <Th col="style_code">스타일코드</Th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">스타일명</th>
                  <Th col="total_sold">판매량</Th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">재고수량</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">입고총량</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 min-w-44">
                    <Th col="depletion_rate">소진율</Th>
                    <div className="text-[10px] text-emerald-500 font-normal -mt-1 cursor-pointer" onClick={() => toggleSort("depletion_rate_3m")}>
                      └ 3개월{sortBy === "depletion_rate_3m" ? (sortDir === "desc" ? " ▼" : " ▲") : ""}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d) => (
                  <tr key={d.style_id} className={`hover:bg-gray-50 transition ${d.needs_qr ? "bg-red-50/20" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">{d.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <SeasonBadge yearCode={d.year_code} seasonCode={d.season_code} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.style_code}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-44 truncate">{d.name ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{d.total_sold.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{d.total_remaining.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{d.total_stock.toLocaleString()}</td>
                    <td className="px-4 py-3 min-w-44">
                      <DepletionBar rate={d.depletion_rate} rate3m={d.depletion_rate_3m} />
                    </td>
                    <td className="px-4 py-3"><QRBadge reason={d.qr_reason} /></td>
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
