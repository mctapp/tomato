// /hooks/data/useVoiceArtist.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/utils/api-client';

interface VoiceArtistStats {
  totalVoiceArtists: number;
  totalSamples: number;
}

export const useVoiceArtistStats = () => {
  return useQuery({
    queryKey: ['voiceArtistStats'],
    queryFn: async () => {
      return await apiClient.get<VoiceArtistStats>('/admin/api/dashboard/voice-artist-stats');
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
};
