"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, AlertCircle, Music2 } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";

interface MediaPlayerProps {
  mediaUrl: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  seekTo?: number | null;
  /** Total duration in seconds — used as a fallback when no real audio is loaded */
  totalDuration?: number;
}

export function MediaPlayer({ mediaUrl, onTimeUpdate, seekTo, totalDuration = 0 }: MediaPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(totalDuration);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Keep duration in sync when totalDuration prop changes (and no real audio yet)
  useEffect(() => {
    if (totalDuration > 0 && duration === 0) {
      setDuration(totalDuration);
    }
  }, [totalDuration, duration]);

  // ── Seek from outside (transcript click) ──────────────────────────────────
  useEffect(() => {
    if (seekTo === null || seekTo === undefined) return;
    setCurrentTime(seekTo);
    onTimeUpdate?.(seekTo);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
    }
  }, [seekTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Media load-error timeout (10 s) ───────────────────────────────────────
  useEffect(() => {
    if (!mediaUrl) return;
    const timer = setTimeout(() => {
      if (!audioRef.current?.duration) setLoadTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [mediaUrl]);

  // ── Simulation ticker (used when no real audio or audio errored) ──────────
  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
  }, []);

  const startSimulation = useCallback(() => {
    stopSimulation();
    simulationRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.25;
        const cap = duration > 0 ? duration : totalDuration;
        if (cap > 0 && next >= cap) {
          stopSimulation();
          setIsPlaying(false);
          return cap;
        }
        onTimeUpdate?.(next);
        return next;
      });
    }, 250);
  }, [duration, totalDuration, stopSimulation, onTimeUpdate]);

  useEffect(() => {
    return () => stopSimulation();
  }, [stopSimulation]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const hasRealAudio = Boolean(mediaUrl) && !loadError && !loadTimeout;

  const togglePlay = () => {
    if (hasRealAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setLoadError(true));
      }
    } else {
      // Simulated playback
      if (isPlaying) {
        stopSimulation();
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        startSimulation();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setCurrentTime(t);
    onTimeUpdate?.(t);
  };

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    onTimeUpdate?.(t);
    if (audioRef.current) {
      audioRef.current.currentTime = t;
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

  const effectiveDuration = duration > 0 ? duration : totalDuration;
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div className="bg-gray-50 dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] rounded-xl p-4">
      {/* Real audio element (hidden) */}
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

      {/* No-media notice */}
      {!mediaUrl && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46]">
          <Music2 size={13} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            No media file attached — playback is simulated. Click any transcript line to seek.
          </span>
        </div>
      )}

      {/* Media load error notice */}
      {(loadError || loadTimeout) && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-300">
            Media could not be loaded — using simulated playback. Transcript is still fully navigable.
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white transition-colors flex-shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>

        {/* Seek bar */}
        <div className="flex-1 space-y-1">
          <div className="relative h-4 flex items-center">
            {/* Progress fill */}
            <div
              className="absolute left-0 h-1.5 bg-violet-500 rounded-full pointer-events-none"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min={0}
              max={effectiveDuration || 100}
              value={currentTime}
              step={0.1}
              onChange={handleSeekBar}
              className="w-full h-1.5 bg-gray-200 dark:bg-[#2e2e38] rounded-full appearance-none cursor-pointer accent-violet-500 relative"
              aria-label="Seek"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 font-mono">
            <span>{formatTimestamp(currentTime)}</span>
            <span>{formatTimestamp(effectiveDuration)}</span>
          </div>
        </div>

        {/* Volume (only meaningful with real audio) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleMute}
            disabled={!hasRealAudio}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            disabled={!hasRealAudio}
            className="w-16 h-1 bg-gray-200 dark:bg-[#2e2e38] rounded-full appearance-none cursor-pointer accent-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
