"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 30;

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
    <span className="inline-flex gap-0.5">
      <span className="bg-indigo-50 text-indigo-600 text-xs px-1 py-0.5 rounded font-medium">{YEAR_MAP[y] ?? y}</span>
      <span className="bg-purple-50 text-purple-600 text-xs px-1 py-0.5 rounded font-medium">{SEASON_MAP[s] ?? s + "Q"}</span>
    </span>
  );
}

function SalesBadge({ needsQr, reason }: { needsQr: boolean; reason: string }) {
  if (reason === "no_sales")       return <span className="text-gray-300 text-xs">-</span>;
  if (reason === "soldout")        return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Sold Out</span>;
  if (reason === "season_end")     return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Season End</span>;
  if (reason === "high_velocity")  return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">🔴 QR (Velocity)</span>;
  if (needsQr)                     return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">🔴 QR Needed</span>;
  if (reason === "warning")        return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">🟡 Watch</span>;
  return                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">🟢 Good</span>;
}

export default function DepletionPage() {
  const [data, setData] = useState<StyleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [seasonFilter, setSeasonFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("sold_1m");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [qrOnly, setQrOnly] = useState(false);
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
        .order("depletion_rate", { ascending: false })
        .limit(2000);
      if (error) console.error(error);
      else setData((rows as StyleRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() =>
    ["All", ...[...new Set(data.map((d) => d.category).filter(Boolean))].sort()], [data]);
  const years = useMemo(() =>
    ["All", ...[...new Set(data.map((d) => YEAR_MAP[d.year_code] ?? d.year_code))].sort()], [data]);
  const seasons = useMemo(() =>
    ["All", ...[...new Set(data.map((d) => SEASON_MAP[d.season_code] ?? d.season_code + "Q"))].sort()], [data]);

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
      if (category !== "All" && d.category !== category) return false;
      if (yearFilter !== "All" && (YEAR_MAP[d.year_code] ?? d.year_code) !== yearFilter) return false;
      if (seasonFilter !== "All" && (SEASON_MAP[d.season_code] ?? d.season_code + "Q") !== seasonFilter) return false;
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

  useEffect(() => { setPage(1); }, [search, category, yearFilter, seasonFilter, sortKey, sortDir, qrOnly]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };
  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === "desc" ? " ▼" : " ▲") : "";

  const th = "px-2 py-2 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap";
  const thFixed = "px-2 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap";

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Depletion Dashboard</h1>
        <p className="text-xs text-gray-400 mt-1">
          Cumulative Depletion = Sales ÷ Total Stock In &nbsp;|&nbsp; 1M Depletion (green) = Sales within 30 days of first sale ÷ Total Stock In
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        {[
          { label: "Total Sales",     value: totals.sold.toLocaleString(),      unit: "pcs",    color: "text-indigo-600" },
          { label: "Remaining Stock", value: totals.remaining.toLocaleString(), unit: "pcs",    color: "text-amber-500"  },
          { label: "Total Stock In",  value: totals.stock.toLocaleString(),     unit: "pcs",    color: "text-gray-700"   },
          { label: "Avg Depletion",   value: totals.avgRate.toFixed(1),         unit: "%",      color: "text-emerald-600"},
          { label: "QR Needed",       value: totals.qr.toLocaleString(),        unit: "styles", color: "text-red-500"    },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>
              {c.value}<span className="text-xs font-normal text-gray-400 ml-1">{c.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 mb-3 flex flex-wrap gap-2 items-center">
        <input
          type="text" placeholder="Style code / name..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none">
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none">
          {seasons.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={qrOnly} onChange={(e) => setQrOnly(e.target.checked)} className="accent-red-500" />
          QR Only
        </label>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} styles · {totalPages} pages</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse text-sm">Loading data...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No styles match the current filters.</div>
        ) : (
          <>
            {/* Top scrollbar */}
            <div
              ref={topScrollRef}
              className="overflow-x-auto border-b border-gray-100"
              style={{ height: 12 }}
            >
              <div style={{ width: innerWidth, height: 1 }} />
            </div>

            {/* Table body */}
            <div ref={tableWrapRef} className="overflow-x-auto">
              <table ref={tableInnerRef} className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={thFixed}>Cat.</th>
                    <th className={thFixed}>Year · Season</th>
                    <th className={th} onClick={() => handleSort("style_code")}>Style Code{sortIcon("style_code")}</th>
                    <th className={thFixed}>Style Name</th>
                    <th className={`${th} text-right`} onClick={() => handleSort("sold_1m")}>
                      <span className={sortKey === "sold_1m" ? "text-indigo-500" : ""}>Last 1M{sortIcon("sold_1m")}</span>
                    </th>
                    <th className={`${th} text-right`} onClick={() => handleSort("total_sold")}>Total Sales{sortIcon("total_sold")}</th>
                    <th className={`${thFixed} text-right`}>Remaining</th>
                    <th className={`${thFixed} text-right`}>Stock In</th>
                    <th className={th} onClick={() => handleSort("depletion_rate")}>Depletion{sortIcon("depletion_rate")}</th>
                    <th className={th} onClick={() => handleSort("depletion_rate_3m")}>
                      <span className="text-emerald-600">1M Dep.{sortIcon("depletion_rate_3m")}</span>
                    </th>
                    <th className={thFixed}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((d) => (
                    <tr key={d.style_id} className={`hover:bg-gray-50 transition ${d.needs_qr ? "bg-red-50/20" : ""}`}>
                      <td className="px-2 py-1.5">
                        <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded font-medium">{d.category}</span>
                      </td>
                      <td className="px-2 py-1.5"><SeasonBadge y={d.year_code} s={d.season_code} /></td>
                      <td className="px-2 py-1.5 font-mono text-xs text-gray-700 whitespace-nowrap">{d.style_code}</td>
                      <td className="px-2 py-1.5 text-gray-700 max-w-48 truncate">{d.name ?? "-"}</td>
                      <td className="px-2 py-1.5 text-right">
                        <span className={`font-bold ${d.sold_1m > 0 ? "text-indigo-600" : "text-gray-300"}`}>
                          {d.sold_1m.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{d.total_sold.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{d.total_remaining.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right text-gray-400">{d.total_stock.toLocaleString()}</td>
                      <td className="px-2 py-1.5 min-w-28">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${d.depletion_rate >= 70 ? "bg-red-500" : d.depletion_rate >= 40 ? "bg-amber-400" : "bg-indigo-500"}`}
                              style={{ width: `${Math.min(d.depletion_rate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-9 text-right ${d.depletion_rate >= 70 ? "text-red-500" : d.depletion_rate >= 40 ? "text-amber-500" : "text-indigo-600"}`}>
                            {d.depletion_rate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 min-w-28">
                        {d.depletion_rate_3m !== null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-400"
                                style={{ width: `${Math.min(d.depletion_rate_3m, 100)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-emerald-600 w-9 text-right">
                              {d.depletion_rate_3m.toFixed(1)}%
                            </span>
                          </div>
                        ) : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <SalesBadge needsQr={d.needs_qr} reason={d.qr_reason} />
                      </td>
                    </tr>
                  ))}
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
