import { Pause, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGenerationalProfile } from "../hooks/useGenerationalProfile";
import {
  briefingRateForCohort,
  chunkBriefingScript,
  pickBriefingVoice,
  playBriefingSpeech,
  stopBriefingSpeech,
} from "../utils/speechBriefing";

interface Props {
  script: string;
}

export function AudioBriefingButton({ script }: Props) {
  const { profile } = useGenerationalProfile();
  const [playing, setPlaying] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const cancelRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const stop = useCallback(() => {
    cancelRef.current = true;
    stopBriefingSpeech();
    setPlaying(false);
    setLoadingVoice(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    pickBriefingVoice().then((v) => {
      if (mounted) voiceRef.current = v;
    });
    return () => {
      mounted = false;
      stop();
    };
  }, [stop]);

  async function toggle() {
    if (playing || loadingVoice) {
      stop();
      return;
    }
    if (!script || !window.speechSynthesis) return;

    cancelRef.current = false;
    setLoadingVoice(true);

    try {
      const voice = voiceRef.current ?? (await pickBriefingVoice());
      voiceRef.current = voice;

      const chunks = chunkBriefingScript(profile.intelAudioIntro, script);
      const { rate, pitch, pauseMs } = briefingRateForCohort(profile.id);

      setLoadingVoice(false);
      setPlaying(true);

      await playBriefingSpeech(chunks, voice, {
        rate,
        pitch,
        pauseMs,
        shouldCancel: () => cancelRef.current,
        onEnd: () => {
          if (!cancelRef.current) setPlaying(false);
        },
        onError: () => setPlaying(false),
      });
    } catch {
      setPlaying(false);
    } finally {
      setLoadingVoice(false);
    }
  }

  if (!script) return null;

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const label = loadingVoice
    ? "Preparing voice…"
    : playing
      ? "Stop briefing"
      : "Play intel briefing";

  return (
    <button
      type="button"
      className="btn btn-sm audio-briefing-btn"
      onClick={() => void toggle()}
      disabled={!supported || loadingVoice}
      title={
        supported
          ? "Natural-voice intel briefing (~60s)"
          : "Audio not supported in this browser"
      }
    >
      {playing ? <Pause size={14} /> : <Volume2 size={14} />}
      {label}
    </button>
  );
}
