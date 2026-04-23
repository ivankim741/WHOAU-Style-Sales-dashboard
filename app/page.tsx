"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface StyleDepletion {
  style_id: number;
  style_code: string;
  name: string;
  season: string;
  category: string;
  total_sold: number;
  total_remaining: number;
  total_stock: number;
  depletion_rate: number;
  first_sale_date: string | null;
  last_sale_date: string | null;
  needs_qr: boolean;
  qr_reason: string;
}

function DepletionBar({ rate }: { rate: number }) {
  const color =
    rate >= 70 ? "bg-red-500" :
    rate >= 40 ? "bg-amber-400" :
    "bg-indigo-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${rate >= 70 ? "text-red-500" : rate >= 40 ? "text-amber-500" : "text-indigo-600"}`}>
        {rate.toFixed(1)}%
      </span>
    </div>
  );
}

function QRBadge({ reason }: { reason: string }) {
  if (reason === "normal" || reason === "no_sales") return null;
  return (
    <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
      🔴 QR {reason === "30d" ? "30일" : "7일"}
    </span>
  );
}

export default function DepletionPage() {
  const [data, setData] = useState<StyleDepletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [sortBy, setSortBy] = useState<"depletion_rate" | "total_sold" | "style_code">("depletion_rate");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [qrOnly, setQrOnly] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from("style_qr_status")
        .select("*")
        .order("depletion_rate", { ascending: false })
        .limit(2000);
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

  const summary = useMemo(() => {
    const valid = data.filter((d) => d.total_stock > 0);
    const qr = data.filter((d) => d.needs_qr);
    const avgRate = valid.length ? valid.reduce((s, d) => s + d.depletion_rate, 0) / valid.length : 0;
    return { total: data.length, avgRate, qrCount: qr.length, totalSold: data.reduce((s, d) => s + d.total_sold, 0) };
  }, [data]);

  const filtered = useMemo(() => {
    return data
      .filter((d) => {
        if (qrOnly && !d.needs_qr) return false;
        if (category !== "전체" && d.category !== category) return false;
        if (search) {
          const q = search.toLowerCase();
          return d.style_code.toLowerCase().includes(q) || (d.name ?? "").toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        const v = sortDir === "desc" ? -1 : 1;
        if (sortBy === "style_code") return v * a.style_code.localeCompare(b.style_code);
        return v * (a[sortBy] - b[sortBy]);
      });
  }, [data, search, category, sortBy, sortDir, qrOnly]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? <span className="ml-1">{sortDir === "desc" ? "▼" : "▲"}</span> : null;

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">소진율 대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">스타일별 판매/재고 현황 및 소진율</p>
      </div>

      {/* 요약 카드 */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "총 스타일", value: summary.total.toLocaleString(), unit: "개", color: "text-indigo-600" },
            { label: "평균 소진율", value: summary.avgRate.toFixed(1), unit: "%", color: "text-amber-500" },
            { label: "QR 대상", value: summary.qrCount.toLocaleString(), unit: "개", color: "text-red-500" },
            { label: "총 판매량", value: summary.totalSold.toLocaleString(), unit: "건", color: "text-emerald-600" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}<span className="text-sm font-normal text-gray-400 ml-1">{c.unit}</span></p>
            </div>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="스타일코드 / 스타일명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 transition"
        >
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={qrOnly} onChange={(e) => setQrOnly(e.target.checked)} className="accent-red-500" />
          QR 대상만
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
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">카테고리</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => toggleSort("style_code")}>
                  스타일코드<SortIcon col="style_code" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">스타일명</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => toggleSort("total_sold")}>
                  판매량<SortIcon col="total_sold" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">잔여재고</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">입고총량</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 min-w-40" onClick={() => toggleSort("depletion_rate")}>
                  소진율<SortIcon col="depletion_rate" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((d) => (
                <tr key={d.style_id} className={`hover:bg-gray-50 transition ${d.needs_qr ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">{d.category}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.style_code}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-48 truncate">{d.name ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{d.total_sold.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{d.total_remaining.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{d.total_stock.toLocaleString()}</td>
                  <td className="px-4 py-3 min-w-40"><DepletionBar rate={d.depletion_rate} /></td>
                  <td className="px-4 py-3"><QRBadge reason={d.qr_reason} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
