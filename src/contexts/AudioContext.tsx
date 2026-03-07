import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type AudioType = 'THEME' | 'MATCH_AMBIENT' | 'WHISTLE_START' | 'WHISTLE_END' | 'WORLDCUP_THEME' | 'PACK_OPEN';

interface AudioContextType {
  playAudio: (type: AudioType, loop?: boolean) => void;
  stopAudio: (type: AudioType) => void;
  stopAll: () => void;
  setVolume: (volume: number) => void;
  volume: number;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRefs = useRef<Record<AudioType, HTMLAudioElement | null>>({
    THEME: null,
    MATCH_AMBIENT: null,
    WHISTLE_START: null,
    WHISTLE_END: null,
    WORLDCUP_THEME: null,
    PACK_OPEN: null,
  });

  const [volume, setVolumeState] = useState(0.3); // Default volume 30%

  useEffect(() => {
    // Initialize audio objects
    const createAudio = (path: string) => {
      const audio = new Audio(path);
      audio.volume = volume;
      return audio;
    };

    audioRefs.current.THEME = createAudio('/audio/theme.mp3');
    audioRefs.current.MATCH_AMBIENT = createAudio('/audio/match_ambient.mp3');
    audioRefs.current.WHISTLE_START = createAudio('/audio/whistle_start.mp3');
    audioRefs.current.WHISTLE_END = createAudio('/audio/whistle_end.mp3');
    audioRefs.current.WORLDCUP_THEME = createAudio('/audio/worldcup_theme.mp3');
    audioRefs.current.PACK_OPEN = createAudio('/audio/pack_open.mp3');

    // Cleanup
    return () => {
      (Object.values(audioRefs.current) as (HTMLAudioElement | null)[]).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);

  // Update volume when state changes
  useEffect(() => {
    (Object.values(audioRefs.current) as (HTMLAudioElement | null)[]).forEach(audio => {
      if (audio) audio.volume = volume;
    });
  }, [volume]);

  const playAudio = (type: AudioType, loop = false) => {
    const audio = audioRefs.current[type];
    if (audio) {
      audio.loop = loop;
      if (audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play failed (user interaction required):", e));
      }
    }
  };

  const stopAudio = (type: AudioType) => {
    const audio = audioRefs.current[type];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  const stopAll = () => {
    (Object.values(audioRefs.current) as (HTMLAudioElement | null)[]).forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  };

  const setVolume = (vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  };

  return (
    <AudioContext.Provider value={{ playAudio, stopAudio, stopAll, setVolume, volume }}>
      {children}
    </AudioContext.Provider>
  );
};
