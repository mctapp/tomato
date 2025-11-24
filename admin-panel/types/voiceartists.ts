// types/voiceartists.ts

export interface VoiceArtistExpertise {
  domain: string;
  domainOther?: string;
  grade: number;
}

export interface VoiceArtistSample {
  id: number;
  sequenceNumber: number;
  title: string;
  filePath: string;
  createdAt: string;
}

export interface VoiceArtist {
  id: number;
  voiceartistName: string;
  profileImage?: string;
  voiceartistGender?: string;
  voiceartistLocation?: string;
  voiceartistLevel?: number;
  voiceartistMemo?: string;
  voiceartistPhone?: string;
  voiceartistEmail?: string;
  createdAt: string;
  updatedAt: string;
  expertise: VoiceArtistExpertise[];
  samples: VoiceArtistSample[];
}

export interface VoiceArtistSummary {
  id: number;
  voiceartistName: string;
  voiceartistLevel?: number;
  voiceartistGender?: string;
  voiceartistLocation?: string;
  voiceartistPhone?: string;
  voiceartistEmail?: string;
  profileImage?: string;
  samplesCount: number;
  createdAt: string;
}

// 성우가 참여한 접근성 미디어 자산 타입
export interface VoiceArtistAccessAsset {
  id: number;
  name: string;
  mediaType: string;
  language: string;
  assetType: string;
  productionYear?: number;
  productionStatus: string;
  publishingStatus: string;
  createdAt: string;
  movie?: {
    id: number;
    title: string;
    director?: string;
    releaseDate?: string;
  };
  credit?: {
    role: string;
    isPrimary: boolean;
    sequenceNumber: number;
    memo?: string;
  };
}
