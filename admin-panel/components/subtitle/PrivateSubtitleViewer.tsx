// components/subtitle/PrivateSubtitleViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AlertCircle, 
  Download, 
  File, 
  Clock, 
  Play, 
  Pause, 
  Search,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SubtitleItem {
  startTime: number;
  endTime: number;
  text: string;
}

interface PrivateSubtitleViewerProps {
  src: string;
  title: string;
  subtitleData?: any;
  className?: string;
  onDownload?: () => void;
}

const PrivateSubtitleViewer: React.FC<PrivateSubtitleViewerProps> = ({
  src,
  title,
  subtitleData: initialSubtitleData,
  className,
  onDownload
}) => {
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [maxTime, setMaxTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [userScrolling, setUserScrolling] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextViewRef = useRef<HTMLDivElement>(null);
  const subtitleContainerRef = useRef<HTMLDivElement>(null);

  // 컨텍스트 뷰를 위한 표시 자막 결정
  const getContextSubtitles = () => {
    if (subtitles.length === 0) return [];
    
    const totalContextSize = 5; // 총 표시할 자막 수
    const preContextSize = 2; // 현재 자막 이전에 표시할 자막 수
    const postContextSize = totalContextSize - preContextSize - 1; // 현재 자막 이후에 표시할 자막 수
    
    let startIdx = Math.max(0, currentSubtitleIndex - preContextSize);
    let endIdx = Math.min(subtitles.length - 1, currentSubtitleIndex + postContextSize);
    
    // 시작/끝 부분 처리: 컨텍스트 크기 유지
    if (startIdx === 0 && endIdx < subtitles.length - 1 && endIdx < totalContextSize - 1) {
      endIdx = Math.min(subtitles.length - 1, totalContextSize - 1);
    }
    if (endIdx === subtitles.length - 1 && startIdx > 0 && (subtitles.length - startIdx) < totalContextSize) {
      startIdx = Math.max(0, subtitles.length - totalContextSize);
    }
    
    return subtitles.slice(startIdx, endIdx + 1);
  };
  
  // 현재 컨텍스트 자막 (현재 자막 주변의 자막들)
  const contextSubtitles = getContextSubtitles();

  // 스크롤 이벤트 감지를 위한 상태 업데이트 함수
  const handleUserScroll = () => {
    setUserScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setUserScrolling(false);
    }, 2000); // 2초 동안 스크롤 없으면 자동 스크롤 재개
  };

  // 초기 자막 데이터 처리
  useEffect(() => {
    try {
      if (initialSubtitleData) {
        parseSubtitleData(initialSubtitleData);
      } else if (src) {
        fetchSubtitleFile();
      } else {
        setError("자막 파일 경로가 없습니다.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("자막 초기화 오류:", err);
      setError("자막 데이터를 처리할 수 없습니다.");
      setIsLoading(false);
    }
  }, [src, initialSubtitleData]);

  // 현재 재생 시간에 해당하는 자막 찾기
  useEffect(() => {
    const newIndex = subtitles.findIndex(
      item => currentTime >= item.startTime && currentTime <= item.endTime
    );
    
    if (newIndex !== -1 && newIndex !== currentSubtitleIndex) {
      setCurrentSubtitleIndex(newIndex);
      
      // 사용자가 스크롤 중이 아닐 때만 자동 스크롤
      if (!userScrolling && contextViewRef.current) {
        const targetSubtitle = contextViewRef.current.querySelector(`[data-index="${newIndex}"]`);
        if (targetSubtitle) {
          targetSubtitle.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }
      
      // 타임라인 마커 업데이트
      updateTimelineMarker(newIndex);
    }
  }, [currentTime, subtitles, currentSubtitleIndex, userScrolling]);

  // 재생 제어
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 0.1;
          if (newTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return newTime;
        });
      }, 100);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, maxTime]);

  // 검색 결과 처리
  useEffect(() => {
    if (searchTerm.trim()) {
      const results = subtitles
        .map((subtitle, index) => 
          subtitle.text.toLowerCase().includes(searchTerm.toLowerCase()) ? index : -1
        )
        .filter(index => index !== -1);
      
      setSearchResults(results);
      setCurrentSearchIndex(0);
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }
  }, [searchTerm, subtitles]);

  // 타임라인 마커 업데이트
  const updateTimelineMarker = (subtitleIndex: number) => {
    if (!timelineRef.current || subtitles.length === 0) return;
    
    const marker = timelineRef.current.querySelector('.current-marker');
    
    if (marker && subtitleIndex >= 0 && subtitleIndex < subtitles.length) {
      const subtitle = subtitles[subtitleIndex];
      const position = (subtitle.startTime / maxTime) * 100;
      (marker as HTMLElement).style.left = `${position}%`;
    }
  };

  // 자막 파일 가져오기
  const fetchSubtitleFile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`HTTP 오류: ${response.status}`);
      }
      
      const data = await response.json();
      parseSubtitleData(data);
    } catch (err) {
      console.error("자막 파일 로드 오류:", err);
      setError("자막 파일을 불러올 수 없습니다. presigned URL이 만료되었거나 접근 권한이 없습니다.");
      setIsLoading(false);
    }
  };

  // 자막 데이터 파싱
  const parseSubtitleData = (data: any) => {
    try {
      let parsedItems: SubtitleItem[] = [];
      let maxDuration = 0;
      
      // 다양한 자막 포맷 지원
      if (Array.isArray(data)) {
        parsedItems = data.map(item => ({
          startTime: typeof item.startTime === 'number' ? item.startTime : 
                    typeof item.start === 'number' ? item.start : 
                    parseFloat(item.startTime || item.start || '0'),
          endTime: typeof item.endTime === 'number' ? item.endTime : 
                  typeof item.end === 'number' ? item.end : 
                  parseFloat(item.endTime || item.end || '0'),
          text: item.text || item.content || item.caption || ''
        }));
      } else if (typeof data === 'object') {
        if (data.subtitles || data.captions || data.cues) {
          const subtitleArray = data.subtitles || data.captions || data.cues;
          if (Array.isArray(subtitleArray)) {
            parsedItems = subtitleArray.map(item => ({
              startTime: typeof item.startTime === 'number' ? item.startTime : 
                        typeof item.start === 'number' ? item.start : 
                        parseFloat(item.startTime || item.start || '0'),
              endTime: typeof item.endTime === 'number' ? item.endTime : 
                      typeof item.end === 'number' ? item.end : 
                      parseFloat(item.endTime || item.end || '0'),
              text: item.text || item.content || item.caption || ''
            }));
          }
        }
      }
      
      // 자막이 없을 경우 샘플 데이터 생성
      if (parsedItems.length === 0) {
        parsedItems = [
          { startTime: 0, endTime: 5, text: '자막 파일이 올바른 형식이 아니거나 자막이 없습니다.' },
          { startTime: 5, endTime: 10, text: '지원되는 자막 형식: JSON 배열 또는 객체 형식' }
        ];
      }
      
      // 정렬 및 최대 시간 계산
      parsedItems.sort((a, b) => a.startTime - b.startTime);
      maxDuration = Math.max(...parsedItems.map(item => item.endTime));
      
      // 극단적으로 짧은 간격의 자막 처리 (재생 기능을 위해)
      const processedItems = parsedItems.map((item, index, array) => {
        if (index < array.length - 1 && item.endTime > array[index + 1].startTime) {
          return { ...item, endTime: array[index + 1].startTime - 0.001 };
        }
        return item;
      });
      
      setSubtitles(processedItems);
      setMaxTime(maxDuration);
      setIsLoading(false);
    } catch (err) {
      console.error("자막 데이터 파싱 오류:", err);
      setError("자막 데이터 형식이 올바르지 않습니다.");
      setIsLoading(false);
    }
  };

  // 시간 형식 변환 (초 -> HH:MM:SS.mmm)
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  // 재생/일시 정지 토글
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // 시간 조절
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  // 특정 타임코드로 점프
  const jumpToTime = (time: number) => {
    setCurrentTime(time);
    // 사용자가 점프 시 자동 스크롤 잠시 비활성화
    setUserScrolling(true);
    setTimeout(() => setUserScrolling(false), 1000);
  };

  // 타임라인 마커 클릭 처리
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || subtitles.length === 0) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const targetTime = position * maxTime;
    
    // 가장 가까운 자막 찾기
    let closestIndex = 0;
    let minDistance = Math.abs(subtitles[0].startTime - targetTime);
    
    subtitles.forEach((subtitle, index) => {
      const distance = Math.abs(subtitle.startTime - targetTime);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    jumpToTime(subtitles[closestIndex].startTime);
  };

  // 검색 결과 탐색
  const navigateSearchResults = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex = currentSearchIndex;
    
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentSearchIndex(newIndex);
    const subtitleIndex = searchResults[newIndex];
    jumpToTime(subtitles[subtitleIndex].startTime);
  };

  // 검색창 토글
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      // 검색 모드 활성화 시 검색 입력에 포커스
      setTimeout(() => {
        const searchInput = document.getElementById('subtitle-search-input');
        if (searchInput) searchInput.focus();
      }, 10);
    } else {
      // 검색 모드 종료 시 검색어 초기화
      setSearchTerm('');
    }
  };

  // 검색 모드 닫기
  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchTerm('');
  };

  // 전체 자막 대화상자 토글
  const toggleFullSubtitlesDialog = () => {
    setIsDialogOpen(!isDialogOpen);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <File className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm font-medium truncate">{title || '자막 파일'}</span>
          </div>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <File className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm font-medium truncate">{title || '자막 파일'}</span>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>자막 로딩 오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 하이라이트 텍스트 함수 (검색어 강조)
  const highlightText = (text: string, term: string) => {
    if (!term.trim()) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <File className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm font-medium truncate">{title || '자막 파일'}</span>
        </div>
        <div className="flex items-center space-x-2 ml-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSearch}
            className={isSearchOpen ? "bg-gray-100" : ""}
            title="자막 검색"
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                title="전체 자막 보기"
              >
                <File className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>전체 자막 보기</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {subtitles.map((subtitle, index) => (
                    <div 
                      key={index}
                      className={`p-2 rounded ${index === currentSubtitleIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      onClick={() => {
                        jumpToTime(subtitle.startTime);
                        setIsDialogOpen(false);
                      }}
                    >
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{formatTime(subtitle.startTime)}</span>
                        <span>→</span>
                        <span>{formatTime(subtitle.endTime)}</span>
                      </div>
                      <p className="text-sm">{subtitle.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDownload}
            title="다운로드"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* 메인 자막 뷰어 컨테이너 - 스크롤바 제거를 위해 수정 */}
      <div className="rounded-lg border">
        {/* 검색 입력 (토글) */}
        {isSearchOpen && (
          <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
            <Input
              id="subtitle-search-input"
              type="text"
              placeholder="자막 내용 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-sm flex-1"
            />
            
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigateSearchResults('prev')}
                disabled={searchResults.length === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigateSearchResults('next')}
                disabled={searchResults.length === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500 mx-2">
                {searchResults.length > 0 
                  ? `${currentSearchIndex + 1}/${searchResults.length}`
                  : '0/0'}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={closeSearch}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* 플레이어 컨트롤 */}
        <div className="p-3 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              className={`h-8 w-8 rounded-full ${isPlaying ? 'bg-[#4da34c] hover:bg-[#3d8c3c] text-white' : 'bg-[#ff6246] hover:bg-[#e55236] text-white'}`}
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">
                {formatTime(currentTime)} / {formatTime(maxTime)}
              </span>
            </div>
          </div>
          
          {/* 시간 슬라이더 */}
          <div className="mt-2">
            <input
              type="range"
              min={0}
              max={maxTime}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ff6246 ${(currentTime / maxTime) * 100}%, #e5e7eb ${(currentTime / maxTime) * 100}%)`
              }}
            />
          </div>
        </div>
        
        {/* 비주얼 타임라인 */}
        <div 
          ref={timelineRef}
          className="relative h-10 bg-gray-100 border-b cursor-pointer" 
          onClick={handleTimelineClick}
        >
          {/* 타임라인 마커 */}
          {subtitles.map((subtitle, idx) => (
            <div 
              key={idx}
              className={`absolute top-0 h-full w-1 cursor-pointer ${
                idx === currentSubtitleIndex ? 'bg-[#ff6246]' : 'bg-gray-400'
              }`}
              style={{ 
                left: `${(subtitle.startTime / maxTime) * 100}%`,
                opacity: idx === currentSubtitleIndex ? 1 : 0.4,
                height: idx === currentSubtitleIndex ? '100%' : '70%',
                top: idx === currentSubtitleIndex ? '0' : '15%'
              }}
              onClick={(e) => {
                e.stopPropagation();
                jumpToTime(subtitle.startTime);
              }}
            />
          ))}
          
          {/* 현재 위치 마커 */}
          <div 
            className="current-marker absolute top-0 h-full w-2 bg-[#ff6246] rounded-full transform -translate-x-1/2 z-10"
            style={{ left: `${(currentTime / maxTime) * 100}%` }}
          ></div>
          
          {/* 시간 구간 표시 */}
          <div className="absolute top-0 left-0 w-full flex justify-between px-2 text-xs text-gray-500">
            <span>{formatTime(0)}</span>
            <span>{formatTime(maxTime / 2)}</span>
            <span>{formatTime(maxTime)}</span>
          </div>
        </div>
        
        {/* 컨텍스트 자막 뷰 - 스크롤바 문제 해결을 위해 수정 */}
        <div
          ref={contextViewRef}
          className="overflow-visible"
          onScroll={handleUserScroll}
        >
          <div 
            ref={subtitleContainerRef}
            className="p-2 space-y-2"
          >
            {contextSubtitles.map((subtitle, idx) => {
              const originalIndex = subtitles.findIndex(
                s => s.startTime === subtitle.startTime && s.endTime === subtitle.endTime
              );
              
              const isCurrentSubtitle = originalIndex === currentSubtitleIndex;
              const isSearchResult = searchResults.includes(originalIndex);
              
              return (
                <div 
                  key={idx}
                  data-index={originalIndex}
                  className={`p-3 rounded-md transition-all ${
                    isCurrentSubtitle 
                      ? 'bg-gray-100 border-l-4 border-[#ff6246]' 
                      : isSearchResult
                        ? 'bg-yellow-50 border-l-4 border-yellow-400'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-mono text-gray-500">
                      {formatTime(subtitle.startTime)} → {formatTime(subtitle.endTime)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 py-0 text-xs"
                      onClick={() => jumpToTime(subtitle.startTime)}
                    >
                      이동
                    </Button>
                  </div>
                  <p className="text-sm">
                    {searchTerm.trim() 
                      ? highlightText(subtitle.text, searchTerm) 
                      : subtitle.text}
                  </p>
                </div>
              );
            })}
            
            {/* 컨텍스트 자막이 없을 때 */}
            {contextSubtitles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <p>현재 시간에 해당하는 자막이 없습니다</p>
                {subtitles.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => jumpToTime(subtitles[0].startTime)}
                  >
                    첫 자막으로 이동
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #ff6246;
          border-radius: 50%;
          cursor: pointer;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #ff6246;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default PrivateSubtitleViewer;
