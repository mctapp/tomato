// hooks/useAccessAssetCredits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAccessAssetCredits,
  createAccessAssetCredit,
  updateAccessAssetCredit,
  deleteAccessAssetCredit,
  reorderAccessAssetCredits
} from '@/lib/api/accessAssetCredits';
import {
  AccessAssetCreditCreate,
  AccessAssetCreditUpdate,
  AccessAssetCreditReorder
} from '@/types/accessAssetCredit';
import { toast } from 'sonner';

// Get credits for an access asset
export function useAccessAssetCredits(assetId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['accessAssetCredits', assetId],
    queryFn: () => getAccessAssetCredits(assetId),
    enabled: options?.enabled ?? !!assetId
  });
}

// Create credit mutation
export function useCreateAccessAssetCredit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ assetId, data }: { assetId: number; data: AccessAssetCreditCreate }) =>
      createAccessAssetCredit(assetId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accessAssetCredits', variables.assetId] });
      toast.success('크레디트가 추가되었습니다');
    },
    onError: (error) => {
      console.error('Create credit error:', error);
      toast.error('크레디트 추가에 실패했습니다');
    }
  });
}

// Update credit mutation
export function useUpdateAccessAssetCredit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      assetId, 
      creditId, 
      data 
    }: { 
      assetId: number; 
      creditId: number; 
      data: AccessAssetCreditUpdate 
    }) => updateAccessAssetCredit(assetId, creditId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accessAssetCredits', variables.assetId] });
      toast.success('크레디트가 수정되었습니다');
    },
    onError: (error) => {
      console.error('Update credit error:', error);
      toast.error('크레디트 수정에 실패했습니다');
    }
  });
}

// Delete credit mutation
export function useDeleteAccessAssetCredit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ assetId, creditId }: { assetId: number; creditId: number }) =>
      deleteAccessAssetCredit(assetId, creditId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accessAssetCredits', variables.assetId] });
      toast.success('크레디트가 삭제되었습니다');
    },
    onError: (error) => {
      console.error('Delete credit error:', error);
      toast.error('크레디트 삭제에 실패했습니다');
    }
  });
}

// Reorder credits mutation
export function useReorderAccessAssetCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, data }: { assetId: number; data: AccessAssetCreditReorder }) =>
      reorderAccessAssetCredits(assetId, data.creditIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accessAssetCredits', variables.assetId] });
      toast.success('크레디트 순서가 변경되었습니다');
    },
    onError: (error) => {
      console.error('Reorder credits error:', error);
      toast.error('크레디트 순서 변경에 실패했습니다');
    }
  });
}
