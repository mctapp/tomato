// hooks/useAudio.ts
import { useState, useEffect, useRef } from 'react';

interface UseAudioProps {
  src: string;
  autoPlay?: boolean;
}

// 인터페이스에서 audioRef 타입 변경
interface UseAudioReturn {
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
  // audioRef 타입 정의 변경
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const useAudio = ({ src, autoPlay = false }: UseAudioProps): UseAudioReturn => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
      setDuration(audio.duration);
      setLoading(false);
      if (autoPlay) {
        audio.play().catch(err => {
          console.error("자동 재생 오류:", err);
        });
      }
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    
    const handleError = (e: Event) => {
      console.error("오디오 로딩 오류:", e, audio.error);
      setError(new Error("오디오 파일을 로드할 수 없습니다."));
      setLoading(false);
    };
    
    // 이벤트 리스너 등록
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // 오류 해결을 위한 크로스도메인 설정
    audio.crossOrigin = "anonymous";
    
    // 클린업 함수
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
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

export default useAudio;
