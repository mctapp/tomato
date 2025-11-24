// app/movies/columns.tsx
"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Movie } from "@/types/movie";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowUpDown, Edit, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export const columns: ColumnDef<Movie>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          제목
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const movie = row.original;
      return (
        <Link 
          href={`/movies/${movie.id}`} 
          className="font-medium text-blue-500 hover:underline"
        >
          {row.getValue("title")}
        </Link>
      );
    },
  },
  {
    accessorKey: "director",
    header: "감독",
    cell: ({ row }) => {
      const director = row.getValue("director") as string | null;
      return <div>{director || "-"}</div>;
    },
  },
  {
    accessorKey: "distributor",
    header: "배급사",
    cell: ({ row }) => {
      const distributor = row.original.distributor;
      return <div>{distributor?.name || "-"}</div>;
    },
  },
  {
    accessorKey: "visibilityType",
    header: "표시 유형",
    cell: ({ row }) => {
      const visibilityType = row.getValue("visibilityType") as string;
      const visibilityLabels: Record<string, string> = {
        hidden: "숨김",
        period: "기간 한정",
        always: "항상 표시",
      };
      return <div>{visibilityLabels[visibilityType] || "-"}</div>;
    },
  },
  {
    accessorKey: "isPublic",
    header: "공개 여부",
    cell: ({ row }) => {
      const isPublic = row.getValue("isPublic") as boolean;
      return (
        <div className="flex items-center">
          {isPublic ? (
            <>
              <Eye className="h-4 w-4 mr-1 text-green-500" /> 공개
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 mr-1 text-gray-500" /> 비공개
            </>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "작업",
    cell: ({ row }) => {
      const router = useRouter();
      const movie = row.original;
      const [isDeleting, setIsDeleting] = useState(false);
      
      const handleDelete = async () => {
        if (confirm(`영화 '${movie.title}'을(를) 삭제하시겠습니까?`)) {
          try {
            setIsDeleting(true);
            const response = await fetch(`/admin/api/movies/${movie.id}`, { 
              method: "DELETE" 
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => null);
              throw new Error(errorData?.detail || `삭제 요청 실패 (${response.status})`);
            }
            
            toast.success("삭제 완료", {
              description: `영화 '${movie.title}'이(가) 삭제되었습니다.`
            });
            router.refresh();
          } catch (error) {
            console.error("영화 삭제 오류:", error);
            toast.error("삭제 실패", {
              description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
            });
          } finally {
            setIsDeleting(false);
          }
        }
      };
      
      return (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/movies/${movie.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      );
    },
  },
];
