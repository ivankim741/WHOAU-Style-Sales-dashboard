"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 30;

interface SkuRow {
  sku_id: number;
  sku_code: string;
  style_code: string;
  style_name: string;
  category: string;
  color_code: string;
  color_name: string;
  size_code: string;
  size_name: string;
  total_sold: number;
  sold_1m: number;
  remaining_qty: number;
  total_stock: number;
  depletion_rate: number;
}

type SortKey = "sold_1m" | "total_sold" | "remaining_qty" | "depletion_rate";

export default function SkuPage() {
  const [data, setData] = useState<SkuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("sold_1m");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
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
        .from("sku_depletion")
        .select("*")
        .order("sold_1m", { ascending: false })
        .limit(3000);
      if (error) console.error(error);
      else setData(rows ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(data.map((d) => d.category).filter(Boolean))].sort();
    return ["All", ...cats];
  }, [data]);

  const filtered = useMemo(() => {
    const arr = data.filter((d) => {
      if (category !== "All" && d.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.sku_code.toLowerCase().includes(q) ||
          d.style_code.toLowerCase().includes(q) ||
          (d.style_name ?? "").toLowerCase().includes(q) ||
          (d.color_name ?? "").toLowerCase().includes(q) ||
          (d.size_name ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
    return arr.sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      return dir * ((a[sortKey] as number) - (b[sortKey] as number));
    });
  }, [data, search, category, sortKey, sortDir]);

  useEffect(() => { setPage(1); }, [search, category, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };
  const icon = (key: SortKey) => sortKey === key ? (sortDir === "desc" ? " ▼" : " ▲") : "";

  const depletionColor = (r: number) => r >= 70 ? "text-red-500" : r >= 40 ? "text-amber-500" : "text-indigo-600";
  const barColor       = (r: number) => r >= 70 ? "bg-red-500"   : r >= 40 ? "bg-amber-400"   : "bg-indigo-500";

  const th = "px-2 py-2 text-xs font-semibold cursor-pointer hover:text-gray-700 select-none whitespace-nowrap";

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">SKU Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sales breakdown by color &amp; size &nbsp;|&nbsp; Default sort: last 1-month sales
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 mb-3 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Style code / Color / Size..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-60 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} SKUs · {totalPages} pages</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse text-sm">Loading data...</div>
        ) : (
          <>
            {/* Top scrollbar */}
            <div ref={topScrollRef} className="overflow-x-auto border-b border-gray-100" style={{ height: 12 }}>
              <div style={{ width: innerWidth, height: 1 }} />
            </div>

            <div ref={tableWrapRef} className="overflow-x-auto">
              <table ref={tableInnerRef} className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={`${th} text-left text-gray-500`}>Cat.</th>
                    <th className={`${th} text-left text-gray-500`}>Style Code</th>
                    <th className={`${th} text-left text-gray-500`}>Color</th>
                    <th className={`${th} text-left text-gray-500`}>Size</th>
                    <th className={`${th} text-right ${sortKey === "sold_1m" ? "text-indigo-600" : "text-gray-500"}`}
                      onClick={() => handleSort("sold_1m")}>Last 1M{icon("sold_1m")}</th>
                    <th className={`${th} text-right ${sortKey === "total_sold" ? "text-indigo-600" : "text-gray-500"}`}
                      onClick={() => handleSort("total_sold")}>Total Sales{icon("total_sold")}</th>
                    <th className={`${th} text-right ${sortKey === "remaining_qty" ? "text-indigo-600" : "text-gray-500"}`}
                      onClick={() => handleSort("remaining_qty")}>Remaining{icon("remaining_qty")}</th>
                    <th className={`${th} text-left min-w-32 ${sortKey === "depletion_rate" ? "text-indigo-600" : "text-gray-500"}`}
                      onClick={() => handleSort("depletion_rate")}>Depletion{icon("depletion_rate")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((d) => (
                    <tr key={d.sku_id} className="hover:bg-gray-50 transition">
                      <td className="px-2 py-1.5">
                        <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded font-medium">{d.category}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="font-mono text-xs text-gray-700 whitespace-nowrap">{d.style_code}</div>
                        <div className="text-xs text-gray-400 truncate max-w-32">{d.style_name}</div>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                          {d.color_code} {d.color_name}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="bg-purple-50 text-purple-600 text-xs px-1.5 py-0.5 rounded">
                          {d.size_name ?? d.size_code}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <span className={`font-bold text-sm ${d.sold_1m > 0 ? "text-indigo-600" : "text-gray-300"}`}>
                          {d.sold_1m.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{d.total_sold.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{d.remaining_qty.toLocaleString()}</td>
                      <td className="px-2 py-1.5 min-w-32">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor(d.depletion_rate)}`}
                              style={{ width: `${Math.min(d.depletion_rate, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-9 text-right ${depletionColor(d.depletion_rate)}`}>
                            {d.depletion_rate.toFixed(1)}%
                          </span>
                        </div>
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
