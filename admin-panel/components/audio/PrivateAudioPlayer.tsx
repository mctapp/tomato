// components/audio/PrivateAudioPlayer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Play, Pause, RefreshCw, Volume2, FileAudio } from 'lucide-react';

interface PrivateAudioPlayerProps {
  src: string;
  title: string;
  className?: string;
}

const PrivateAudioPlayer: React.FC<PrivateAudioPlayerProps> = ({ src, title, className }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const volumeControlRef = useRef<HTMLDivElement>(null);

  // S3 presigned URL 디버깅 로그 추가
  useEffect(() => {
    console.log("PrivateAudioPlayer - Using URL:", src);
    if (src?.includes('X-Amz-Algorithm')) {
      console.log("PrivateAudioPlayer - Detected presigned URL");
    }
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!src) {
      setError("오디오 파일 경로가 없습니다.");
      setIsLoading(false);
      return;
    }

    const handleLoadedMetadata = () => {
      console.log("PrivateAudioPlayer - Metadata loaded successfully");
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      console.log("PrivateAudioPlayer - Can play event fired");
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error("PrivateAudioPlayer - Audio loading error:", e);
      if (audio.error) {
        console.error("PrivateAudioPlayer - Error code:", audio.error.code);
        console.error("PrivateAudioPlayer - Error message:", audio.error.message);
      }
      setError("오디오 파일을 로드할 수 없습니다. presigned URL이 만료되었거나 접근 권한이 없습니다.");
      setIsLoading(false);
    };

    // 로딩 상태 초기화
    setIsLoading(true);
    setError(null);
    
    // 이벤트 리스너 연결
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // presigned URL은 crossOrigin을 설정하지 않음
    audio.crossOrigin = null as any; // S3 presigned URL에는 CORS 헤더가 설정되지 않을 수 있음

    // 클린업 함수
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  // 볼륨 컨트롤 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeControlRef.current && !volumeControlRef.current.contains(event.target as Node)) {
        setShowVolumeControl(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // 오류 방지를 위한 추가 처리
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("오디오 재생 오류:", err);
          setError("오디오를 재생할 수 없습니다. 브라우저의 자동 재생 정책을 확인하세요.");
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  const toggleVolumeControl = () => {
    setShowVolumeControl(!showVolumeControl);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCurrentTime(value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileAudio className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm font-medium">{title || '제목 없음'}</span>
        </div>
      </div>
      
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {error ? (
        <div className="w-full text-red-500 text-sm flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      ) : (
        <div className="flex items-start space-x-4 bg-gray-50 rounded-lg p-3">
          {/* 재생 버튼 */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={togglePlay}
            disabled={isLoading}
            className={`h-10 w-10 rounded-full flex-shrink-0 ${isPlaying ? 'bg-[#4da34c] hover:bg-[#3d8c3c] text-white' : 'bg-[#ff6246] hover:bg-[#e55236] text-white'}`}
          >
            {isLoading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          
          {/* 재생 막대 */}
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ff6246 ${(currentTime / (duration || 1)) * 100}%, #e5e7eb ${(currentTime / (duration || 1)) * 100}%)`
              }}
            />
          </div>
          
          {/* 볼륨 컨트롤 - 팝업 스타일 */}
          <div className="relative" ref={volumeControlRef}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-gray-500"
              onClick={toggleVolumeControl}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            
            {showVolumeControl && (
              <div className="absolute bottom-full right-0 mb-2 p-2 bg-white shadow-lg rounded-md z-10">
                <div className="flex flex-col items-center w-6 h-24">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                    style={{
                      width: '100px',
                      height: '4px',
                      transform: 'rotate(-90deg) translate(-38px, 0px)',
                      WebkitAppearance: 'none',
                      background: `linear-gradient(to right, #4da34c ${volume * 100}%, #e5e7eb ${volume * 100}%)`,
                      borderRadius: '9999px'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #4da34c;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .volume-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #4da34c;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default PrivateAudioPlayer;
