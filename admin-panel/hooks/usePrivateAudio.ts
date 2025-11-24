// hooks/usePrivateAudio.ts
import { useState, useEffect, useRef } from 'react';

interface UsePrivateAudioProps {
  src: string;
  autoPlay?: boolean;
}

interface UsePrivateAudioReturn {
  playing: boolean;
  togglePlay: () => void;
  pause: () => void;
  play: () => Promise<void>;
  currentTime: number;
  duration: number;
  seek: (time: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  loading: boolean;
  error: Error | null;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const usePrivateAudio = ({ src, autoPlay = false }: UsePrivateAudioProps): UsePrivateAudioReturn => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // S3 presigned URL 디버깅 로그 추가
  useEffect(() => {
    console.log("usePrivateAudio - Using URL:", src);
    if (src?.includes('X-Amz-Algorithm')) {
      console.log("usePrivateAudio - Detected presigned URL");
    }
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // 오디오 소스 변경 시 초기화
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);
    setError(null);
    
    const handleLoadedMetadata = () => {
      console.log("usePrivateAudio - Metadata loaded successfully");
      setDuration(audio.duration);
      setLoading(false);
      if (autoPlay) {
        audio.play().catch(err => {
          console.error("자동 재생 오류:", err);
        });
      }
    };

    const handleCanPlay = () => {
      console.log("usePrivateAudio - Can play event fired");
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    
    const handleError = (e: Event) => {
      console.error("usePrivateAudio - 오디오 로딩 오류:", e);
      if (audio.error) {
        console.error("usePrivateAudio - Error code:", audio.error.code);
        console.error("usePrivateAudio - Error message:", audio.error.message);
      }
      setError(new Error("오디오 파일을 로드할 수 없습니다. presigned URL이 만료되었거나 접근 권한이 없습니다."));
      setLoading(false);
    };
    
    // 이벤트 리스너 등록
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // presigned URL은 crossOrigin을 설정하지 않음
    audio.crossOrigin = null as any;
    
    // 클린업 함수
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      // 오디오 정지
      audio.pause();
    };
  }, [src, autoPlay]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      play();
    }
  };

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return Promise.resolve();
    
    try {
      await audio.play();
      setPlaying(true);
    } catch (err) {
      console.error("재생 오류:", err);
      setError(err instanceof Error ? err : new Error("재생에 실패했습니다."));
    }
  };

  const pause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.pause();
    setPlaying(false);
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const setVolume = (volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.volume = volume;
    setVolumeState(volume);
  };

  return {
    playing,
    togglePlay,
    play,
    pause,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    loading,
    error,
    audioRef
  };
};

export default usePrivateAudio;
