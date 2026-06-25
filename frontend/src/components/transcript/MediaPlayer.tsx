"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, AlertCircle, Music2 } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";

interface MediaPlayerProps {
  mediaUrl: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  seekTo?: number | null;
}

export function MediaPlayer({ mediaUrl, onTimeUpdate, seekTo }: MediaPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Handle external seek commands
  useEffect(() => {
    if (seekTo !== null && seekTo !== undefined && audioRef.current) {
      audioRef.current.currentTime = seekTo;
      setCurrentTime(seekTo);
    }
  }, [seekTo]);

  // Media load error timeout (10 seconds)
  useEffect(() => {
    if (!mediaUrl) return;
    const timer = setTimeout(() => {
      if (!audioRef.current?.readyState) {
        setLoadTimeout(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [mediaUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !mediaUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setLoadError(true));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setCurrentTime(t);
    onTimeUpdate?.(t);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
      onTimeUpdate?.(t);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
      setIsMuted(v === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // No media — placeholder with player still rendered
  if (!mediaUrl) {
    return (
      <div className="bg-gray-50 dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] rounded-xl p-4">
        <div className="flex items-center gap-4">
          <button
            disabled
            className="w-9 h-9 rounded-full bg-gray-200 dark:bg-[#25252c] flex items-center justify-center text-gray-400 dark:text-gray-600 cursor-not-allowed"
            aria-label="No media available"
          >
            <Play size={16} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Music2 size={14} className="text-gray-400 dark:text-gray-600" />
              <span className="text-xs text-gray-400 dark:text-gray-500">No media attached</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-[#2e2e38] rounded-full" />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">00:00:00</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] rounded-xl p-4">
      {/* Hidden audio element */}
      {mediaUrl && (
        <audio
          ref={audioRef}
          src={mediaUrl}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setLoadError(true)}
        />
      )}

      {/* Error state (media load error) — segments preserved */}
      {(loadError || loadTimeout) && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">
            Media could not be loaded. Transcript is still available below.
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={loadError || loadTimeout}
          className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors flex-shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>

        {/* Seek bar */}
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            step={0.1}
            onChange={handleSeek}
            disabled={loadError || loadTimeout || duration === 0}
            className="w-full h-1.5 bg-gray-200 dark:bg-[#2e2e38] rounded-full appearance-none cursor-pointer accent-violet-500 disabled:cursor-not-allowed"
            aria-label="Seek"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 font-mono">
            <span>{formatTimestamp(currentTime)}</span>
            <span>{formatTimestamp(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleMute}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-gray-200 dark:bg-[#2e2e38] rounded-full appearance-none cursor-pointer accent-violet-500"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
