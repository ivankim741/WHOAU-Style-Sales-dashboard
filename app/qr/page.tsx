"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef } from "react";
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
  sold_7d: number;
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
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Top scrollbar sync
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableInnerRef = useRef<HTMLTableElement>(null);
  const [innerWidth, setInnerWidth] = useState(0);

  useEffect(() => {
    const wrap = tableWrapRef.current;
    const top  = topScrollRef.current;
    if (!wrap || !top) return;
    let busy = false;
    const onWrap = () => { if (!busy) { busy = true; top.scrollLeft  = wrap.scrollLeft; busy = false; } };
    const onTop  = () => { if (!busy) { busy = true; wrap.scrollLeft = top.scrollLeft;  busy = false; } };
    wrap.addEventListener("scroll", onWrap);
    top.addEventListener("scroll", onTop);
    return () => { wrap.removeEventListener("scroll", onWrap); top.removeEventListener("scroll", onTop); };
  }, []);

  useEffect(() => {
    if (tableInnerRef.current) setInnerWidth(tableInnerRef.current.offsetWidth);
  }, [loading, page]);

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
    ["All", ...[...new Set(data.map((d) => d.category).filter(Boolean))].sort()], [data]);

  const filtered = useMemo(() => data.filter((d) => {
    if (category !== "All" && d.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.style_code.toLowerCase().includes(q) || (d.name ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [data, search, category]);

  useEffect(() => { setPage(1); }, [search, category]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const totalQrNeeded     = filtered.reduce((s, d) => s + d.qr_needed_qty, 0);
  const totalProjected    = filtered.reduce((s, d) => s + d.projected_sales_remaining, 0);
  const estimatedFillDate = data[0]?.estimated_fill_date ?? "";

  const thR = "px-2 py-2 text-right text-xs font-semibold whitespace-nowrap";
  const thL = "px-2 py-2 text-left  text-xs font-semibold whitespace-nowrap";

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">🔴 QR Order Dashboard</h1>
        <p className="text-xs text-gray-400 mt-1">
          QR Qty Needed = Projected Sales until Season End − Remaining Stock &nbsp;|&nbsp; Est. Fill Date = Today + 60 days (lead time)
        </p>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs text-red-400 mb-0.5">QR Styles</p>
            <p className="text-xl font-bold text-red-600">{filtered.length}<span className="text-sm font-normal ml-1">styles</span></p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <p className="text-xs text-orange-400 mb-0.5">Est. Fill Date</p>
            <p className="text-lg font-bold text-orange-600">{fmt(estimatedFillDate)}</p>
            <p className="text-xs text-orange-300 mt-0.5">Today + 60 days</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <p className="text-xs text-purple-400 mb-0.5">Total QR Qty Needed</p>
            <p className="text-xl font-bold text-purple-600">{totalQrNeeded.toLocaleString()}<span className="text-sm font-normal ml-1">pcs</span></p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <p className="text-xs text-indigo-400 mb-0.5">Total Projected Sales</p>
            <p className="text-xl font-bold text-indigo-600">{totalProjected.toLocaleString()}<span className="text-sm font-normal ml-1">pcs</span></p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 mb-3 flex flex-wrap gap-2 items-center">
        <input
          type="text" placeholder="Style code / name..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 outline-none focus:border-red-300 transition"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} styles · {totalPages} pages</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse text-sm">Loading data...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-green-500 text-sm font-medium">🎉 No styles require QR orders!</div>
        ) : (
          <>
            {/* Top scrollbar */}
            <div ref={topScrollRef} className="overflow-x-auto border-b border-gray-100" style={{ height: 12 }}>
              <div style={{ width: innerWidth, height: 1 }} />
            </div>

            <div ref={tableWrapRef} className="overflow-x-auto">
              <table ref={tableInnerRef} className="w-full text-xs">
                <thead className="bg-red-50 border-b border-red-100">
                  <tr>
                    <th className={`${thL} text-red-400`}>Cat.</th>
                    <th className={`${thL} text-red-400`}>Year · Season</th>
                    <th className={`${thL} text-red-400`}>Style Code</th>
                    <th className={`${thL} text-red-400`}>Style Name</th>
                    <th className={`${thR} text-red-400`}>Sell Days</th>
                    <th className={`${thR} text-red-400`}>Daily Avg</th>
                    <th className={`${thR} text-red-400`}>Depletion</th>
                    <th className={`${thR} text-orange-400`}>7D Sales</th>
                    <th className={`${thR} text-red-400`}>Remaining</th>
                    <th className={`${thR} text-red-400`}>Season End</th>
                    <th className={`${thR} text-orange-400`}>Fill Date</th>
                    <th className={`${thR} text-indigo-400`}>Proj. Sales</th>
                    <th className={`${thR} text-purple-500`}>QR Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((d) => {
                    const urgentStock = d.total_remaining < d.daily_avg_sold * 14;
                    return (
                      <tr key={d.style_id} className="hover:bg-red-50/30 transition">
                        <td className="px-2 py-1.5">
                          <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded font-medium">{d.category}</span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="inline-flex gap-0.5">
                            <span className="bg-indigo-50 text-indigo-600 text-xs px-1 py-0.5 rounded">{YEAR_MAP[d.year_code] ?? d.year_code}</span>
                            <span className="bg-purple-50 text-purple-600 text-xs px-1 py-0.5 rounded">{SEASON_MAP[d.season_code] ?? d.season_code}</span>
                          </span>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-xs text-gray-700 whitespace-nowrap">{d.style_code}</td>
                        <td className="px-2 py-1.5 text-gray-700 max-w-40 truncate">{d.name ?? "-"}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{d.days_since_first_sale}d</td>
                        <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{d.daily_avg_sold.toFixed(1)}</td>
                        <td className="px-2 py-1.5 text-right font-bold text-red-500">{d.depletion_rate.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right">
                          <span className={d.sold_7d >= 70 ? "font-bold text-orange-600" : d.sold_7d >= 40 ? "font-semibold text-yellow-600" : "text-gray-500"}>
                            {d.sold_7d.toLocaleString()}
                            {d.sold_7d >= 70 && <span className="ml-0.5">🔴</span>}
                            {d.sold_7d >= 40 && d.sold_7d < 70 && <span className="ml-0.5">🟡</span>}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <span className={urgentStock ? "font-bold text-red-600" : "text-gray-500"}>
                            {d.total_remaining.toLocaleString()}
                            {urgentStock && <span className="ml-0.5">⚠️</span>}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-500 whitespace-nowrap">
                          {fmt(d.season_end_date)}
                          <span className="block text-gray-300 text-xs">({d.days_until_season_end}d)</span>
                        </td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">
                          <span className="font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded text-xs">
                            {fmt(d.estimated_fill_date)}
                          </span>
                          <span className="block text-gray-300 text-xs mt-0.5">{d.sellable_days_after_fill}d sell</span>
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold text-indigo-600">
                          {d.projected_sales_remaining.toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {d.qr_needed_qty > 0 ? (
                            <span className="font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                              {d.qr_needed_qty.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-green-500">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
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
