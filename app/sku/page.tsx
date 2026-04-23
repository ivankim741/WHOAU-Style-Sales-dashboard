"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

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
  remaining_qty: number;
  total_stock: number;
  depletion_rate: number;
}

function DepletionBar({ rate }: { rate: number }) {
  const color = rate >= 70 ? "bg-red-500" : rate >= 40 ? "bg-amber-400" : "bg-indigo-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${rate >= 70 ? "text-red-500" : rate >= 40 ? "text-amber-500" : "text-indigo-600"}`}>
        {rate.toFixed(1)}%
      </span>
    </div>
  );
}

export default function SkuPage() {
  const [data, setData] = useState<SkuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from("sku_depletion")
        .select("*")
        .order("depletion_rate", { ascending: false })
        .limit(3000);
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
  }, [data, search, category]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">SKU 소진율 분석</h1>
        <p className="text-sm text-gray-500 mt-1">컬러 · 사이즈별 세부 소진율</p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="스타일코드 / 컬러 / 사이즈 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
        >
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length}개 SKU</span>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse text-sm">데이터 불러오는 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">카테고리</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">스타일코드</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">컬러</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">사이즈</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">판매량</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">잔여재고</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 min-w-36">소진율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((d) => (
                <tr key={d.sku_id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2.5">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">{d.category}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{d.style_code}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                      {d.color_code} {d.color_name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">
                    <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
                      {d.size_name ?? d.size_code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{d.total_sold.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{d.remaining_qty.toLocaleString()}</td>
                  <td className="px-4 py-2.5 min-w-36"><DepletionBar rate={d.depletion_rate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
