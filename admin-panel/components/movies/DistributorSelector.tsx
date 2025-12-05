// components/movies/DistributorSelector.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { DistributorSimple } from "@/types/movie";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DistributorSelectorProps {
  distributors: DistributorSimple[];
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}

export function DistributorSelector({ distributors, value, onChange }: DistributorSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [topDistributors, setTopDistributors] = useState<DistributorSimple[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 상위 배급사 목록 가져오기
  useEffect(() => {
    const fetchTopDistributors = async () => {
      try {
        const response = await fetch("/admin/api/distributors/top-by-movies?limit=10");
        if (response.ok) {
          const data = await response.json();
          setTopDistributors(data);
        }
      } catch (error) {
        console.error("상위 배급사 목록 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopDistributors();
  }, []);

  // 검색어에 따라 필터링된 배급사 목록
  const filteredDistributors = useMemo(() => {
    if (!searchQuery.trim()) {
      // 검색어가 없으면 상위 배급사 목록 표시
      return topDistributors;
    }

    // 검색어가 있으면 전체 배급사에서 검색
    return distributors.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, distributors, topDistributors]);

  // 현재 선택된 배급사 이름 찾기
  const selectedDistributor = distributors.find(d => d.id === value);

  const handleSelect = (distributorId: number | null) => {
    onChange(distributorId);
    setSearchQuery("");
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center">
        <Building2 className="h-4 w-4 mr-1 text-[#4da34c]" />
        배급사
      </Label>

      {/* 현재 선택된 배급사 표시 */}
      {selectedDistributor && (
        <div className="flex items-center justify-between p-2 bg-[#f5fbf5] border border-[#4da34c] rounded-md">
          <span className="text-sm font-medium text-[#333333]">
            {selectedDistributor.name}
          </span>
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* 검색 입력 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="배급사 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
        />
      </div>

      {/* 배급사 목록 */}
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
        {isLoading ? (
          <div className="p-3 text-center text-gray-500 text-sm">
            로딩 중...
          </div>
        ) : filteredDistributors.length === 0 ? (
          <div className="p-3 text-center text-gray-500 text-sm">
            {searchQuery ? "검색 결과가 없습니다" : "배급사가 없습니다"}
          </div>
        ) : (
          <>
            {!searchQuery && (
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                <span className="text-xs text-gray-500 font-medium">
                  작품 등록 상위 10개 배급사
                </span>
              </div>
            )}
            {/* 선택 안함 옵션 */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-100",
                !value && "bg-[#f5fbf5]"
              )}
            >
              <span className="text-gray-500">선택 안함</span>
              {!value && <Check className="h-4 w-4 text-[#4da34c]" />}
            </button>
            {filteredDistributors.map((distributor) => (
              <button
                key={distributor.id}
                type="button"
                onClick={() => handleSelect(distributor.id)}
                disabled={!distributor.isActive}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0",
                  value === distributor.id && "bg-[#f5fbf5]",
                  !distributor.isActive && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className={distributor.isActive ? "text-gray-700" : "text-gray-400"}>
                  {distributor.name}
                  {!distributor.isActive && " (비활성)"}
                </span>
                {value === distributor.id && <Check className="h-4 w-4 text-[#4da34c]" />}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
