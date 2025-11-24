// app/distributors/page.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDistributors, useDeleteDistributor } from '@/hooks/data/useDistributor';
import { Edit, Trash2, Plus, Loader2, Building, Search, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useDebounce } from '@/hooks/useDebounce';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function DistributorsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: distributors = [], isLoading, error } = useDistributors({ search: debouncedSearch });
  const deleteMutation = useDeleteDistributor();

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`'${name}' 배급사를 삭제하시겠습니까?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("배급사가 삭제되었습니다");
      } catch (error) {
        toast.error("오류", {
          description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다"
        });
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-[1200px] mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">배급사 관리</h1>
          
          <Link href="/distributors/create">
            <Button className="bg-[#ff6246] hover:bg-[#e55a42] text-white">
              <Plus className="h-4 w-4 mr-2" />
              배급사 등록
            </Button>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="배급사 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-2 bg-white">
            <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
              <Building className="h-5 w-5 mr-2 text-[#ff6246]" />
              배급사 목록
            </CardTitle>
            <CardDescription>등록된 배급사를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="bg-destructive/10 p-4 rounded-md text-destructive">
                {error instanceof Error ? error.message : (typeof error === 'string' ? error : "데이터를 불러오는 중 오류가 발생했습니다.")}
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 w-16">ID</th>
                      <th scope="col" className="px-4 py-3">
                        <div className="flex items-center">
                          배급사명
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </div>
                      </th>
                      <th scope="col" className="px-4 py-3">상태</th>
                      <th scope="col" className="px-4 py-3 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributors.length === 0 ? (
                      <tr className="bg-white border-b">
                        <td colSpan={4} className="px-4 py-5 text-center text-muted-foreground">
                          등록된 배급사가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      distributors.map((distributor) => (
                        <tr key={distributor.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{distributor.id}</td>
                          <td className="px-4 py-3">
                            <Link 
                              href={`/distributors/${distributor.id}`}
                              className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline"
                            >
                              {distributor.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={distributor.isActive ? "bg-green-100" : ""}>
                              {distributor.isActive ? '활성' : '비활성'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c] transition-colors h-8 w-8 p-0"
                                onClick={() => location.href = `/distributors/${distributor.id}/edit`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors h-8 w-8 p-0"
                                onClick={() => handleDelete(distributor.id, distributor.name)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

// 정적 생성 비활성화 - 항상 동적 렌더링
export const dynamic = 'force-dynamic';
