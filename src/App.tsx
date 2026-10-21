import { useState, useRef, useEffect, useCallback } from "react";
import correctSoundUrl from "./imports/correct.mp3?url";
import wrongSoundUrl from "./imports/wrong.mp3?url";
import creatorPhotoUrl from "./imports/PERSONAL_PHOTO.jpg.jpeg";
import dialogIllustrationUrl from "./imports/DIALOG_ILLUSTRATION__D3BD579_.png";
import storyIllustrationUrl from "./imports/STORY_ILLUSTRATION.jpg.jpeg";

// ────────────────────────────────────────────────────────────────
// SOUND EFFECTS — Web Audio API
//
// HTMLAudioElement is unreliable on iOS Safari when created
// programmatically (not attached to the DOM), and the play/pause
// unlock trick introduces a race condition that can silence the
// very answer sound the user just triggered.
//
// Web Audio API (AudioContext + AudioBufferSourceNode) is the correct
// solution: we pre-fetch + decode the MP3 files into memory buffers,
// resume the AudioContext on the first user gesture, then play by
// creating a new BufferSourceNode (which is lightweight and designed
// to be created per-playback). Both resume() and start() are called
// synchronously inside the user's tap/click handler, which satisfies
// iOS Safari's "user gesture required" policy.
// ────────────────────────────────────────────────────────────────
let _actx: AudioContext | null = null;
const _bufs: Partial<Record<"correct" | "wrong", AudioBuffer>> = {};

function _getCtx(): AudioContext {
  if (!_actx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    _actx = new AC();
  }
  return _actx;
}

async function _loadBuf(type: "correct" | "wrong") {
  try {
    const ctx = _getCtx();
    const res = await fetch(type === "correct" ? correctSoundUrl : wrongSoundUrl);
    if (!res.ok) return;
    const ab = await res.arrayBuffer();
    // decodeAudioData works on a suspended context — no gesture needed
    _bufs[type] = await ctx.decodeAudioData(ab);
  } catch {
    // Silent — missing file or decode error
  }
}

// Self-invoking init: pre-fetch buffers and wire up the gesture listener
(function _initSfx() {
  if (typeof window === "undefined") return;

  // Start fetching both files immediately so they are ready before first answer
  _loadBuf("correct");
  _loadBuf("wrong");

  // iOS Safari creates AudioContext in "suspended" state and requires
  // resume() to be called synchronously inside a native user gesture.
  // We do it on the very first touchstart or mousedown so that by the
  // time the user taps an answer button, the context is already running.
  const resumeCtx = () => {
    try {
      _getCtx().resume();
    } catch {}
    document.removeEventListener("touchstart", resumeCtx);
    document.removeEventListener("mousedown", resumeCtx);
  };
  document.addEventListener("touchstart", resumeCtx, { passive: true });
  document.addEventListener("mousedown", resumeCtx);
})();

// Called synchronously inside every answer onClick handler.
// AudioBufferSourceNode is designed to be single-use and created per play.
function playSound(type: "correct" | "wrong") {
  try {
    const ctx = _getCtx();
    // Also call resume() here in case the first gesture was the answer tap itself
    if (ctx.state === "suspended") ctx.resume();
    const buf = _bufs[type];
    if (!buf) return; // buffer not loaded yet — silent graceful skip
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0); // 0 = "as soon as possible" (or when context resumes)
  } catch {
    // Silently ignore — nothing more we can do without a user gesture
  }
}

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────
type Page =
  | "home"
  | "about"
  | "info"
  | "profile"
  | "materials"
  | "mindful"
  | "meaningful"
  | "listening"
  | "speaking"
  | "writing"
  | "joyful"
  | "evaluation"
  | "reflection"
  | "result";

interface StudentProfile {
  name: string;
  kelas: string;
  avatar: string;
}

interface MindfulData {
  experience: "yes" | "no" | null;
  memory?: string | null;
  guess?: string | null;
}

interface ReflectionData {
  learned: string;
  remembered: string;
  liked: string;
  difficult: string;
  feeling: string;
  skillReading?: string;
  skillListening?: string;
  skillSpeaking?: string;
  skillWriting?: string;
}

interface MaharahProgress {
  listening: boolean;
  speaking: boolean;
  reading: boolean;
  writing: boolean;
}

// ────────────────────────────────────────────────────────────────
// CONTENT: الأيام
// ────────────────────────────────────────────────────────────────
const DAYS = [
  { arabic: "يَوْمُ الْأَحَدِ", transliteration: "Yaumul-Ahadi", indonesian: "Hari Minggu", emoji: "🌅", bg: "bg-orange-50", border: "border-orange-300", accent: "text-orange-600", badgeBg: "bg-orange-100", sentence: "يَوْمُ الْأَحَدِ هُوَ أَوَّلُ أَيَّامِ الْأُسْبُوعِ.", sentenceId: "Hari Minggu adalah hari pertama dalam seminggu.", context: "Di hari Minggu, kamu bisa beristirahat dan bermain bersama keluarga!" },
  { arabic: "يَوْمُ الإِثْنَيْنِ", transliteration: "Yaumul-Itsnayni", indonesian: "Hari Senin", emoji: "📚", bg: "bg-sky-50", border: "border-sky-300", accent: "text-sky-600", badgeBg: "bg-sky-100", sentence: "يَوْمُ الإِثْنَيْنِ نَذْهَبُ إِلَى الْمَدْرَسَةِ.", sentenceId: "Hari Senin kita pergi ke sekolah.", context: "Hari Senin biasanya ada upacara bendera di sekolah!" },
  { arabic: "يَوْمُ الثُّلَاثَاءِ", transliteration: "Yaumuts-tsulātsāi", indonesian: "Hari Selasa", emoji: "✏️", bg: "bg-green-50", border: "border-green-300", accent: "text-green-600", badgeBg: "bg-green-100", sentence: "يَوْمُ الثُّلَاثَاءِ عِنْدِي دَرْسُ الرِّيَاضِيَّاتِ.", sentenceId: "Hari Selasa aku ada pelajaran matematika.", context: "Apa pelajaran favoritmu di hari Selasa?" },
  { arabic: "يَوْمُ الْأَرْبِعَاءِ", transliteration: "Yaumul-arbi'āi", indonesian: "Hari Rabu", emoji: "🌿", bg: "bg-teal-50", border: "border-teal-300", accent: "text-teal-600", badgeBg: "bg-teal-100", sentence: "يَوْمُ الْأَرْبِعَاءِ نَلْعَبُ كُرَةَ الْقَدَمِ.", sentenceId: "Hari Rabu kami bermain sepak bola.", context: "Rabu biasanya ada kegiatan ekstrakulikuler di sekolah!" },
  { arabic: "يَوْمُ الْخَمِيسِ", transliteration: "Yaumul-khamīsi", indonesian: "Hari Kamis", emoji: "⭐", bg: "bg-yellow-50", border: "border-yellow-300", accent: "text-yellow-600", badgeBg: "bg-yellow-100", sentence: "يَوْمُ الْخَمِيسِ أَقْرَأُ الْكُتُبَ.", sentenceId: "Hari Kamis aku membaca buku.", context: "Kamis adalah hari terakhir sebelum akhir pekan. Semangat!" },
  { arabic: "يَوْمُ الْجُمْعَةِ", transliteration: "Yaumul-jum'ati", indonesian: "Hari Jumat", emoji: "🕌", bg: "bg-purple-50", border: "border-purple-300", accent: "text-purple-600", badgeBg: "bg-purple-100", sentence: "يَوْمُ الْجُمْعَةِ هُوَ يَوْمٌ مُبَارَكٌ.", sentenceId: "Hari Jumat adalah hari yang penuh berkah.", context: "Jumat adalah hari istimewa! Ada shalat Jumat bagi yang muslim." },
  { arabic: "يَوْمُ السَّبْتِ", transliteration: "Yaumus-Sabti", indonesian: "Hari Sabtu", emoji: "🎮", bg: "bg-pink-50", border: "border-pink-300", accent: "text-pink-600", badgeBg: "bg-pink-100", sentence: "يَوْمُ السَّبْتِ أَسْتَرِيحُ مَعَ الْعَائِلَةِ.", sentenceId: "Hari Sabtu aku beristirahat bersama keluarga.", context: "Sabtu adalah hari libur! Waktunya bermain dan bersantai." },
];

const DIALOGUE = [
  { speaker: "س", arabic: "أَيُّ يَوْمٍ الْآنَ؟", indonesian: "Hari apa sekarang?", side: "left" },
  { speaker: "ج", arabic: "الْآنَ يَوْمُ الإِثْنَيْنِ.", indonesian: "Sekarang hari Senin.", side: "right" },
  { speaker: "س", arabic: "أَيُّ يَوْمٍ بِالْأَمْسِ؟", indonesian: "Hari apa kemarin?", side: "left" },
  { speaker: "ج", arabic: "بِالْأَمْسِ يَوْمُ الْأَحَدِ.", indonesian: "Kemarin hari Minggu.", side: "right" },
  { speaker: "س", arabic: "أَيُّ يَوْمٍ أَوَّلُ أَمْسِ؟", indonesian: "Hari apa kemarin lusa?", side: "left" },
  { speaker: "ج", arabic: "أَوَّلُ أَمْسِ يَوْمُ السَّبْتِ.", indonesian: "Kemarin lusa hari Sabtu.", side: "right" },
  { speaker: "س", arabic: "أَيُّ يَوْمٍ غَدًا؟", indonesian: "Hari apa besok?", side: "left" },
  { speaker: "ج", arabic: "غَدًا يَوْمُ الثُّلَاثَاءِ.", indonesian: "Besok hari Selasa.", side: "right" },
  { speaker: "س", arabic: "أَيُّ يَوْمٍ بَعْدَ غَدٍ؟", indonesian: "Hari apa besok lusa?", side: "left" },
  { speaker: "ج", arabic: "بَعْدَ غَدٍ يَوْمُ الْأَرْبِعَاءِ.", indonesian: "Besok lusa hari Rabu.", side: "right" },
];

const EXTRA_VOCAB = [
  { arabic: "أَيُّ", transliteration: "ayyu", indonesian: "Yang mana / Apa", emoji: "❓", bg: "bg-blue-50", border: "border-blue-300", accent: "text-blue-600", badgeBg: "bg-blue-100", sentence: "أَيُّ يَوْمٍ الْآنَ؟", sentenceId: "Hari apa sekarang?", context: "Kata tanya untuk menanyakan hari." },
  { arabic: "الْآنَ", transliteration: "al-āna", indonesian: "Sekarang", emoji: "⏰", bg: "bg-cyan-50", border: "border-cyan-300", accent: "text-cyan-600", badgeBg: "bg-cyan-100", sentence: "الْآنَ يَوْمُ الإِثْنَيْنِ.", sentenceId: "Sekarang hari Senin.", context: "Digunakan untuk menyatakan waktu saat ini." },
  { arabic: "بِالْأَمْسِ", transliteration: "bil-amsi", indonesian: "Kemarin", emoji: "📅", bg: "bg-indigo-50", border: "border-indigo-300", accent: "text-indigo-600", badgeBg: "bg-indigo-100", sentence: "بِالْأَمْسِ يَوْمُ الْأَحَدِ.", sentenceId: "Kemarin hari Minggu.", context: "Merujuk pada hari sebelum hari ini." },
  { arabic: "أَوَّلُ الْأَمْسِ", transliteration: "awwalu al-amsi", indonesian: "Kemarin lusa", emoji: "⏪", bg: "bg-violet-50", border: "border-violet-300", accent: "text-violet-600", badgeBg: "bg-violet-100", sentence: "أَوَّلُ الْأَمْسِ يَوْمُ السَّبْتِ.", sentenceId: "Kemarin lusa hari Sabtu.", context: "Merujuk pada dua hari sebelum hari ini." },
  { arabic: "غَدًا", transliteration: "ghadan", indonesian: "Besok", emoji: "🌤️", bg: "bg-amber-50", border: "border-amber-300", accent: "text-amber-600", badgeBg: "bg-amber-100", sentence: "غَدًا يَوْمُ الثُّلَاثَاءِ.", sentenceId: "Besok hari Selasa.", context: "Merujuk pada hari setelah hari ini." },
  { arabic: "بَعْدَ غَدٍ", transliteration: "ba'da ghadin", indonesian: "Besok lusa", emoji: "⏩", bg: "bg-rose-50", border: "border-rose-300", accent: "text-rose-600", badgeBg: "bg-rose-100", sentence: "بَعْدَ غَدٍ يَوْمُ الْأَرْبِعَاءِ.", sentenceId: "Besok lusa hari Rabu.", context: "Merujuk pada dua hari setelah hari ini." },
];

const STORY = {
  arabic: "أَنَا طَالِبٌ فِي الصَّفِّ السَّابِعِ. اسْمِي أَحْمَدُ.\nأَذْهَبُ إِلَى الْمَدْرَسَةِ فِي أَيَّامِ الإِثْنَيْنِ وَالثُّلَاثَاءِ وَالْأَرْبِعَاءِ وَالْخَمِيسِ.\nيَوْمَ الْجُمُعَةِ أُصَلِّي فِي الْمَسْجِدِ مَعَ أَبِي.\nيَوْمَ السَّبْتِ وَالْأَحَدِ أَسْتَرِيحُ فِي الْبَيْتِ.\nأُحِبُّ يَوْمَ الْجُمُعَةِ كَثِيرًا!",
  indonesian: "Saya seorang siswa kelas tujuh. Nama saya Ahmad.\nSaya pergi ke sekolah pada hari Senin, Selasa, Rabu, dan Kamis.\nHari Jumat saya shalat di masjid bersama ayah saya.\nHari Sabtu dan Minggu saya beristirahat di rumah.\nSaya sangat suka hari Jumat!",
};

const ARRANGE_DATA = [
  { words: ["مُبَارَكٌ", "الْجُمْعَةِ", "يَوْمُ"], correct: ["يَوْمُ", "الْجُمْعَةِ", "مُبَارَكٌ"], meaning: "Hari Jumat penuh berkah" },
  { words: ["الْمَدْرَسَةِ", "إِلَى", "أَذْهَبُ"], correct: ["أَذْهَبُ", "إِلَى", "الْمَدْرَسَةِ"], meaning: "Aku pergi ke sekolah" },
  { words: ["الْبَيْتِ", "فِي", "أَسْتَرِيحُ"], correct: ["أَسْتَرِيحُ", "فِي", "الْبَيْتِ"], meaning: "Aku beristirahat di rumah" },
  { words: ["الإِثْنَيْنِ", "يَوْمُ", "الْآنَ"], correct: ["الْآنَ", "يَوْمُ", "الإِثْنَيْنِ"], meaning: "Sekarang hari Senin" },
  { words: ["الْأَحَدِ", "يَوْمُ", "بِالْأَمْسِ"], correct: ["بِالْأَمْسِ", "يَوْمُ", "الْأَحَدِ"], meaning: "Kemarin hari Minggu" },
  { words: ["الثُّلَاثَاءِ", "يَوْمُ", "غَدًا"], correct: ["غَدًا", "يَوْمُ", "الثُّلَاثَاءِ"], meaning: "Besok hari Selasa" },
];

// ────────────────────────────────────────────────────────────────
// SHARED: AudioPlayer (simulated — no real audio file required)
// ────────────────────────────────────────────────────────────────
function AudioPlayer({
  label,
  duration = 22,
  onComplete,
  compact = false,
}: {
  label?: string;
  duration?: number;
  onComplete?: () => void;
  compact?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (playing && !done) {
      intervalRef.current = window.setInterval(() => {
        setProgress((p) => {
          const next = p + (100 / (duration * 10)) * speed;
          if (next >= 100) {
            setPlaying(false);
            setDone(true);
            return 100;
          }
          return next;
        });
      }, 100);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, done, speed, duration]);

  useEffect(() => {
    if (done) onComplete?.();
  }, [done]);

  const toggle = () => {
    if (done) { setProgress(0); setDone(false); setPlaying(true); }
    else setPlaying((p) => !p);
  };

  const replay = () => { setProgress(0); setDone(false); setPlaying(true); };

  const fmt = (pct: number) => {
    const s = Math.floor((pct / 100) * duration);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className={`bg-white rounded-2xl border-2 border-cyan-200 p-4 space-y-3 ${compact ? "p-3" : ""}`}>
      {label && <p className="text-xs font-bold text-cyan-600 font-body">{label}</p>}
      <div className="space-y-1">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setProgress(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
          }}>
          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 font-body">
          <span>{fmt(progress)}</span>
          <span>{fmt(100)}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button onClick={replay}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-90 transition-all text-sm">
          ↩
        </button>
        <button onClick={toggle}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl hover:scale-110 active:scale-95 transition-all shadow-md">
          {playing ? "⏸" : done ? "↺" : "▶"}
        </button>
        {!compact && (
          <div className="flex gap-1">
            {[0.75, 1, 1.25].map((s) => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${speed === s ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                {s}×
              </button>
            ))}
          </div>
        )}
      </div>
      {playing && (
        <div className="flex items-center justify-center gap-0.5 h-6">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="w-1 bg-cyan-400 rounded-full animate-pulse"
              style={{ height: `${8 + ((i * 7) % 12)}px`, animationDelay: `${i * 0.06}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// SHARED: MicRecorder (real MediaRecorder API with UI fallback)
// ────────────────────────────────────────────────────────────────
type RecordState = "idle" | "recording" | "done";

function MicRecorder({
  onSubmit,
  submitLabel = "✓ Selesai",
}: {
  onSubmit?: (blob: Blob | null) => void;
  submitLabel?: string;
}) {
  const [state, setState] = useState<RecordState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blobData, setBlobData] = useState<Blob | null>(null);
  const [simMode, setSimMode] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recorderContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === "recording" || state === "done") {
      recorderContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, []);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setBlobData(blob);
        stream.getTracks().forEach((t) => t.stop());
        setState("done");
        stopTimer();
      };
      recorder.start();
      setState("recording");
      startTimer();
    } catch {
      setSimMode(true);
      setState("recording");
      startTimer();
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    } else {
      stopTimer();
      setState("done");
    }
  };

  const reset = () => { setState("idle"); setSeconds(0); setAudioUrl(null); setBlobData(null); setSimMode(false); };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div ref={recorderContainerRef} className="bg-white rounded-2xl border-2 border-rose-200 p-5 space-y-4">
      {simMode && (
        <div className="bg-orange-50 rounded-xl p-2 text-xs text-orange-600 font-body text-center">
          ⚠️ Mode simulasi — izin mikrofon tidak tersedia
        </div>
      )}
      {state === "idle" && (
        <div className="text-center space-y-3">
          <button onClick={startRecording}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-5xl mx-auto shadow-lg hover:scale-110 active:scale-95 transition-all">
            🎤
          </button>
          <p className="text-gray-400 font-body text-sm">Tekan untuk mulai merekam</p>
        </div>
      )}
      {state === "recording" && (
        <div className="text-center space-y-3">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-red-400 opacity-25 animate-ping" />
            <button onClick={stopRecording}
              className="relative w-24 h-24 rounded-full bg-red-500 flex items-center justify-center text-4xl shadow-lg hover:bg-red-600 active:scale-95 transition-all">
              ⏹
            </button>
          </div>
          <div className="text-red-500 font-black text-2xl" style={{ fontFamily: "Nunito, sans-serif" }}>{fmt(seconds)}</div>
          <p className="text-gray-400 font-body text-xs flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            Sedang merekam...
          </p>
          <div className="flex items-center justify-center gap-0.5 h-8">
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i} className="w-1.5 bg-red-400 rounded-full animate-pulse"
                style={{ height: `${12 + ((i * 5 + 3) % 16)}px`, animationDelay: `${i * 0.04}s`, animationDuration: `${0.5 + (i % 3) * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
      {state === "done" && (
        <div className="text-center space-y-4">
          <div className="text-5xl bounce-in">✅</div>
          <p className="font-bold text-green-600 font-body text-sm">Rekaman selesai! ({fmt(seconds)})</p>
          {audioUrl
            ? <audio controls src={audioUrl} className="w-full rounded-xl" />
            : <div className="bg-gray-100 rounded-xl p-3 text-xs text-gray-400 font-body">[Mode simulasi — rekaman tidak disimpan]</div>}
          <div className="flex gap-2">
            <button onClick={reset}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold font-body hover:bg-gray-200 active:scale-95 transition-all text-sm">
              ↩ Rekam Ulang
            </button>
            <button onClick={() => onSubmit?.(blobData)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 text-white font-black hover:scale-105 active:scale-95 transition-all"
              style={{ fontFamily: "Nunito, sans-serif" }}>
              {submitLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// SHARED UI
// ────────────────────────────────────────────────────────────────
function ArabicText({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span dir="rtl" className={className} style={{ fontFamily: "'Noto Naskh Arabic', 'Arial', serif", ...style }}>
      {children}
    </span>
  );
}

function GeomShapes() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      <div className="absolute top-8 left-8 w-20 h-20 rounded-full bg-yellow-200 opacity-50" />
      <div className="absolute top-28 right-16 w-12 h-12 rotate-45 bg-pink-200 opacity-60" />
      <div className="absolute bottom-48 left-1/4 w-16 h-16 rounded-full bg-cyan-200 opacity-50" />
      <div className="absolute bottom-16 right-8 w-28 h-28 rounded-full bg-purple-200 opacity-40" />
      <div className="absolute top-1/2 left-4 w-10 h-10 rotate-12 bg-green-200 opacity-60" />
      <div className="absolute top-16 left-1/2 w-8 h-8 rounded-full bg-orange-200 opacity-50" />
      <div className="absolute bottom-1/3 right-1/3 w-12 h-12 rotate-45 bg-yellow-300 opacity-35" />
    </div>
  );
}

function NavBar({ page, onHome }: { page: Page; onHome: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const labels: Record<Page, string> = {
    home: "", about: "👤 Tentang Pembuat", info: "ℹ️ Tujuan Pembelajaran",
    profile: "✨ Profil Pelajar", materials: "📚 Pilih Materi",
    mindful: "🧠 Mindful Learning",
    meaningful: "📖 Materi الأيام",
    listening: "🎧 Istimā' — Mendengar",
    speaking: "🎤 Kalām — Berbicara",
    writing: "✍️ Kitābah — Menulis",
    joyful: "🎮 Mini Game",
    evaluation: "📝 Evaluasi",
    reflection: "💭 Refleksi",
    result: "🏆 Hasil Belajar",
  };
  const learningPages: Page[] = ["mindful", "meaningful", "listening", "speaking", "writing", "joyful", "evaluation", "reflection"];
  const showWarning = learningPages.includes(page);

  if (page === "home") return null;
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b-2 border-cyan-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => showWarning ? setShowConfirm(true) : onHome()}
          className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 text-lg font-bold hover:bg-cyan-200 active:scale-90 transition-all">
          ←
        </button>
        <span className="font-bold text-gray-700" style={{ fontFamily: "Nunito, sans-serif" }}>{labels[page]}</span>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4 pop-in">
            <div className="text-center space-y-2">
              <div className="text-4xl">⚠️</div>
              <h3 className="text-xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Kembali ke Beranda?</h3>
              <p className="text-gray-500 font-body text-sm">Jika kamu kembali ke beranda sekarang, progress pembelajaranmu akan diulang dari awal.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                style={{ fontFamily: "Nunito, sans-serif" }}>
                Batalkan
              </button>
              <button onClick={() => { setShowConfirm(false); onHome(); }}
                className="py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black hover:scale-105 active:scale-95 transition-all"
                style={{ fontFamily: "Nunito, sans-serif" }}>
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StepBar(_props: { page: Page }) {
  return null;
}

// ────────────────────────────────────────────────────────────────
// HOME PAGE
// ────────────────────────────────────────────────────────────────
function HomePage({ onStart, onNav }: { onStart: () => void; onNav: (p: Page) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <GeomShapes />
      {/* Hamburger button */}
      <button onClick={() => setMenuOpen(true)}
        className="fixed top-5 right-5 z-50 w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-sm shadow-md border border-gray-200 flex flex-col items-center justify-center gap-1.5 hover:bg-gray-50 active:scale-95 transition-all">
        <div className="w-5 h-0.5 bg-gray-600 rounded-full" />
        <div className="w-5 h-0.5 bg-gray-600 rounded-full" />
        <div className="w-5 h-0.5 bg-gray-600 rounded-full" />
      </button>
      {/* Hamburger menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setMenuOpen(false)}>
          <div className="flex-1" />
          <div className="w-64 bg-white shadow-2xl flex flex-col p-6 space-y-2 pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-black text-gray-800 text-lg" style={{ fontFamily: "Nunito, sans-serif" }}>Menu</span>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-90 transition-all text-sm font-bold">✕</button>
            </div>
            {[
              { icon: "🏠", label: "Home", action: () => { setMenuOpen(false); } },
              { icon: "👤", label: "About", action: () => { setMenuOpen(false); onNav("about"); } },
              { icon: "ℹ️", label: "Info", action: () => { setMenuOpen(false); onNav("info"); } },
            ].map((item) => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-amber-50 active:scale-95 transition-all text-left">
                <span className="text-xl">{item.icon}</span>
                <span className="font-bold text-gray-700" style={{ fontFamily: "Nunito, sans-serif" }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent leading-tight" style={{ fontFamily: "Nunito, sans-serif", textWrap: "balance" }}>
            Hai! Siap belajar Bahasa Arab dengan cara yang seru dan menyenangkan?
          </h1>
        </div>
        <button onClick={onStart}
          className="w-full py-5 rounded-3xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-2xl font-black shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
          style={{ fontFamily: "Nunito, sans-serif" }}>
          🚀 Mulai Belajar!
        </button>
        <p className="text-gray-400 text-sm font-body">Deep Learning · 4 Maharah Bahasa</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MATERIALS PAGE
// ────────────────────────────────────────────────────────────────
function MaterialsPage({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-sky-100 p-6 pt-20">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Pilih Materi</h2>
          <p className="text-gray-500 font-body mt-1">Klik materi yang ingin kamu pelajari!</p>
        </div>
        <button onClick={onSelect} className="w-full bg-white rounded-3xl shadow-xl border-2 border-cyan-300 p-6 space-y-4 hover:scale-105 active:scale-95 transition-all duration-200 text-left">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-4xl shrink-0">📅</div>
            <div className="flex-1">
              <ArabicText className="text-3xl font-black text-gray-800">الأيام</ArabicText>
              <div className="text-xl font-bold text-cyan-600" style={{ fontFamily: "Nunito, sans-serif" }}>Hari-hari dalam Seminggu</div>
              <p className="text-gray-500 font-body text-sm mt-1">Pelajari nama hari dalam Bahasa Arab melalui 4 keterampilan bahasa lengkap.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["⭐ Pemula", "📚 13 Kosakata", "🎧🎤📖✍️ 4 Maharah"].map((b) => (
              <span key={b} className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold">{b}</span>
            ))}
          </div>
          <div className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-lg font-black text-center" style={{ fontFamily: "Nunito, sans-serif" }}>
            Mulai Belajar →
          </div>
        </button>
        <div className="mt-4 space-y-3">
          {["التحية — Salam", "الأسرة — Keluarga", "المدرسة — Sekolah"].map((m) => (
            <div key={m} className="bg-gray-100 rounded-2xl border-2 border-gray-200 p-5 opacity-60 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-300 flex items-center justify-center text-xl">🔒</div>
              <div>
                <div className="font-bold text-gray-500" style={{ fontFamily: "Nunito, sans-serif" }}>{m}</div>
                <div className="text-xs text-gray-400 font-body">Selesaikan materi sebelumnya</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// STUDENT PROFILE PAGE
// ────────────────────────────────────────────────────────────────
const AVATARS = ["🐱", "🐼", "🐰", "🦊", "🐻", "🐧", "🐸", "🐥", "🍎", "🍌", "🍓", "🍊", "🍇", "🍉", "🍒"];
const KELAS_OPTIONS = ["7A", "7B", "7C", "7D", "7E", "7F", "7G", "7H", "7I"];

function StudentProfilePage({ onComplete }: { onComplete: (p: StudentProfile) => void }) {
  const [name, setName] = useState("");
  const [kelas, setKelas] = useState("");
  const [avatar, setAvatar] = useState("");
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const canContinue = name.trim().length > 0 && kelas !== "" && avatar !== "";

  useEffect(() => {
    if (avatar) {
      setTimeout(() => saveButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, [avatar]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 p-6 pt-20 pb-10">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">✨</div>
          <h2 className="text-2xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Sebelum mulai belajar, kenalan dulu yuk!</h2>
          <p className="text-gray-500 font-body text-sm">Isi nama, kelas, dan pilih avatar kamu sebelum memulai pembelajaran.</p>
        </div>

        {/* Name */}
        <div className="bg-white rounded-3xl shadow-lg border-2 border-sky-200 p-5 space-y-3">
          <label className="block font-black text-gray-700" style={{ fontFamily: "Nunito, sans-serif" }}>Nama</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masukkan nama kamu"
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-sky-200 text-gray-700 font-body text-base focus:outline-none focus:border-sky-400 transition-all"
          />
        </div>

        {/* Class */}
        <div className="bg-white rounded-3xl shadow-lg border-2 border-sky-200 p-5 space-y-3">
          <label className="block font-black text-gray-700" style={{ fontFamily: "Nunito, sans-serif" }}>Kelas</label>
          <select
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-sky-200 text-gray-700 font-body text-base focus:outline-none focus:border-sky-400 transition-all bg-white appearance-none cursor-pointer"
            style={{ fontFamily: "Nunito, sans-serif" }}>
            <option value="">Pilih kelas ▾</option>
            {KELAS_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-3xl shadow-lg border-2 border-sky-200 p-5 space-y-3">
          <label className="block font-black text-gray-700" style={{ fontFamily: "Nunito, sans-serif" }}>Pilih Avatar</label>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((a) => (
              <button key={a} onClick={() => setAvatar(a)}
                className={`w-full aspect-square rounded-2xl border-2 flex items-center justify-center text-3xl transition-all ${avatar === a ? "border-sky-500 bg-sky-50 scale-110 shadow-md" : "border-gray-200 bg-gray-50 hover:border-sky-300 hover:bg-sky-50"}`}>
                {a}
              </button>
            ))}
          </div>
          {avatar && (
            <div className="flex items-center gap-3 bg-sky-50 rounded-2xl p-3 border border-sky-200 pop-in">
              <span className="text-4xl">{avatar}</span>
              <div>
                <p className="font-bold text-sky-700 text-sm" style={{ fontFamily: "Nunito, sans-serif" }}>Avatar dipilih!</p>
                <p className="text-xs text-sky-400 font-body">Kamu terlihat keren 🌟</p>
              </div>
            </div>
          )}
        </div>

        <button ref={saveButtonRef} onClick={() => canContinue && onComplete({ name: name.trim(), kelas, avatar })}
          disabled={!canContinue}
          className={`w-full py-5 rounded-3xl text-xl font-black shadow-xl transition-all duration-200 ${canContinue ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:scale-105 active:scale-95 hover:shadow-2xl" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          style={{ fontFamily: "Nunito, sans-serif" }}>
          💾 Simpan & Lanjutkan
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// ABOUT PAGE
// ────────────────────────────────────────────────────────────────
function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6 pt-20">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-5">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-6 text-white text-center">
          <div className="text-4xl mb-2">👤</div>
          <h2 className="text-2xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>Tentang Pembuat</h2>
        </div>
        <div className="bg-white rounded-3xl shadow-lg border-2 border-amber-200 p-8 space-y-5 text-center">
          <div className="w-32 h-32 rounded-full overflow-hidden mx-auto shadow-xl border-4 border-amber-300 bg-amber-100 flex items-center justify-center">
            <img src={creatorPhotoUrl} alt="Jihan Naziiha" loading="lazy" decoding="async" className="w-full h-full object-cover object-center" style={{ display: "block" }} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Jihan Naziiha</h3>
            <p className="text-amber-600 font-bold font-body text-sm mt-1">Mahasiswi Pendidikan Bahasa Arab</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-200 text-left">
            <p className="text-gray-700 font-body text-sm leading-relaxed">
              Jihan Naziiha adalah seorang mahasiswi Program Studi Pendidikan Bahasa Arab, Fakultas Bahasa dan Seni, Universitas Negeri Jakarta.
            </p>
          </div>
        </div>
        <button onClick={onBack} className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
          ← Kembali
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// INFO PAGE
// ────────────────────────────────────────────────────────────────
function InfoPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-6 pt-20 pb-10">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-5">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl p-6 text-white text-center">
          <div className="text-4xl mb-2">ℹ️</div>
          <h2 className="text-2xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>Tujuan Pembelajaran</h2>
        </div>
        <div className="bg-white rounded-3xl shadow-lg border-2 border-teal-200 p-6 space-y-4">
          <p className="text-gray-700 font-body text-sm leading-relaxed">
            Website ini dirancang sebagai media pembelajaran Bahasa Arab berbasis pendekatan <strong>Deep Learning</strong> untuk siswa Kelas 7 <strong>SMP Islam Panglima Besar Soedirman</strong>. Pembelajaran dirancang agar bermakna, menyenangkan, dan penuh kesadaran.
          </p>
          <div className="space-y-2">
            <p className="font-black text-gray-800 text-sm" style={{ fontFamily: "Nunito, sans-serif" }}>Pendekatan Deep Learning:</p>
            {[["🧠", "Mindful Learning", "Mengaktifkan pengetahuan awal sebelum belajar"], ["📖", "Meaningful Learning", "Menghubungkan materi dengan konteks nyata kehidupan sehari-hari"], ["🎉", "Joyful Learning", "Belajar melalui permainan yang menyenangkan dan kreatif"]].map(([icon, title, desc]) => (
              <div key={String(title)} className="flex items-start gap-3 bg-teal-50 rounded-2xl p-3 border border-teal-200">
                <span className="text-xl shrink-0">{icon}</span>
                <div>
                  <div className="font-bold text-teal-700 text-sm" style={{ fontFamily: "Nunito, sans-serif" }}>{String(title)}</div>
                  <div className="text-xs text-gray-500 font-body">{String(desc)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="font-black text-gray-800 text-sm" style={{ fontFamily: "Nunito, sans-serif" }}>4 Maharah yang Dikembangkan:</p>
            {[["🎧", "الِاسْتِمَاعُ — Istimā'", "Mendengarkan"], ["🎤", "الْكَلَامُ — Kalām", "Berbicara"], ["📖", "الْقِرَاءَةُ — Qirā'ah", "Membaca"], ["✍️", "الْكِتَابَةُ — Kitābah", "Menulis"]].map(([icon, ar, id]) => (
              <div key={String(ar)} className="flex items-center gap-3 bg-cyan-50 rounded-2xl px-4 py-3 border border-cyan-200">
                <span className="text-xl">{icon}</span>
                <ArabicText className="font-bold text-cyan-700 text-sm flex-1">{String(ar)}</ArabicText>
                <span className="text-xs text-gray-500 font-body">{String(id)}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onBack} className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
          ← Kembali
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MINDFUL LEARNING
// ────────────────────────────────────────────────────────────────
type MindfulStep = "q1" | "q2a" | "q2b" | "response";

function MindfulPage({ onComplete, onSave }: { onComplete: () => void; onSave: (d: MindfulData) => void }) {
  const [step, setStep] = useState<MindfulStep>("q1");
  const [experience, setExperience] = useState<"yes" | "no" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const mindfulLanjutRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (selected) {
      setTimeout(() => mindfulLanjutRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [selected]);

  const memoryOpts = ["Saya masih ingat beberapa kosakata.", "Saya masih ingat cara mengucapkannya.", "Saya masih ingat cara menulisnya.", "Saya masih ingat sedikit, tetapi belum yakin.", "Saya lupa sebagian besar."];
  const guessOpts = ["Waktu dan tanggal 📅", "Kegiatan sehari-hari 🌞", "Nama-nama tempat 🗺️", "Angka dan hitungan 🔢", "Aku tidak tahu 🤷"];

  const personalizedResp = (m: string) => {
    if (m.includes("beberapa kosakata")) return "Luar biasa! Ingatanmu masih bagus. Kita akan memperkuat lagi hari ini! 💪";
    if (m.includes("mengucapkan")) return "Bagus! Pengucapan itu penting. Yuk kita asah lagi bersama! 🎵";
    if (m.includes("cara menulis")) return "Keren! Kamu ingat cara menulisnya. Hari ini kita latihan menulis lagi! ✍️";
    if (m.includes("sedikit")) return "Tidak apa-apa! Yang penting kamu mau belajar lagi. Yuk kita mulai! 😊";
    return "Tidak apa-apa lupa! Hari ini kita belajar dengan cara yang menyenangkan! 🌟";
  };

  const handleQ1 = (ans: "yes" | "no") => { setExperience(ans); setStep(ans === "yes" ? "q2a" : "q2b"); };
  const handleQ2 = () => {
    if (!selected) return;
    onSave({ experience: experience!, memory: experience === "yes" ? selected : null, guess: experience === "no" ? selected : null });
    setStep("response");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 pt-28">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-5">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-5 text-white text-center">
          <div className="text-4xl mb-1">🧠</div>
          <h2 className="text-2xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>Mindful Learning</h2>
          <p className="text-indigo-100 font-body text-sm mt-1">Sebelum belajar, mari pikirkan dulu apa yang sudah kamu tahu!</p>
        </div>
        {step === "q1" && (
          <div className="bg-white rounded-3xl shadow-lg p-6 space-y-5 pop-in">
            <p className="text-xl font-black text-gray-800 text-center leading-snug" style={{ fontFamily: "Nunito, sans-serif" }}>Apakah kamu pernah belajar tentang materi ini?</p>
            <p className="text-center text-gray-400 font-body text-sm">Materi: <ArabicText className="font-bold text-gray-600">الأيام</ArabicText> (Hari-hari dalam Seminggu)</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleQ1("yes")} className="py-8 rounded-2xl bg-green-100 border-2 border-green-300 text-green-700 font-black text-lg hover:bg-green-200 hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>✅<br />Ya, pernah!</button>
              <button onClick={() => handleQ1("no")} className="py-8 rounded-2xl bg-orange-100 border-2 border-orange-300 text-orange-700 font-black text-lg hover:bg-orange-200 hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>🆕<br />Belum pernah</button>
            </div>
          </div>
        )}
        {step === "q2a" && (
          <div className="bg-white rounded-3xl shadow-lg p-6 space-y-4 pop-in">
            <p className="text-xl font-black text-gray-800 text-center" style={{ fontFamily: "Nunito, sans-serif" }}>Apa yang masih kamu ingat tentang materi ini?</p>
            <div className="space-y-2">
              {memoryOpts.map((opt) => (
                <button key={opt} onClick={() => setSelected(opt)}
                  className={`w-full text-left py-4 px-4 rounded-2xl border-2 font-body text-sm transition-all ${selected === opt ? "bg-indigo-100 border-indigo-400 text-indigo-800" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-indigo-300"}`}>
                  {selected === opt ? "✅ " : "○ "}{opt}
                </button>
              ))}
            </div>
            <button ref={mindfulLanjutRef} onClick={handleQ2} disabled={!selected} className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-lg disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>Lanjut →</button>
          </div>
        )}
        {step === "q2b" && (
          <div className="bg-white rounded-3xl shadow-lg p-6 space-y-4 pop-in">
            <p className="text-xl font-black text-gray-800 text-center leading-snug" style={{ fontFamily: "Nunito, sans-serif" }}>Tidak apa-apa! Menurutmu, <ArabicText className="text-indigo-600">الأيام</ArabicText> berkaitan dengan apa?</p>
            <div className="space-y-2">
              {guessOpts.map((opt) => (
                <button key={opt} onClick={() => setSelected(opt)}
                  className={`w-full text-left py-4 px-4 rounded-2xl border-2 font-body text-sm transition-all ${selected === opt ? "bg-orange-100 border-orange-400 text-orange-800" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-orange-300"}`}>
                  {selected === opt ? "✅ " : "○ "}{opt}
                </button>
              ))}
            </div>
            <button ref={mindfulLanjutRef} onClick={handleQ2} disabled={!selected} className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-black text-lg disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>Lanjut →</button>
          </div>
        )}
        {step === "response" && (
          <div className="bg-white rounded-3xl shadow-lg p-8 space-y-5 text-center pop-in">
            <div className="text-6xl bounce-in">{experience === "yes" ? "🌟" : "🚀"}</div>
            <p className="text-xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>
              {experience === "yes" ? personalizedResp(selected || "") : "Luar biasa! Kamu berani mencoba hal baru. Belajar itu menyenangkan! 🎉"}
            </p>
            <p className="text-gray-400 font-body text-sm">Jawabanmu disimpan dan akan ditampilkan kembali saat Refleksi nanti.</p>
            <button onClick={onComplete} className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-black text-xl hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
              {experience === "yes" ? "📖 Lanjut ke Materi!" : "📖 Mari Pelajari!"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MEANINGFUL LEARNING — Vocabulary with audio
// ────────────────────────────────────────────────────────────────
function MeaningfulPage({ onComplete }: { onComplete: () => void }) {
  const ALL_VOCAB = [...DAYS, ...EXTRA_VOCAB];
  const [idx, setIdx] = useState(0);
  const [showExample, setShowExample] = useState(false);
  const [audioKey, setAudioKey] = useState(0);
  const [playingVocab, setPlayingVocab] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const exampleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showExample) {
      setTimeout(() => exampleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [showExample]);

  const item = ALL_VOCAB[idx];
  const isExtraPhase = idx >= DAYS.length;

  const goNext = () => {
    setShowExample(false);
    setPlayingVocab(false);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (idx < ALL_VOCAB.length - 1) setIdx(idx + 1);
    else onComplete();
  };

  return (
    <div ref={topRef} className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-6 pt-20 pb-10">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-4">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-4 text-white text-center">
          <div className="text-2xl mb-1">📖</div>
          <h2 className="text-xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>Materi — الأيام</h2>
          <p className="text-emerald-100 font-body text-xs">{isExtraPhase ? "Kosakata Tambahan" : "Hari-hari dalam Seminggu"}</p>
        </div>
        <div className="flex justify-between items-center">
          <div className="bg-white rounded-2xl px-4 py-2 shadow-sm border-2 border-emerald-200 font-bold text-emerald-600 text-sm" style={{ fontFamily: "Nunito, sans-serif" }}>{idx + 1} / {ALL_VOCAB.length}</div>
          <div className="text-xs text-gray-400 font-body">{isExtraPhase ? "🗓️ Kosakata Waktu" : "📖 Kosakata Hari"}</div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${((idx + 1) / ALL_VOCAB.length) * 100}%` }} />
        </div>
        <div className={`bg-white rounded-3xl shadow-xl border-2 ${item.border} p-5 space-y-4 pop-in`} key={idx}>
          <div className="text-center space-y-2">
            <ArabicText className="block text-5xl sm:text-6xl font-black text-gray-800">{item.arabic}</ArabicText>
            <div className={`text-sm font-bold ${item.accent} font-body`}>/{item.transliteration}/</div>
          </div>
          <div className="border-t-2 border-dashed border-gray-100" />
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>{item.indonesian}</div>
            <div className="text-gray-400 font-body text-xs mt-1">dalam Bahasa Indonesia</div>
          </div>
          {/* Direct audio button for vocabulary */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => { setAudioKey((k) => k + 1); setPlayingVocab(true); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95 ${playingVocab ? `${item.bg} ${item.border} ${item.accent} shadow-md` : "bg-gray-50 border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600"}`}>
              <span className="text-lg">🔊</span>
              <span>{playingVocab ? "Memutar..." : item.arabic}</span>
            </button>
          </div>
          {playingVocab && (
            <div className="pop-in">
              <AudioPlayer key={audioKey} label={`${item.arabic}`} duration={2} compact onComplete={() => setPlayingVocab(false)} />
            </div>
          )}
        </div>
        <div className={`${item.bg} rounded-2xl p-4 border-2 ${item.border} flex items-start gap-3`}>
          <span className="text-xl">💡</span>
          <div>
            <p className={`font-bold ${item.accent} text-xs font-body`}>Konteks Nyata:</p>
            <p className="text-gray-700 font-body text-sm">{item.context}</p>
          </div>
        </div>
        <button onClick={() => setShowExample(!showExample)} className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold font-body text-sm hover:border-teal-300 hover:text-teal-600 active:scale-95 transition-all">
          {showExample ? "🙈 Sembunyikan Contoh" : "👀 Lihat Contoh Kalimat"}
        </button>
        {showExample && (
          <div ref={exampleRef} className="bg-white rounded-2xl shadow-md p-4 border-l-4 border-teal-400 space-y-2 pop-in">
            <ArabicText className="block text-xl font-bold text-gray-800 text-right">{item.sentence}</ArabicText>
            <p className="text-gray-500 font-body text-sm italic">"{item.sentenceId}"</p>
            <AudioPlayer label="🔊 Contoh kalimat" duration={4} compact />
          </div>
        )}
        <div className="grid grid-cols-5 gap-3">
          <button onClick={() => { setShowExample(false); setPlayingVocab(false); if (idx > 0) setIdx(idx - 1); }} disabled={idx === 0}
            className="col-span-2 py-4 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold font-body disabled:opacity-30 hover:border-teal-300 active:scale-95 transition-all">
            ← Kembali
          </button>
          <button onClick={goNext} className="col-span-3 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-md" style={{ fontFamily: "Nunito, sans-serif" }}>
            {idx === ALL_VOCAB.length - 1 ? "Selesai!" : "Lanjut →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// PRACTICE — Click-to-Match
// ────────────────────────────────────────────────────────────────
function PracticePage({ onComplete }: { onComplete: () => void }) {
  const [leftItems] = useState(() => DAYS.slice(0, 5));
  const [rightItems] = useState(() => [...DAYS.slice(0, 5)].sort(() => Math.random() - 0.5));
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [selRight, setSelRight] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);

  const matchedLeft = Object.keys(matches).map(Number);
  const matchedRight = Object.values(matches);

  const checkMatch = (li: number, ri: number) => {
    if (leftItems[li].arabic === rightItems[ri].arabic) setMatches((p) => ({ ...p, [li]: ri }));
    else { setWrongPair([li, ri]); setTimeout(() => setWrongPair(null), 700); }
    setSelLeft(null); setSelRight(null);
  };

  const handleLeft = (i: number) => { if (matchedLeft.includes(i)) return; if (selLeft === i) { setSelLeft(null); return; } if (selRight !== null) { checkMatch(i, selRight); return; } setSelLeft(i); };
  const handleRight = (i: number) => { if (matchedRight.includes(i)) return; if (selRight === i) { setSelRight(null); return; } if (selLeft !== null) { checkMatch(selLeft, i); return; } setSelRight(i); };
  const allDone = Object.keys(matches).length === leftItems.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6 pt-28">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Cocokkan Kata!</h2>
          <p className="text-gray-500 font-body text-sm mt-1">Klik Arab → klik artinya dalam Indonesia</p>
          <div className="mt-2 text-orange-600 font-bold" style={{ fontFamily: "Nunito, sans-serif" }}>{Object.keys(matches).length}/{leftItems.length} pasangan ✓</div>
        </div>
        {!allDone ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Arab</div>
                {leftItems.map((item, i) => {
                  const isMatched = matchedLeft.includes(i); const isSel = selLeft === i; const isWrong = wrongPair?.[0] === i;
                  return (
                    <button key={i} onClick={() => handleLeft(i)} disabled={isMatched}
                      className={`w-full py-5 rounded-2xl border-2 font-black text-xl transition-all ${isMatched ? "bg-green-100 border-green-400 text-green-600" : isWrong ? "bg-red-100 border-red-400 text-red-600 shake" : isSel ? "bg-orange-100 border-orange-400 text-orange-700 scale-105 shadow-md" : "bg-white border-gray-200 text-gray-700 hover:border-orange-300 active:scale-95"}`}>
                      {isMatched ? "✓" : <ArabicText>{item.arabic}</ArabicText>}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-3">
                <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Indonesia</div>
                {rightItems.map((item, i) => {
                  const isMatched = matchedRight.includes(i); const isSel = selRight === i; const isWrong = wrongPair?.[1] === i;
                  return (
                    <button key={i} onClick={() => handleRight(i)} disabled={isMatched}
                      className={`w-full py-5 rounded-2xl border-2 font-bold font-body transition-all ${isMatched ? "bg-green-100 border-green-400 text-green-600" : isWrong ? "bg-red-100 border-red-400 text-red-600 shake" : isSel ? "bg-orange-100 border-orange-400 text-orange-700 scale-105 shadow-md" : "bg-white border-gray-200 text-gray-700 hover:border-orange-300 active:scale-95"}`}>
                      {isMatched ? "✓" : item.indonesian}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-center text-gray-400 font-body text-xs">Pilih kata Arab, lalu pilih artinya!</p>
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-4 bounce-in">
            <div className="text-6xl">🎊</div>
            <h3 className="text-2xl font-black text-green-600" style={{ fontFamily: "Nunito, sans-serif" }}>Sempurna!</h3>
            <p className="text-gray-500 font-body">Kamu berhasil mencocokkan semua pasangan dengan benar!</p>
            <button onClick={onComplete} className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
              🎧 Lanjut ke Istimā'!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// LISTENING PAGE — Istimā'
// ────────────────────────────────────────────────────────────────
const LISTENING_QS = [
  { q: "مَاذَا يَفْعَلُ أَحْمَدُ يَوْمَ الإِثْنَيْنِ؟", opts: ["يَذْهَبُ إِلَى الْمَسْجِدِ", "يَذْهَبُ إِلَى الْمَدْرَسَةِ", "يَسْتَرِيحُ فِي الْبَيْتِ", "يَلْعَبُ كُرَةَ الْقَدَمِ"], ans: "يَذْهَبُ إِلَى الْمَدْرَسَةِ", arabic: true, type: "mc" },
  { q: "Benar atau Salah: Ahmad pergi ke masjid hari Jumat.", opts: ["Benar", "Salah"], ans: "Benar", arabic: false, type: "tf" },
  { q: "مَنْ يَسْأَلُ أَحْمَدَ فِي الْحِوَارِ؟", opts: ["أَبُوهُ", "مُعَلِّمُهُ", "مُحَمَّدٌ", "أُمُّهُ"], ans: "مُحَمَّدٌ", arabic: true, type: "mc" },
];

function ListeningPage({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"story" | "dialogue" | "questions" | "done">("story");
  const [showStoryText, setShowStoryText] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [hideDialogue, setHideDialogue] = useState(true);
  const [showDialogueTranslation, setShowDialogueTranslation] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const storyTextRef = useRef<HTMLDivElement>(null);
  const storyTranslationRef = useRef<HTMLDivElement>(null);
  const dialogueTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showStoryText) setTimeout(() => storyTextRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }, [showStoryText]);

  useEffect(() => {
    if (showTranslation && storyTranslationRef.current) {
      setTimeout(() => storyTranslationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [showTranslation]);

  useEffect(() => {
    if (!hideDialogue) setTimeout(() => dialogueTextRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [hideDialogue]);

  useEffect(() => {
    if (showDialogueTranslation) setTimeout(() => dialogueTextRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [showDialogueTranslation]);

  const q = LISTENING_QS[qIdx];

  useEffect(() => {
    if (chosen) scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [chosen]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [phase, qIdx]);

  const handleAnswer = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    const correct = opt === q.ans;
    playSound(correct ? "correct" : "wrong");
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      if (qIdx + 1 >= LISTENING_QS.length) setPhase("done");
      else { setQIdx((i) => i + 1); setChosen(null); }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 p-6 pt-20 pb-10">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-4">
        <div className="bg-gradient-to-r from-cyan-600 to-sky-500 rounded-3xl p-5 text-white text-center">
          <div className="text-3xl mb-1">🎧</div>
          <h2 className="text-2xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>الِاسْتِمَاعُ — Istimā'</h2>
          <p className="text-cyan-100 font-body text-sm">Dengarkan dengan saksama dan pahami isi percakapan atau cerita.</p>
        </div>

        {/* Phase indicator */}
        <div className="flex gap-2">
          {[["📕", "Cerita"], ["💬", "Dialog"], ["❓", "Pertanyaan"]].map(([icon, label], i) => {
            const phases = ["story", "dialogue", "questions"];
            const isActive = phases[i] === phase;
            const isDone = phases.indexOf(phase) > i;
            return (
              <div key={String(label)} className={`flex-1 rounded-xl py-2 text-center text-xs font-bold transition-all ${isActive ? "bg-cyan-500 text-white" : isDone ? "bg-green-100 text-green-700 border border-green-300" : "bg-white text-gray-400 border border-gray-200"}`}>
                {isDone ? "✓ " : ""}{icon} {String(label)}
              </div>
            );
          })}
        </div>

        {/* STORY phase */}
        {phase === "story" && (
          <div className="space-y-4 pop-in">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-4 text-white text-center">
              <ArabicText className="block text-xl font-black">قصة قصيرة</ArabicText>
              <p className="text-teal-100 text-xs font-body mt-1">Cerita Pendek tentang Hari-hari</p>
            </div>
            <StoryIllustration />
            <div className="bg-white rounded-3xl shadow-lg border-2 border-teal-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-teal-600 font-body">🔊 Dengarkan Cerita</span>
                <button onClick={() => setShowTranslation((v) => !v)}
                  className="text-xs px-3 py-1.5 rounded-full bg-teal-100 text-teal-600 font-bold hover:bg-teal-200 transition-all">
                  {showTranslation ? "Sembunyikan" : "Terjemahan"}
                </button>
              </div>
              <AudioPlayer label="Narasi Cerita" duration={18} onComplete={() => setShowStoryText(true)} />
              {showStoryText && (
                <div className="space-y-3 pop-in">
                  <div ref={storyTextRef} className="bg-teal-50 rounded-2xl p-4 border-2 border-teal-200 text-right" dir="rtl">
                    {STORY.arabic.split("\n").map((line, i) => (
                      <p key={i} className="text-base text-gray-800 leading-loose" style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }}>{line}</p>
                    ))}
                  </div>
                  {showTranslation && (
                    <div ref={storyTranslationRef} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      {STORY.indonesian.split("\n").map((line, i) => (
                        <p key={i} className="text-sm text-gray-600 font-body italic">{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!showStoryText && <p className="text-xs text-gray-400 font-body text-center">Tekan ▶ untuk mendengarkan cerita</p>}
            </div>
            <button onClick={() => setPhase("dialogue")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all"
              style={{ fontFamily: "Nunito, sans-serif" }}>
              💬 Lanjut ke Dialog →
            </button>
          </div>
        )}

        {/* DIALOGUE phase */}
        {phase === "dialogue" && (
          <div className="space-y-4 pop-in">
            <div className="bg-white rounded-2xl border-2 border-cyan-200 p-3 text-center">
              <ArabicText className="block text-lg font-black text-cyan-700">استمع جيدًا!</ArabicText>
              <p className="text-gray-500 font-body text-xs">Dengarkan dialog dengan saksama</p>
            </div>
            <DialogueIllustration />
            <div className="bg-white rounded-3xl shadow-lg border-2 border-cyan-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-cyan-600 font-body">الحوار — Dialog</span>
                <div className="flex gap-2">
                  <button onClick={() => setHideDialogue((v) => !v)}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-all">
                    {hideDialogue ? "👁 Tampilkan" : "🙈 Sembunyikan"}
                  </button>
                  <button onClick={() => setShowDialogueTranslation((v) => !v)}
                    className="text-xs px-3 py-1.5 rounded-full bg-cyan-100 text-cyan-600 font-bold hover:bg-cyan-200 transition-all">
                    🇮🇩
                  </button>
                </div>
              </div>
              <AudioPlayer label="استمع إلى الحوار — Dengarkan dialog" duration={22} />
              {!hideDialogue && (
                <div ref={dialogueTextRef} className="space-y-2 pop-in">
                  {DIALOGUE.map((line, i) => (
                    <div key={i} className={`flex items-start gap-2 ${line.side === "right" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${line.side === "left" ? "bg-cyan-200 text-cyan-700" : "bg-green-200 text-green-700"}`}
                        style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }}>
                        {line.speaker.slice(0, 1)}
                      </div>
                      <div className={`rounded-2xl p-2.5 max-w-[75%] ${line.side === "left" ? "bg-cyan-50 border border-cyan-200" : "bg-green-50 border border-green-200"}`}>
                        <ArabicText className="block text-sm text-gray-800">{line.arabic}</ArabicText>
                        {showDialogueTranslation && <p className="text-xs text-gray-400 font-body mt-0.5 italic">{line.indonesian}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setPhase("questions")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-sky-500 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all"
              style={{ fontFamily: "Nunito, sans-serif" }}>
              ❓ Jawab Pertanyaan →
            </button>
          </div>
        )}

        {/* QUESTIONS phase */}
        {phase === "questions" && (
          <div className="space-y-4 pop-in">
            <div className="flex justify-between items-center bg-white rounded-2xl p-4 shadow-sm border-2 border-cyan-100">
              <span className="font-body text-gray-500 text-sm">Pertanyaan {qIdx + 1}/{LISTENING_QS.length}</span>
              <span className="font-black text-cyan-600" style={{ fontFamily: "Nunito, sans-serif" }}>⭐ {score} benar</span>
            </div>
            <div className={`bg-white rounded-3xl shadow-xl border-2 border-cyan-200 p-6 text-center`} key={qIdx}>
              <p className="text-base font-black text-gray-800 leading-relaxed" dir={q.arabic ? "rtl" : "ltr"} style={q.arabic ? { fontFamily: "'Noto Naskh Arabic', Arial, serif", fontSize: "1.2rem" } : { fontFamily: "Nunito, sans-serif" }}>
                {q.q}
              </p>
            </div>
            <div className={`grid ${q.type === "tf" ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
              {q.opts.map((opt) => {
                const isCorrect = opt === q.ans; const isSel = chosen === opt;
                return (
                  <button key={opt} onClick={() => handleAnswer(opt)} disabled={!!chosen}
                    dir={q.arabic ? "rtl" : "ltr"}
                    className={`py-4 px-5 rounded-2xl border-2 font-bold transition-all text-left ${!chosen ? "bg-white border-gray-200 text-gray-700 hover:border-cyan-400 active:scale-95" : isCorrect ? "bg-green-100 border-green-400 text-green-700" : isSel ? "bg-red-100 border-red-400 text-red-600" : "bg-gray-50 border-gray-200 text-gray-300 opacity-50"}`}
                    style={q.arabic ? { fontFamily: "'Noto Naskh Arabic', Arial, serif" } : { fontFamily: "Nunito, sans-serif" }}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {chosen && (
              <div ref={scrollAnchorRef} className={`rounded-2xl p-4 text-center font-bold font-body pop-in ${chosen === q.ans ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                {chosen === q.ans ? "Benar!" : `Jawaban benar: ${q.ans}`}
              </div>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-5 bounce-in">
            <div className="text-6xl">{score === LISTENING_QS.length ? "🏆" : score >= 2 ? "🌟" : "💪"}</div>
            <h3 className="text-2xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Istimā' Selesai!</h3>
            <div className="bg-cyan-50 rounded-2xl p-4 border-2 border-cyan-200">
              <div className="text-4xl font-black text-cyan-600" style={{ fontFamily: "Nunito, sans-serif" }}>{score}/{LISTENING_QS.length}</div>
              <div className="text-gray-400 font-body text-sm">jawaban benar</div>
            </div>
            <button onClick={onComplete} className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-sky-500 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
              🎤 Lanjut ke Kalām!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// SPEAKING PAGE — Kalām
// ────────────────────────────────────────────────────────────────
const SPEAKING_LEVELS = [
  {
    level: 1, title: "Dengar & Ulangi", icon: "🔊", color: "from-rose-500 to-pink-600",
    desc: "Dengarkan kalimat, lalu rekam dirimu mengulangnya!",
    prompts: [
      { arabic: "مَاذَا تَفْعَلُ يَوْمَ الِاثْنَيْنِ؟", indonesian: "Apa yang kamu lakukan hari Senin?", hasAudio: true },
      { arabic: "أَذْهَبُ إِلَى الْمَدْرَسَةِ.", indonesian: "Aku pergi ke sekolah.", hasAudio: true },
    ],
  },
  {
    level: 2, title: "Baca & Ucapkan", icon: "📖", color: "from-orange-500 to-amber-500",
    desc: "Baca kalimat Arab ini dengan lantang, lalu rekam!",
    prompts: [
      { arabic: "يَوْمَ الْجُمُعَةِ أَذْهَبُ إِلَى الْمَسْجِدِ.", indonesian: "Hari Jumat aku pergi ke masjid.", hasAudio: false },
      { arabic: "أَسْتَرِيحُ يَوْمَ السَّبْتِ.", indonesian: "Aku beristirahat hari Sabtu.", hasAudio: false },
    ],
  },
  {
    level: 3, title: "Jawab Pertanyaan", icon: "💬", color: "from-violet-500 to-purple-600",
    desc: "Jawab pertanyaan ini secara lisan dengan Bahasa Arabmu sendiri!",
    prompts: [
      { arabic: "مَاذَا تَفْعَلُ يَوْمَ الْأَحَدِ؟", indonesian: "Apa yang kamu lakukan hari Minggu?", hasAudio: true },
    ],
  },
  {
    level: 4, title: "Bermain Peran", icon: "🎭", color: "from-teal-500 to-cyan-600",
    desc: "Website akan bertanya sebagai مُحَمَّدٌ. Jawablah seperti أَحْمَدُ!",
    prompts: [
      { arabic: "مَاذَا تَفْعَلُ يَوْمَ الِاثْنَيْنِ؟", indonesian: "Website: Apa yang kamu lakukan hari Senin?\nJawabmu: \"أَذْهَبُ إِلَى الْمَدْرَسَةِ...\"", hasAudio: true },
    ],
  },
];

function SpeakingPage({ onComplete }: { onComplete: () => void }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [levelDone, setLevelDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const level = SPEAKING_LEVELS[levelIdx];
  const prompt = level.prompts[promptIdx];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [levelIdx]);

  useEffect(() => {
    if (submitted || levelDone) feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [submitted, levelDone]);

  const handleSubmit = () => {
    setSubmitted(true);
    if (promptIdx + 1 >= level.prompts.length) {
      setLevelDone(true);
      setCompletedLevels((prev) => [...prev, levelIdx]);
    }
  };

  const nextPrompt = () => { setSubmitted(false); setPromptIdx((i) => i + 1); };

  const nextLevel = () => {
    if (levelIdx + 1 >= SPEAKING_LEVELS.length) { setAllDone(true); return; }
    setLevelIdx((i) => i + 1);
    setPromptIdx(0);
    setSubmitted(false);
    setLevelDone(false);
  };

  if (allDone) return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-6 pt-28">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-5 bounce-in">
          <div className="text-6xl">🌟</div>
          <h3 className="text-2xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Kalām Selesai!</h3>
          <p className="text-gray-500 font-body">Kamu sudah menyelesaikan semua level latihan berbicara!</p>
          <div className="grid grid-cols-4 gap-2">
            {SPEAKING_LEVELS.map((lv, i) => (
              <div key={i} className={`rounded-2xl p-3 text-center ${completedLevels.includes(i) ? "bg-green-100 border-2 border-green-300" : "bg-gray-100 border-2 border-gray-200"}`}>
                <div className="text-lg">{lv.icon}</div>
                <div className="text-xs font-bold text-gray-600 mt-1" style={{ fontFamily: "Nunito, sans-serif" }}>L{i + 1}</div>
                {completedLevels.includes(i) && <div className="text-xs text-green-600">✓</div>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-600 font-body">
            <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</span>
            Maharah Kalām — Selesai!
          </div>
          <button onClick={onComplete} className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
            ✍️ Lanjut ke Kitābah!
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-6 pt-28">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-5">
        <div className={`bg-gradient-to-r ${level.color} rounded-3xl p-5 text-white`}>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{level.icon}</span>
            <div>
              <div className="text-xs opacity-70 font-body">Level {level.level} dari {SPEAKING_LEVELS.length}</div>
              <h2 className="text-xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>{level.title}</h2>
            </div>
          </div>
          <p className="text-white/80 font-body text-sm">{level.desc}</p>
        </div>

        {/* Level selector tabs — sequential locking */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SPEAKING_LEVELS.map((lv, i) => {
            const isUnlocked = i === 0 || completedLevels.includes(i - 1);
            const isDone = completedLevels.includes(i);
            return (
              <button key={i}
                onClick={() => { if (!isUnlocked) return; setLevelIdx(i); setPromptIdx(0); setSubmitted(false); setLevelDone(false); }}
                disabled={!isUnlocked}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${i === levelIdx ? "bg-rose-500 text-white shadow-md" : isDone ? "bg-green-100 text-green-700 border-2 border-green-300" : isUnlocked ? "bg-white text-gray-500 border-2 border-gray-200 hover:border-rose-300" : "bg-gray-100 text-gray-300 border-2 border-gray-200 cursor-not-allowed"}`}
                style={{ fontFamily: "Nunito, sans-serif" }}>
                {isDone ? "✓ " : !isUnlocked ? "🔒 " : ""}{lv.icon} L{i + 1}
              </button>
            );
          })}
        </div>

        {/* Prompt card */}
        <div className="bg-white rounded-3xl shadow-lg border-2 border-rose-200 p-6 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold text-rose-400 font-body uppercase tracking-wide">
              {promptIdx + 1}/{level.prompts.length} — {level.level === 4 ? "مُحَمَّدٌ يَقُولُ:" : level.level === 3 ? "Pertanyaan:" : "Ucapkan:"}
            </p>
            <ArabicText className="block text-2xl font-black text-gray-800">{prompt.arabic}</ArabicText>
            <p className="text-gray-500 font-body text-sm italic whitespace-pre-line">{prompt.indonesian}</p>
          </div>
          {prompt.hasAudio && (
            <AudioPlayer label="🔊 Dengarkan contoh pengucapan" duration={4} compact />
          )}
        </div>

        {/* Recorder */}
        {!levelDone ? (
          <>
            {!submitted ? (
              <MicRecorder onSubmit={handleSubmit} submitLabel="✓ Kirim Rekaman" />
            ) : (
              <div ref={feedbackRef} className="bg-green-50 rounded-2xl border-2 border-green-300 p-5 text-center space-y-3 pop-in">
                <div className="text-4xl">✅</div>
                <p className="font-bold text-green-700 font-body">Bagus! Rekaman diterima! Terus berlatih!</p>
                {promptIdx + 1 < level.prompts.length && (
                  <button onClick={nextPrompt} className="w-full py-3 rounded-xl bg-green-500 text-white font-black hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
                    Kalimat Berikutnya →
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div ref={feedbackRef} className="bg-white rounded-3xl shadow-xl p-6 text-center space-y-4 bounce-in">
            <div className="text-5xl">🎉</div>
            <p className="text-xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Level {level.level} Selesai!</p>
            <button onClick={nextLevel} className={`w-full py-4 rounded-2xl bg-gradient-to-r ${level.color} text-white font-black text-lg hover:scale-105 active:scale-95 transition-all`} style={{ fontFamily: "Nunito, sans-serif" }}>
              {levelIdx + 1 >= SPEAKING_LEVELS.length ? "Semua Level Selesai!" : `Level ${levelIdx + 2} →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// WRITING PAGE — Kitābah (3 levels)
// ────────────────────────────────────────────────────────────────
const WRITING_LEVELS = [
  { level: 1, title: "Menelusuri", icon: "👆", desc: "Telusuri kata Arab berikut!", color: "from-indigo-500 to-purple-600", words: [DAYS[0], DAYS[1]] },
  { level: 2, title: "Menyalin", icon: "✏️", desc: "Lihat dan salin kata Arab!", color: "from-sky-500 to-indigo-500", words: [DAYS[2], DAYS[5]] },
  { level: 3, title: "Mengingat", icon: "🧠", desc: "Tulis bahasa Arab dari artinya!", color: "from-violet-500 to-purple-700", words: [DAYS[3], DAYS[6]] },
];

function drawWritingGuide(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.setLineDash([6, 10]);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  [0.3, 0.5, 0.7].forEach((r) => {
    ctx.beginPath(); ctx.moveTo(16, h * r); ctx.lineTo(w - 16, h * r); ctx.stroke();
  });
  ctx.restore();
}

function WritingPage({ onComplete, onWritingDone }: { onComplete: () => void; onWritingDone: () => void }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [color, setColor] = useState("#1e293b");
  const [strokeW, setStrokeW] = useState(5);
  const [drawing, setDrawing] = useState(false);
  const [lastPt, setLastPt] = useState<{ x: number; y: number } | null>(null);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const writingFeedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [levelIdx, wordIdx]);

  useEffect(() => {
    if (submitted) writingFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [submitted]);

  const currentLevel = WRITING_LEVELS[levelIdx];
  const word = currentLevel.words[wordIdx];

  useEffect(() => {
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      drawWritingGuide(ctx, rect.width, rect.height);
    });
  }, [levelIdx, wordIdx]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sx = (canvas.width / dpr) / rect.width;
    const sy = (canvas.height / dpr) / rect.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    setHistory((h) => [...h.slice(-19), ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)]);
    setDrawing(true); setLastPt(getPos(e));
  };
  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing || !lastPt) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastPt.x, lastPt.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color; ctx.lineWidth = strokeW; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    setLastPt(pos);
  };
  const endDraw = () => { setDrawing(false); setLastPt(null); };

  const undo = () => {
    if (!history.length) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(history[history.length - 1], 0, 0);
    setHistory((h) => h.slice(0, -1));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    drawWritingGuide(ctx, canvas.width / dpr, canvas.height / dpr);
    setHistory([]);
  };

  const nextWord = () => {
    setSubmitted(false); setHistory([]);
    if (wordIdx + 1 < currentLevel.words.length) {
      setWordIdx((i) => i + 1);
    } else {
      setCompletedLevels((prev) => [...prev, levelIdx]);
      if (levelIdx + 1 >= WRITING_LEVELS.length) {
        onWritingDone();
        onComplete();
      } else {
        setLevelIdx((i) => i + 1); setWordIdx(0);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 p-6 pt-28">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-4">
        <div className={`bg-gradient-to-r ${currentLevel.color} rounded-3xl p-5 text-white`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentLevel.icon}</span>
              <div>
                <div className="text-xs opacity-70 font-body">Level {currentLevel.level} dari {WRITING_LEVELS.length}</div>
                <h2 className="text-lg font-black" style={{ fontFamily: "Nunito, sans-serif" }}>{currentLevel.title}</h2>
              </div>
            </div>
            <span className="text-sm font-bold opacity-80">Kata {wordIdx + 1}/{currentLevel.words.length}</span>
          </div>
          <p className="text-white/80 font-body text-xs">{currentLevel.desc}</p>
        </div>

        {/* Level tabs */}
        <div className="flex gap-2">
          {WRITING_LEVELS.map((lv, i) => (
            <button key={i}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${i === levelIdx ? "bg-indigo-500 text-white shadow-md" : completedLevels.includes(i) ? "bg-green-100 text-green-700 border-2 border-green-300" : i > levelIdx + 1 ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-white text-gray-500 border-2 border-gray-200"}`}
              style={{ fontFamily: "Nunito, sans-serif" }}
              disabled={i > levelIdx && !completedLevels.includes(i)}
              onClick={() => { if (completedLevels.includes(i) || i <= levelIdx) { setLevelIdx(i); setWordIdx(0); setSubmitted(false); setHistory([]); } }}>
              {completedLevels.includes(i) ? "✓ " : ""}{lv.icon} L{i + 1}
            </button>
          ))}
        </div>

        {/* Prompt */}
        <div className={`${currentLevel.level === 3 ? "bg-gradient-to-r from-violet-100 to-purple-100 border-violet-300" : "bg-gradient-to-r from-indigo-100 to-blue-100 border-indigo-300"} rounded-3xl border-2 p-5 text-center`}>
          {currentLevel.level === 3 ? (
            <>
              <p className="text-xs text-violet-500 font-bold font-body mb-1">Tulis bahasa Arab dari:</p>
              <div className="text-4xl font-black text-violet-700" style={{ fontFamily: "Nunito, sans-serif" }}>{word.indonesian}</div>
              <p className="text-xs text-violet-400 font-body mt-1">{word.emoji} — /{word.transliteration}/</p>
            </>
          ) : (
            <>
              <p className="text-xs text-indigo-500 font-bold font-body mb-2">{currentLevel.level === 1 ? "Telusuri kata ini:" : "Salin kata ini:"}</p>
              <ArabicText className="block text-5xl font-black text-gray-800">{word.arabic}</ArabicText>
              <p className="text-indigo-400 font-body text-xs mt-1">/{word.transliteration}/ — {word.indonesian} {word.emoji}</p>
            </>
          )}
        </div>

        {/* Tools */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-100 p-3 flex flex-wrap items-center gap-3">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 font-body">Warna:</span>
            {["#1e293b", "#3b82f6", "#ef4444", "#10b981"].map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "scale-125 border-gray-700" : "border-gray-300"}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-1.5 ml-auto">
            <button onClick={undo} className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs hover:bg-gray-200 active:scale-95 transition-all">↩</button>
            <button onClick={clearCanvas} className="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 font-bold text-xs hover:bg-red-200 active:scale-95 transition-all">🗑</button>
          </div>
        </div>

        {/* Canvas with guide overlay for Level 1 */}
        <div className="relative bg-white rounded-3xl shadow-xl border-2 border-indigo-200 overflow-hidden">
          {currentLevel.level === 1 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden>
              <ArabicText className="text-gray-100 select-none" style={{ fontSize: "clamp(56px, 16vw, 90px)", fontWeight: 900 }}>
                {word.arabic}
              </ArabicText>
            </div>
          )}
          {currentLevel.level === 3 && (
            <div className="absolute top-2 right-3 text-xs text-gray-200 font-bold z-0 pointer-events-none" style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif", fontSize: "11px" }}>
              {word.arabic}
            </div>
          )}
          <canvas ref={canvasRef} className="relative z-10 w-full touch-none block" style={{ height: 260, cursor: "crosshair" }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 border-2 border-indigo-100">
          <span className="text-xs text-gray-400 font-body">Ketebalan:</span>
          {[2, 5, 9, 14].map((w) => (
            <button key={w} onClick={() => setStrokeW(w)}
              className={`rounded-full bg-gray-800 transition-all ${strokeW === w ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
              style={{ width: w + 8, height: w + 8 }} />
          ))}
        </div>

        {!submitted ? (
          <button onClick={() => setSubmitted(true)}
            className={`w-full py-4 rounded-2xl bg-gradient-to-r ${currentLevel.color} text-white font-black text-lg hover:scale-105 active:scale-95 transition-all`}
            style={{ fontFamily: "Nunito, sans-serif" }}>
            📤 Kirim Tulisan
          </button>
        ) : (
          <div ref={writingFeedbackRef} className="bg-green-50 rounded-2xl border-2 border-green-300 p-4 text-center space-y-3 pop-in">
            <div className="text-3xl">✅</div>
            <p className="font-bold text-green-700 font-body text-sm">Tulisanmu berhasil disimpan! Bagus sekali!</p>
            {currentLevel.level === 3 && (
              <div className="bg-white rounded-xl p-2 border border-green-200">
                <p className="text-xs text-gray-400 font-body">Jawaban: <ArabicText className="text-lg font-black text-gray-700">{word.arabic}</ArabicText></p>
              </div>
            )}
            <button onClick={nextWord}
              className={`w-full py-3 rounded-xl bg-gradient-to-r ${currentLevel.color} text-white font-black hover:scale-105 active:scale-95 transition-all`}
              style={{ fontFamily: "Nunito, sans-serif" }}>
              {wordIdx + 1 < currentLevel.words.length ? "Kata Berikutnya →" : levelIdx + 1 >= WRITING_LEVELS.length ? "Selesai!" : `Level ${levelIdx + 2} →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// JOYFUL LEARNING — Game Menu + 3 Games
// ────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────
// ILLUSTRATION COMPONENTS
// ────────────────────────────────────────────────────────────────
function DialogueIllustration() {
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-sky-100 shadow-sm bg-sky-50 flex items-center justify-center" style={{ minHeight: 160 }}>
      <img
        src={dialogIllustrationUrl}
        alt="Dialog illustration"
        loading="lazy"
        decoding="async"
        className="w-full h-auto block"
        style={{ maxHeight: 260, objectFit: "contain", display: "block" }}
      />
    </div>
  );
}

function StoryIllustration() {
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-teal-100 shadow-sm bg-teal-50 flex items-center justify-center" style={{ minHeight: 160 }}>
      <img
        src={storyIllustrationUrl}
        alt="Story illustration"
        loading="lazy"
        decoding="async"
        className="w-full h-auto block"
        style={{ maxHeight: 240, objectFit: "contain", display: "block" }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// GAMBAR KEGIATAN GAME — data
// ────────────────────────────────────────────────────────────────
const DRAW_PROMPTS = [
  { day: DAYS[0], activity: "Berlibur bersama keluarga", prompt: "Gambarkan kegiatan berlibur bersama keluarga!", sentence: "أَسْتَرِيحُ مَعَ أُسْرَتِي يَوْمَ الْأَحَدِ.", sentenceId: "Aku beristirahat bersama keluargaku di hari Minggu." },
  { day: DAYS[1], activity: "Upacara di sekolah", prompt: "Gambarkan siswa yang sedang mengikuti upacara di sekolah!", sentence: "أَذْهَبُ إِلَى الْمَدْرَسَةِ يَوْمَ الإِثْنَيْنِ.", sentenceId: "Aku pergi ke sekolah hari Senin." },
  { day: DAYS[2], activity: "Belajar di kelas", prompt: "Gambarkan kegiatan belajar di kelas!", sentence: "أَدْرُسُ فِي الْفَصْلِ يَوْمَ الثُّلَاثَاءِ.", sentenceId: "Aku belajar di kelas hari Selasa." },
  { day: DAYS[3], activity: "Bermain bersama teman", prompt: "Gambarkan kegiatan bermain bersama teman-teman!", sentence: "أَلْعَبُ مَعَ أَصْدِقَائِي يَوْمَ الْأَرْبِعَاءِ.", sentenceId: "Aku bermain bersama teman-temanku hari Rabu." },
  { day: DAYS[4], activity: "Belajar bahasa Arab", prompt: "Gambarkan kegiatan belajar bahasa Arab!", sentence: "أَتَعَلَّمُ اللُّغَةَ الْعَرَبِيَّةَ يَوْمَ الْخَمِيسِ.", sentenceId: "Aku belajar bahasa Arab hari Kamis." },
  { day: DAYS[5], activity: "Beribadah bersama keluarga", prompt: "Gambarkan kegiatan beribadah atau berkumpul bersama keluarga!", sentence: "أُصَلِّي مَعَ أُسْرَتِي يَوْمَ الْجُمُعَةِ.", sentenceId: "Aku shalat bersama keluargaku hari Jumat." },
  { day: DAYS[6], activity: "Bermain atau melakukan hobi", prompt: "Gambarkan kegiatan bermain atau hobi kesukaanmu!", sentence: "أَسْتَرِيحُ وَأَلْعَبُ فِي يَوْمِ السَّبْتِ.", sentenceId: "Aku beristirahat dan bermain di hari Sabtu." },
];

const ACTIVITY_OPTIONS = [
  { label: "bermain", arabic: "أَلْعَبُ", emoji: "🎮" },
  { label: "belajar", arabic: "أَدْرُسُ", emoji: "📚" },
  { label: "membaca", arabic: "أَقْرَأُ", emoji: "📖" },
  { label: "bermain bersama teman", arabic: "أَلْعَبُ مَعَ الْأَصْدِقَاءِ", emoji: "👫" },
  { label: "berkumpul dengan keluarga", arabic: "أَجْتَمِعُ مَعَ الْأُسْرَةِ", emoji: "👨‍👩‍👧" },
  { label: "berolahraga", arabic: "أُمَارِسُ الرِّيَاضَةَ", emoji: "⚽" },
  { label: "pergi berlibur", arabic: "أَذْهَبُ فِي إِجَازَةٍ", emoji: "🏖️" },
  { label: "melakukan hobi", arabic: "أُمَارِسُ هِوَايَتِي", emoji: "🎨" },
];

type JoyfulGame = "menu" | "cocokkan" | "guess" | "arrange" | "draw";

function CocokkanGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const ALL_VOCAB = [...DAYS, ...EXTRA_VOCAB];
  const initialLeft = [...ALL_VOCAB].sort(() => Math.random() - 0.5).slice(0, 6);
  const [leftItems] = useState(initialLeft);
  const [rightItems] = useState(() => [...initialLeft].sort(() => Math.random() - 0.5));
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [selRight, setSelRight] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);

  const matchedLeft = Object.keys(matches).map(Number);
  const matchedRight = Object.values(matches);

  const checkMatch = (li: number, ri: number) => {
    if (leftItems[li].arabic === rightItems[ri].arabic) setMatches((p) => ({ ...p, [li]: ri }));
    else { setWrongPair([li, ri]); setTimeout(() => setWrongPair(null), 700); }
    setSelLeft(null); setSelRight(null);
  };

  const handleLeft = (i: number) => { if (matchedLeft.includes(i)) return; if (selLeft === i) { setSelLeft(null); return; } if (selRight !== null) { checkMatch(i, selRight); return; } setSelLeft(i); };
  const handleRight = (i: number) => { if (matchedRight.includes(i)) return; if (selRight === i) { setSelRight(null); return; } if (selLeft !== null) { checkMatch(selLeft, i); return; } setSelRight(i); };
  const allDone = Object.keys(matches).length === leftItems.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6 pt-20 pb-10">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white border-2 border-orange-200 flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-all">←</button>
          <div className="flex-1 text-center">
            <h2 className="text-xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>🔗 Cocokkan Kata!</h2>
            <p className="text-gray-500 font-body text-xs">Klik Arab → klik artinya dalam Indonesia</p>
          </div>
        </div>
        <div className="text-center text-orange-600 font-bold" style={{ fontFamily: "Nunito, sans-serif" }}>{Object.keys(matches).length}/{leftItems.length} pasangan ✓</div>
        {!allDone ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Arab</div>
                {leftItems.map((item, i) => {
                  const isMatched = matchedLeft.includes(i); const isSel = selLeft === i; const isWrong = wrongPair?.[0] === i;
                  return (
                    <button key={i} onClick={() => handleLeft(i)} disabled={isMatched}
                      className={`w-full py-5 rounded-2xl border-2 font-black text-xl transition-all ${isMatched ? "bg-green-100 border-green-400 text-green-600" : isWrong ? "bg-red-100 border-red-400 text-red-600 shake" : isSel ? "bg-orange-100 border-orange-400 text-orange-700 scale-105 shadow-md" : "bg-white border-gray-200 text-gray-700 hover:border-orange-300 active:scale-95"}`}>
                      {isMatched ? "✓" : <ArabicText>{item.arabic}</ArabicText>}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-3">
                <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Indonesia</div>
                {rightItems.map((item, i) => {
                  const isMatched = matchedRight.includes(i); const isSel = selRight === i; const isWrong = wrongPair?.[1] === i;
                  return (
                    <button key={i} onClick={() => handleRight(i)} disabled={isMatched}
                      className={`w-full py-5 rounded-2xl border-2 font-bold font-body transition-all ${isMatched ? "bg-green-100 border-green-400 text-green-600" : isWrong ? "bg-red-100 border-red-400 text-red-600 shake" : isSel ? "bg-orange-100 border-orange-400 text-orange-700 scale-105 shadow-md" : "bg-white border-gray-200 text-gray-700 hover:border-orange-300 active:scale-95"}`}>
                      {isMatched ? "✓" : item.indonesian}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-center text-gray-400 font-body text-xs">Pilih kata Arab, lalu pilih artinya!</p>
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-4 bounce-in">
            <div className="text-6xl">🎊</div>
            <h3 className="text-2xl font-black text-green-600" style={{ fontFamily: "Nunito, sans-serif" }}>Sempurna!</h3>
            <p className="text-gray-500 font-body">Kamu berhasil mencocokkan semua pasangan!</p>
            <button onClick={() => onComplete(leftItems.length)} className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
              Selesai!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function JoyfulPage({ onComplete, onSaveScore }: { onComplete: () => void; onSaveScore: (s: number) => void }) {
  const [game, setGame] = useState<JoyfulGame>("menu");
  const [cocokkanScore, setCocokkanScore] = useState<number | null>(null);
  const [guessScore, setGuessScore] = useState<number | null>(null);
  const [arrangeScore, setArrangeScore] = useState<number | null>(null);
  const [drawDone, setDrawDone] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [game]);

  const played = [cocokkanScore !== null, guessScore !== null, arrangeScore !== null, drawDone].filter(Boolean).length;

  const GAME_MAX = 6 + 7 + 6 + 1; // cocokkan + tebak + susun + draw

  const handleFinish = () => {
    const rawScore = (cocokkanScore ?? 0) + (guessScore ?? 0) + (arrangeScore ?? 0) + (drawDone ? 1 : 0);
    onSaveScore(rawScore);
    onComplete();
  };

  if (game === "cocokkan") return <CocokkanGame onBack={() => setGame("menu")} onComplete={(s) => { setCocokkanScore(s); setGame("menu"); }} />;
  if (game === "guess") return <TebakHariGame onBack={() => setGame("menu")} onComplete={(s) => { setGuessScore(s); setGame("menu"); }} />;
  if (game === "arrange") return <SusunKataGame onBack={() => setGame("menu")} onComplete={(s) => { setArrangeScore(s); setGame("menu"); }} />;
  if (game === "draw") return <GambarKegiatanGame onBack={() => setGame("menu")} onComplete={() => { setDrawDone(true); setGame("menu"); }} />;

  const games = [
    { id: "cocokkan" as JoyfulGame, icon: "🔗", title: "Cocokkan Kata!", desc: "Cocokkan Arab dengan artinya", color: "border-orange-300 bg-orange-50", done: cocokkanScore !== null, score: cocokkanScore !== null ? `${cocokkanScore}/6` : null },
    { id: "guess" as JoyfulGame, icon: "🎯", title: "Tebak Kata!", desc: "Lihat Arab, tebak artinya", color: "border-pink-300 bg-pink-50", done: guessScore !== null, score: guessScore !== null ? `${guessScore}/7` : null },
    { id: "arrange" as JoyfulGame, icon: "📝", title: "Susun Kata!", desc: "Susun kata Arab yang benar", color: "border-amber-300 bg-amber-50", done: arrangeScore !== null, score: arrangeScore !== null ? `${arrangeScore}/6` : null },
    { id: "draw" as JoyfulGame, icon: "🎨", title: "Gambar Kegiatan!", desc: "Ekspresikan kegiatanmu melalui gambar", color: "border-violet-300 bg-violet-50", done: drawDone, score: drawDone ? "Selesai" : null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-6 pt-20 pb-10">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-5">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-3xl p-5 text-white text-center">
          <div className="text-3xl mb-1">🎮</div>
          <h2 className="text-2xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>Mini Game</h2>
          <p className="text-pink-100 font-body text-sm">Belajar sambil bermain!</p>
        </div>

        <div className="flex justify-center gap-3 text-sm font-body items-center">
          <span className="text-gray-400">{played}/4 game dimainkan</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => <div key={i} className={`w-3 h-3 rounded-full ${i < played ? "bg-green-400" : "bg-gray-200"}`} />)}
          </div>
        </div>

        <div className="space-y-3">
          {games.map((g) => (
            <button key={g.id} onClick={() => setGame(g.id)}
              className={`w-full rounded-2xl border-2 p-4 text-left flex items-center gap-4 hover:scale-105 active:scale-95 transition-all ${g.color} ${g.done ? "opacity-80" : ""}`}>
              <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center text-3xl shrink-0 shadow-sm">{g.icon}</div>
              <div className="flex-1">
                <div className="font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>{g.title}</div>
                <div className="text-xs text-gray-500 font-body">{g.desc}</div>
              </div>
              {g.done ? (
                <div className="text-right">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">✓</div>
                  {g.score && <div className="text-xs text-green-600 font-bold mt-0.5">{g.score}</div>}
                </div>
              ) : (
                <div className="text-gray-400 text-xl">→</div>
              )}
            </button>
          ))}
        </div>

        {played < 4 ? (
          <div className="bg-gray-100 rounded-2xl p-4 text-center border-2 border-gray-200">
            <div className="text-2xl mb-1">🔒</div>
            <p className="font-bold text-gray-500 font-body text-sm">Selesaikan semua permainan terlebih dahulu</p>
            <p className="text-xs text-gray-400 font-body mt-1">{played}/4 game selesai</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-100 rounded-2xl p-3 text-center border-2 border-green-300">
              <p className="font-black text-green-700 font-body">🎉 Semua permainan selesai!</p>
            </div>
            <button onClick={handleFinish}
              className="w-full py-4 rounded-2xl font-black text-lg bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:scale-105 active:scale-95 shadow-lg transition-all"
              style={{ fontFamily: "Nunito, sans-serif" }}>
              📝 Lanjut ke Evaluasi →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TebakHariGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const ALL_VOCAB = [...DAYS, ...EXTRA_VOCAB];
  const TOTAL = 7;
  const [questions] = useState(() => {
    const shuffled = [...ALL_VOCAB].sort(() => Math.random() - 0.5).slice(0, TOTAL);
    return shuffled.map((correct) => {
      const wrongs = ALL_VOCAB.filter((d) => d.arabic !== correct.arabic).sort(() => Math.random() - 0.5).slice(0, 3);
      return { correct, options: [...wrongs, correct].sort(() => Math.random() - 0.5) };
    });
  });
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const tebakFeedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [qIdx]);

  useEffect(() => {
    if (chosen) tebakFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [chosen]);

  const q = questions[qIdx];
  const handleAnswer = (opt: (typeof DAYS)[0]) => {
    if (chosen) return;
    const correct = opt.arabic === q.correct.arabic;
    const ns = correct ? score + 1 : score;
    setChosen(opt.arabic);
    playSound(correct ? "correct" : "wrong");
    if (correct) setScore(ns);
    setTimeout(() => {
      if (qIdx + 1 >= TOTAL) { setFinalScore(ns); setDone(true); }
      else { setQIdx((i) => i + 1); setChosen(null); }
    }, 1100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-6 pt-28">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white border-2 border-pink-200 flex items-center justify-center text-pink-600 font-bold hover:bg-pink-50 active:scale-90 transition-all">←</button>
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl px-4 py-2 flex-1 text-white text-center">
            <span className="font-black" style={{ fontFamily: "Nunito, sans-serif" }}>🎯 Tebak Hari! — {qIdx + 1}/{TOTAL}</span>
          </div>
          <div className="bg-white rounded-2xl px-3 py-2 border-2 border-pink-200 font-black text-pink-600" style={{ fontFamily: "Nunito, sans-serif" }}>⭐{score}</div>
        </div>
        {!done ? (
          <>
            <div className="bg-white rounded-3xl shadow-xl border-2 border-pink-200 p-8 text-center" key={qIdx}>
              <ArabicText className="block text-5xl sm:text-6xl font-black text-gray-800">{q.correct.arabic}</ArabicText>
              <p className="text-gray-400 font-body text-sm mt-2">Apa arti kata ini?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {q.options.map((opt, i) => {
                const isC = opt.arabic === q.correct.arabic; const isSel = chosen === opt.arabic;
                return (
                  <button key={i} onClick={() => handleAnswer(opt)} disabled={!!chosen}
                    className={`py-6 rounded-2xl border-2 font-black text-lg transition-all ${!chosen ? "bg-white border-gray-200 text-gray-700 hover:border-pink-400 hover:scale-105 active:scale-95" : isC ? "bg-green-100 border-green-400 text-green-700 scale-105" : isSel ? "bg-red-100 border-red-400 text-red-600" : "bg-gray-50 border-gray-200 text-gray-300 opacity-50"}`}
                    style={{ fontFamily: "Nunito, sans-serif" }}>
                    {opt.indonesian}
                  </button>
                );
              })}
            </div>
            {chosen && <div ref={tebakFeedbackRef} className={`rounded-2xl p-4 text-center font-bold font-body pop-in ${chosen === q.correct.arabic ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{chosen === q.correct.arabic ? "Benar! +1" : `Jawaban: ${q.correct.indonesian}`}</div>}
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-5 bounce-in">
            <div className="text-6xl">{finalScore >= TOTAL ? "🏆" : finalScore >= TOTAL * 0.6 ? "🌟" : "💪"}</div>
            <h3 className="text-2xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Skor: {finalScore}/{TOTAL}</h3>
            <button onClick={() => onComplete(finalScore)} className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>Kembali ke Menu</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SusunKataGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [arrangement, setArrangement] = useState<string[]>([]);
  const [pool, setPool] = useState(() => [...ARRANGE_DATA[0].words].sort(() => Math.random() - 0.5));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [done, setDone] = useState(false);
  const susunFeedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [qIdx]);

  useEffect(() => {
    if (checked) susunFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [checked]);

  const q = ARRANGE_DATA[qIdx];

  const clickPool = (w: string, i: number) => {
    if (checked) return;
    setArrangement((a) => [...a, w]);
    setPool((p) => p.filter((_, j) => j !== i));
  };
  const clickArranged = (w: string, i: number) => {
    if (checked) return;
    setPool((p) => [...p, w]);
    setArrangement((a) => a.filter((_, j) => j !== i));
  };
  const check = () => {
    const isCorrect = arrangement.join(" ") === q.correct.join(" ");
    setCorrect(isCorrect);
    setChecked(true);
    playSound(isCorrect ? "correct" : "wrong");
    if (isCorrect) setScore((s) => s + 1);
  };
  const next = () => {
    if (qIdx + 1 >= ARRANGE_DATA.length) { setDone(true); return; }
    const nextQ = ARRANGE_DATA[qIdx + 1];
    setQIdx((i) => i + 1);
    setArrangement([]);
    setPool([...nextQ.words].sort(() => Math.random() - 0.5));
    setChecked(false); setCorrect(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 p-6 pt-28">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center text-amber-600 font-bold hover:bg-amber-50 active:scale-90 transition-all">←</button>
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl px-4 py-2 flex-1 text-white text-center">
            <span className="font-black" style={{ fontFamily: "Nunito, sans-serif" }}>📝 Susun Kata! — {qIdx + 1}/{ARRANGE_DATA.length}</span>
          </div>
          <div className="bg-white rounded-2xl px-3 py-2 border-2 border-amber-200 font-black text-amber-600" style={{ fontFamily: "Nunito, sans-serif" }}>⭐{score}</div>
        </div>
        {!done ? (
          <>
            <div className="bg-white rounded-3xl shadow-lg border-2 border-amber-200 p-5 text-center" key={qIdx}>
              <p className="text-xs text-gray-400 font-body mb-2">Susun kata Arab ini dengan urutan yang benar!</p>
              <p className="text-sm text-amber-600 font-bold font-body">Makna: "{q.meaning}"</p>
            </div>
            {/* Answer area */}
            <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 p-4 min-h-16 flex items-center justify-end flex-wrap gap-2" dir="rtl">
              {arrangement.length === 0 && <p className="text-gray-300 font-body text-sm w-full text-center" dir="ltr">Klik kata untuk disusun di sini...</p>}
              {arrangement.map((w, i) => (
                <button key={i} onClick={() => clickArranged(w, i)} disabled={checked}
                  className={`px-4 py-2 rounded-xl font-black text-lg border-2 transition-all ${checked ? (correct ? "bg-green-100 border-green-400 text-green-700" : "bg-red-100 border-red-400 text-red-600") : "bg-white border-amber-400 text-gray-700 hover:bg-amber-100 active:scale-95"}`}
                  style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }}>
                  {w}
                </button>
              ))}
            </div>
            {/* Word pool */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 flex flex-wrap gap-2 justify-center" dir="rtl">
              {pool.map((w, i) => (
                <button key={i} onClick={() => clickPool(w, i)} disabled={checked}
                  className="px-4 py-2 rounded-xl bg-gray-100 border-2 border-gray-300 text-gray-700 font-black text-lg hover:bg-amber-100 hover:border-amber-400 active:scale-95 transition-all"
                  style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }}>
                  {w}
                </button>
              ))}
              {pool.length === 0 && !checked && <p className="text-gray-300 text-sm font-body" dir="ltr">Semua kata sudah dipilih!</p>}
            </div>
            {!checked ? (
              <button onClick={check} disabled={arrangement.length !== q.words.length}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black text-lg disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
                style={{ fontFamily: "Nunito, sans-serif" }}>
                Periksa Jawaban
              </button>
            ) : (
              <>
                <div ref={susunFeedbackRef} className={`rounded-2xl p-4 text-center font-bold font-body pop-in ${correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {correct ? "Benar! Urutan kata tepat!" : `Urutan yang benar: ${q.correct.join(" — ")}`}
                </div>
                <button onClick={next} className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
                  {qIdx + 1 >= ARRANGE_DATA.length ? "Selesai!" : "Kalimat Berikutnya →"}
                </button>
              </>
            )}
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-5 bounce-in">
            <div className="text-6xl">{score === ARRANGE_DATA.length ? "🏆" : "🌟"}</div>
            <h3 className="text-2xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Skor: {score}/{ARRANGE_DATA.length}</h3>
            <button onClick={() => onComplete(score)} className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>Kembali ke Menu</button>
          </div>
        )}
      </div>
    </div>
  );
}

function GambarKegiatanGame({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  type GambarMode = "select" | "modeA" | "modeB-day" | "modeB-activity" | "draw";
  const [gambarMode, setGambarMode] = useState<GambarMode>("select");
  const [prompt] = useState(() => DRAW_PROMPTS[Math.floor(Math.random() * DRAW_PROMPTS.length)]);
  const [favDay, setFavDay] = useState<(typeof DAYS)[0] | null>(null);
  const [favActivity, setFavActivity] = useState<(typeof ACTIVITY_OPTIONS)[0] | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [brushSize, setBrushSize] = useState(5);
  const [color, setColor] = useState("#1e293b");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSentence, setShowSentence] = useState(false);
  const [customSentence, setCustomSentence] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const histRef = useRef<ImageData[]>([]);
  const futRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const COLORS = ["#1e293b", "#EF4444", "#3B82F6", "#22C55E", "#F97316", "#8B5CF6", "#EC4899", "#EAB308"];

  useEffect(() => {
    if (submitted) document.getElementById("gambar-result")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [submitted]);

  useEffect(() => {
    if (gambarMode !== "draw") return;
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#FFFBF0";
      ctx.fillRect(0, 0, rect.width, rect.height);
      histRef.current = [];
      futRef.current = [];
    });
  }, [gambarMode]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = (e as React.TouchEvent).touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    histRef.current = [...histRef.current.slice(-19), ctx.getImageData(0, 0, rect.width * dpr, rect.height * dpr)];
    futRef.current = [];
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    drawingRef.current = true;
    const pt = getPos(e);
    lastRef.current = pt;
    saveHistory();
    const ctx = canvasRef.current!.getContext("2d")!;
    const r = tool === "eraser" ? brushSize * 3 : brushSize;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === "eraser" ? "#FFFBF0" : color;
    ctx.fill();
    setHasDrawn(true);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawingRef.current || !lastRef.current) return;
    e.preventDefault();
    const pt = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = tool === "eraser" ? "#FFFBF0" : color;
    ctx.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastRef.current = pt;
  };

  const endDraw = () => { drawingRef.current = false; lastRef.current = null; };

  const undo = () => {
    if (!histRef.current.length) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    futRef.current = [...futRef.current, ctx.getImageData(0, 0, rect.width * dpr, rect.height * dpr)];
    ctx.putImageData(histRef.current[histRef.current.length - 1], 0, 0);
    histRef.current = histRef.current.slice(0, -1);
  };

  const redo = () => {
    if (!futRef.current.length) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    histRef.current = [...histRef.current, ctx.getImageData(0, 0, rect.width * dpr, rect.height * dpr)];
    ctx.putImageData(futRef.current[futRef.current.length - 1], 0, 0);
    futRef.current = futRef.current.slice(0, -1);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    saveHistory();
    ctx.fillStyle = "#FFFBF0";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const currentDay = favDay ?? prompt.day;
  const modelSentence = favDay && favActivity
    ? `${favActivity.arabic} في يوم ${favDay.arabic}.`
    : prompt.sentence;
  const modelSentenceId = favDay && favActivity
    ? `Aku ${favActivity.label} di hari ${favDay.indonesian}.`
    : prompt.sentenceId;
  const currentPrompt = favDay
    ? `Gambarkan kegiatanmu di hari ${favDay.indonesian}!`
    : prompt.prompt;

  // MODE SELECT
  if (gambarMode === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 pt-28">
        <GeomShapes />
        <div className="relative z-10 max-w-lg mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 rounded-full bg-white border-2 border-violet-200 flex items-center justify-center text-violet-600 font-bold hover:bg-violet-50 active:scale-90 transition-all">←</button>
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-2xl px-4 py-2 flex-1 text-white text-center">
              <span className="font-black" style={{ fontFamily: "Nunito, sans-serif" }}>🎨 Gambar Kegiatan</span>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-lg border-2 border-violet-200 p-6 text-center space-y-2">
            <div className="text-5xl">🎨</div>
            <h2 className="text-xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Gambar Kegiatan</h2>
            <p className="text-gray-500 font-body text-sm">Ekspresikan kegiatanmu melalui gambar!</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => setGambarMode("modeA")}
              className="w-full rounded-2xl border-2 border-violet-300 bg-violet-50 p-5 text-left flex items-center gap-4 hover:scale-105 active:scale-95 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center text-3xl shrink-0 shadow-sm">🎯</div>
              <div className="flex-1">
                <div className="font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Tantangan Hari Ini</div>
                <div className="text-xs text-gray-500 font-body">Gambarkan kegiatan yang dipilih sistem!</div>
              </div>
              <div className="text-gray-400 text-xl">→</div>
            </button>
            <button onClick={() => setGambarMode("modeB-day")}
              className="w-full rounded-2xl border-2 border-fuchsia-300 bg-fuchsia-50 p-5 text-left flex items-center gap-4 hover:scale-105 active:scale-95 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center text-3xl shrink-0 shadow-sm">🌟</div>
              <div className="flex-1">
                <div className="font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Hari Favoritku</div>
                <div className="text-xs text-gray-500 font-body">Pilih hari favoritmu dan gambar kegiatannya!</div>
              </div>
              <div className="text-gray-400 text-xl">→</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MODE A prompt card
  if (gambarMode === "modeA") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 pt-28">
        <GeomShapes />
        <div className="relative z-10 max-w-lg mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setGambarMode("select")} className="w-10 h-10 rounded-full bg-white border-2 border-violet-200 flex items-center justify-center text-violet-600 font-bold hover:bg-violet-50 active:scale-90 transition-all">←</button>
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-2xl px-4 py-2 flex-1 text-white text-center">
              <span className="font-black" style={{ fontFamily: "Nunito, sans-serif" }}>🎯 Tantangan Hari Ini</span>
            </div>
          </div>
          <div className={`bg-white rounded-3xl shadow-xl border-2 ${prompt.day.border} p-6 space-y-4 text-center`}>
            <div className="text-4xl">{prompt.day.emoji}</div>
            <ArabicText className="block text-5xl font-black text-gray-800">{prompt.day.arabic}</ArabicText>
            <div className="text-xl font-black text-gray-700" style={{ fontFamily: "Nunito, sans-serif" }}>{prompt.day.indonesian}</div>
            <div className={`${prompt.day.bg} rounded-2xl p-3 border-2 ${prompt.day.border}`}>
              <p className="text-sm text-gray-600 font-body">Kegiatan di hari <strong>{prompt.day.indonesian}</strong>:</p>
              <p className={`font-bold mt-1 ${prompt.day.accent}`} style={{ fontFamily: "Nunito, sans-serif" }}>{prompt.activity}</p>
            </div>
            <div className="bg-violet-50 rounded-2xl p-4 border-2 border-violet-200">
              <p className="text-violet-700 font-bold font-body">🎨 {prompt.prompt}</p>
            </div>
          </div>
          <button onClick={() => setGambarMode("draw")}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-md"
            style={{ fontFamily: "Nunito, sans-serif" }}>
            ✏️ Mulai Menggambar!
          </button>
        </div>
      </div>
    );
  }

  // MODE B — day selection
  if (gambarMode === "modeB-day") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 to-pink-50 p-6 pt-28">
        <GeomShapes />
        <div className="relative z-10 max-w-lg mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setGambarMode("select")} className="w-10 h-10 rounded-full bg-white border-2 border-fuchsia-200 flex items-center justify-center text-fuchsia-600 font-bold hover:bg-fuchsia-50 active:scale-90 transition-all">←</button>
            <div className="bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-2xl px-4 py-2 flex-1 text-white text-center">
              <span className="font-black" style={{ fontFamily: "Nunito, sans-serif" }}>🌟 Hari Favoritku</span>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-lg border-2 border-fuchsia-200 p-5 text-center space-y-1">
            <ArabicText className="block text-2xl font-black text-gray-800">ما يومك المفضل؟</ArabicText>
            <p className="text-gray-500 font-body text-sm">Pilih hari favoritmu!</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DAYS.map((day) => (
              <button key={day.arabic} onClick={() => { setFavDay(day); setGambarMode("modeB-activity"); }}
                className={`${day.bg} border-2 ${day.border} rounded-2xl p-4 text-center hover:scale-105 active:scale-95 transition-all`}>
                <div className="text-3xl mb-1">{day.emoji}</div>
                <ArabicText className={`block text-xl font-black ${day.accent}`}>{day.arabic}</ArabicText>
                <div className="text-xs text-gray-500 font-body mt-1">{day.indonesian}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // MODE B — activity selection
  if (gambarMode === "modeB-activity") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 to-pink-50 p-6 pt-28">
        <GeomShapes />
        <div className="relative z-10 max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setGambarMode("modeB-day")} className="w-10 h-10 rounded-full bg-white border-2 border-fuchsia-200 flex items-center justify-center text-fuchsia-600 font-bold hover:bg-fuchsia-50 active:scale-90 transition-all">←</button>
            <div className="bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-2xl px-4 py-2 flex-1 text-white text-center">
              <span className="font-black" style={{ fontFamily: "Nunito, sans-serif" }}>✨ Kegiatan Favoritku</span>
            </div>
          </div>
          {favDay && (
            <div className={`${favDay.bg} border-2 ${favDay.border} rounded-2xl p-3 flex items-center gap-3`}>
              <span className="text-3xl">{favDay.emoji}</span>
              <div>
                <ArabicText className={`block text-xl font-black ${favDay.accent}`}>{favDay.arabic}</ArabicText>
                <p className="text-xs text-gray-500 font-body">{favDay.indonesian}</p>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border-2 border-fuchsia-200 p-4 text-center">
            <ArabicText className="block text-base font-black text-gray-700">ما النشاط الذي تحب أن تفعله في هذا اليوم؟</ArabicText>
            <p className="text-gray-400 font-body text-xs mt-1">Pilih kegiatan yang kamu suka!</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVITY_OPTIONS.map((act) => (
              <button key={act.label} onClick={() => { setFavActivity(act); setGambarMode("draw"); }}
                className="bg-white border-2 border-fuchsia-200 rounded-2xl p-3 text-center hover:bg-fuchsia-50 hover:border-fuchsia-400 active:scale-95 transition-all">
                <div className="text-2xl mb-1">{act.emoji}</div>
                <div className="text-xs font-bold text-gray-700 font-body">{act.label}</div>
                <ArabicText className="block text-xs text-fuchsia-600 mt-0.5">{act.arabic}</ArabicText>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // DRAW canvas
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 pt-28">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setGambarMode(favDay ? "modeB-activity" : "modeA")} className="w-10 h-10 rounded-full bg-white border-2 border-violet-200 flex items-center justify-center text-violet-600 font-bold hover:bg-violet-50 active:scale-90 transition-all">←</button>
          <div className={`border-2 ${currentDay.border} ${currentDay.bg} rounded-2xl px-4 py-2 flex-1 text-center flex items-center justify-center gap-2`}>
            <span className="text-xl">{currentDay.emoji}</span>
            <ArabicText className={`font-black text-sm ${currentDay.accent}`}>{currentDay.arabic}</ArabicText>
            <span className="text-xs text-gray-500 font-body">— {currentDay.indonesian}</span>
          </div>
        </div>
        <div className="bg-violet-50 rounded-2xl border-2 border-violet-200 p-3 text-center">
          <p className="text-violet-700 font-bold font-body text-sm">🎨 {currentPrompt}</p>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border-2 border-violet-200 p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-body shrink-0">Warna:</span>
            {COLORS.map((c) => (
              <button key={c} onClick={() => { setColor(c); setTool("pen"); }}
                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c && tool === "pen" ? "border-gray-800 scale-125 shadow-md" : "border-gray-200"}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTool("pen")} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${tool === "pen" ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>✏️ Pensil</button>
            <button onClick={() => setTool("eraser")} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${tool === "eraser" ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>🧹 Hapus</button>
            <div className="flex-1" />
            {[2, 5, 10, 16].map((s) => (
              <button key={s} onClick={() => setBrushSize(s)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${brushSize === s ? "border-violet-400 bg-violet-100" : "border-transparent bg-gray-100"}`}>
                <div className="rounded-full bg-gray-600" style={{ width: Math.min(s + 4, 18), height: Math.min(s + 4, 18) }} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={undo} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs hover:bg-gray-200 active:scale-95 transition-all">↩ Undo</button>
            <button onClick={redo} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs hover:bg-gray-200 active:scale-95 transition-all">↪ Redo</button>
            <button onClick={clearCanvas} className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 font-bold text-xs hover:bg-red-100 active:scale-95 transition-all">🗑️ Hapus</button>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-amber-50 rounded-2xl border-2 border-violet-200 overflow-hidden shadow-inner" style={{ height: "280px" }}>
          <canvas ref={canvasRef} className="w-full h-full touch-none cursor-crosshair"
            onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw} />
        </div>

        {!submitted ? (
          <button onClick={() => setSubmitted(true)} disabled={!hasDrawn}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-black text-lg disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-md"
            style={{ fontFamily: "Nunito, sans-serif" }}>
            🎨 Kirim Gambar!
          </button>
        ) : (
          <div id="gambar-result" className="bg-white rounded-3xl shadow-xl border-2 border-violet-200 p-6 space-y-4 pop-in">
            <div className="text-center">
              <div className="text-5xl mb-2">🎉</div>
              <h3 className="text-xl font-black text-violet-700" style={{ fontFamily: "Nunito, sans-serif" }}>Hebat! Kamu sudah menyelesaikan gambar kegiatanmu! 🎨</h3>
            </div>
            <div className="bg-violet-50 rounded-2xl border-2 border-violet-200 p-4 space-y-3">
              <ArabicText className="block text-center text-lg font-black text-gray-700">اكتب جملة عن صورتك!</ArabicText>
              <p className="text-center text-xs text-gray-500 font-body">Tulis satu kalimat tentang gambarmu! (opsional)</p>
              <button onClick={() => setShowSentence((v) => !v)}
                className="w-full py-2 rounded-xl bg-violet-100 text-violet-700 font-bold text-sm hover:bg-violet-200 transition-all">
                {showSentence ? "🙈 Sembunyikan Contoh" : "👀 Lihat Contoh Kalimat Arab"}
              </button>
              {showSentence && (
                <div className="bg-white rounded-xl p-3 border border-violet-200 text-center pop-in">
                  <ArabicText className="block text-lg font-bold text-gray-800">{modelSentence}</ArabicText>
                  <p className="text-xs text-gray-400 font-body italic mt-1">{modelSentenceId}</p>
                </div>
              )}
              <input type="text" value={customSentence} onChange={(e) => setCustomSentence(e.target.value)}
                placeholder="اكتب جملتك هنا... (opsional)"
                className="w-full px-4 py-3 rounded-xl border-2 border-violet-200 text-gray-700 text-sm focus:outline-none focus:border-violet-400"
                dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }} />
            </div>
            <button onClick={onComplete}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all"
              style={{ fontFamily: "Nunito, sans-serif" }}>
              Kembali ke Menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// EVALUATION — 4 Maharah
// ────────────────────────────────────────────────────────────────
type EvalSection = "listening" | "reading" | "speaking" | "writing" | "vocab" | "done";

function EvaluationPage({ onComplete, onSaveScore }: { onComplete: () => void; onSaveScore: (s: number) => void }) {
  const [section, setSection] = useState<EvalSection>("listening");
  const [listeningAns, setListeningAns] = useState<string | null>(null);
  const [readingAns, setReadingAns] = useState<string | null>(null);
  const [speakingDone, setSpeakingDone] = useState(false);
  const [writingDone, setWritingDone] = useState(false);
  const [vocabAnswers, setVocabAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [vocabIdx, setVocabIdx] = useState(0);
  const [vocabChosen, setVocabChosen] = useState<string | null>(null);
  const [writingHistory, setWritingHistory] = useState<ImageData[]>([]);
  const [drawColor] = useState("#1e293b");
  const [drawStroke] = useState(5);
  const [drawing, setDrawing] = useState(false);
  const [lastPt, setLastPt] = useState<{ x: number; y: number } | null>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const evalFeedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (vocabChosen || listeningAns || readingAns || speakingDone || writingDone) {
      evalFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [vocabChosen, listeningAns, readingAns, speakingDone, writingDone]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [vocabIdx]);

  const VOCAB_QS = [
    { q: 'Apa arti "يَوْمُ الْجُمُعَةِ"?', opts: ["Hari Senin", "Hari Jumat", "Hari Rabu", "Hari Sabtu"], ans: "Hari Jumat" },
    { q: 'Kata Arab untuk "Senin" adalah...', opts: ["يَوْمُ الْأَحَدِ", "يَوْمُ الإِثْنَيْنِ", "يَوْمُ السَّبْتِ", "يَوْمُ الْخَمِيسِ"], ans: "يَوْمُ الإِثْنَيْنِ", arabic: true },
    { q: '"يَوْمُ الْخَمِيسِ" dalam Bahasa Indonesia adalah...', opts: ["Hari Rabu", "Hari Selasa", "Hari Sabtu", "Hari Kamis"], ans: "Hari Kamis" },
    { q: 'Apa arti "الْآنَ"?', opts: ["Kemarin", "Besok", "Sekarang", "Besok lusa"], ans: "Sekarang" },
    { q: 'Kata Arab untuk "Kemarin" adalah...', opts: ["غَدًا", "بِالْأَمْسِ", "الْآنَ", "بَعْدَ غَدٍ"], ans: "بِالْأَمْسِ", arabic: true },
    { q: '"بَعْدَ غَدٍ" artinya...', opts: ["Kemarin", "Besok", "Kemarin lusa", "Besok lusa"], ans: "Besok lusa" },
    { q: 'Lengkapi: "يَوْمُ الِاثْنَيْنِ ..." (Sekarang hari Senin)', opts: ["بِالْأَمْسِ", "الْآنَ", "غَدًا", "أَوَّلُ الْأَمْسِ"], ans: "الْآنَ", arabic: true },
    { q: 'Jika hari ini hari Selasa, maka بِالْأَمْسِ adalah hari apa?', opts: ["Senin", "Rabu", "Kamis", "Minggu"], ans: "Senin" },
    { q: 'Kata tanya untuk menanyakan hari adalah...', opts: ["كَيْفَ", "مَنْ", "أَيُّ", "أَيْنَ"], ans: "أَيُّ", arabic: true },
    { q: '"أَيُّ يَوْمٍ غَدًا؟" artinya...', opts: ["Hari apa kemarin?", "Hari apa besok?", "Hari apa sekarang?", "Hari apa kemarin lusa?"], ans: "Hari apa besok?" },
  ];

  const sections: EvalSection[] = ["listening", "reading", "speaking", "writing", "vocab"];
  const sectionLabels: Record<EvalSection, string> = { listening: "🎧 Istimā'", reading: "📖 Qirā'ah", speaking: "🎤 Kalām", writing: "✍️ Kitābah", vocab: "📝 Mufradāt", done: "" };
  const sectionDone: Record<EvalSection, boolean> = { listening: listeningAns !== null, reading: readingAns !== null, speaking: speakingDone, writing: writingDone, vocab: vocabAnswers[VOCAB_QS.length - 1] !== null, done: false };

  const isSectionUnlocked = (s: EvalSection) => {
    const order: EvalSection[] = ["listening", "reading", "speaking", "writing", "vocab"];
    const idx = order.indexOf(s);
    if (idx <= 0) return true;
    return sectionDone[order[idx - 1]];
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [section]);

  useEffect(() => {
    if (section === "writing") {
      requestAnimationFrame(() => {
        const canvas = miniCanvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        drawWritingGuide(ctx, rect.width, rect.height);
      });
    }
  }, [section]);

  const getMiniPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = miniCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sx = (canvas.width / dpr) / rect.width, sy = (canvas.height / dpr) / rect.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };
  const miniStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = miniCanvasRef.current?.getContext("2d");
    if (!ctx || !miniCanvasRef.current) return;
    setWritingHistory((h) => [...h.slice(-9), ctx.getImageData(0, 0, miniCanvasRef.current!.width, miniCanvasRef.current!.height)]);
    setDrawing(true); setLastPt(getMiniPos(e));
  };
  const miniDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing || !lastPt) return;
    const ctx = miniCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getMiniPos(e);
    ctx.beginPath(); ctx.moveTo(lastPt.x, lastPt.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = drawColor; ctx.lineWidth = drawStroke; ctx.lineCap = "round"; ctx.stroke();
    setLastPt(pos);
  };
  const miniEnd = () => { setDrawing(false); setLastPt(null); };
  const miniUndo = () => {
    if (!writingHistory.length) return;
    const ctx = miniCanvasRef.current?.getContext("2d"); if (!ctx) return;
    ctx.putImageData(writingHistory[writingHistory.length - 1], 0, 0);
    setWritingHistory((h) => h.slice(0, -1));
  };
  const miniClear = () => {
    const canvas = miniCanvasRef.current; const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    drawWritingGuide(ctx, canvas.width / dpr, canvas.height / dpr);
    setWritingHistory([]);
  };

  const handleVocabAnswer = (opt: string) => {
    if (vocabChosen) return;
    setVocabChosen(opt);
    playSound(opt === VOCAB_QS[vocabIdx].ans ? "correct" : "wrong");
    const newAns = [...vocabAnswers]; newAns[vocabIdx] = opt; setVocabAnswers(newAns);
    setTimeout(() => {
      if (vocabIdx + 1 >= VOCAB_QS.length) {
        const sc = newAns.filter((a, i) => a === VOCAB_QS[i].ans).length;
        const listening = listeningAns === "يَذْهَبُ إِلَى الْمَدْرَسَةِ" ? 1 : 0;
        const reading = readingAns === "الْجُمُعَةِ" ? 1 : 0;
        const total = listening + reading + (speakingDone ? 1 : 0) + (writingDone ? 1 : 0) + sc;
        onSaveScore(total);
        setSection("done");
      } else {
        setVocabIdx((i) => i + 1); setVocabChosen(null);
      }
    }, 900);
  };

  if (section === "done") {
    const l = listeningAns === "يَذْهَبُ إِلَى الْمَدْرَسَةِ" ? 1 : 0;
    const r = readingAns === "الْجُمُعَةِ" ? 1 : 0;
    const v = vocabAnswers.filter((a, i) => a === VOCAB_QS[i].ans).length;
    const total = l + r + (speakingDone ? 1 : 0) + (writingDone ? 1 : 0) + v;
    const maxScore = 2 + 1 + 1 + VOCAB_QS.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 p-6 pt-20 pb-10">
        <GeomShapes />
        <div className="relative z-10 max-w-lg mx-auto space-y-5">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center space-y-5 bounce-in">
            <div className="text-6xl">{total >= maxScore * 0.8 ? "🏆" : total >= maxScore * 0.5 ? "⭐" : "💪"}</div>
            <h3 className="text-2xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Evaluasi Selesai!</h3>
            <div className="grid grid-cols-2 gap-3">
              {([["🎧 Istimā'", listeningAns !== null, `${l}/1`], ["📖 Qirā'ah", readingAns !== null, `${r}/1`], ["🎤 Kalām", speakingDone, speakingDone ? "✓" : "—"], ["✍️ Kitābah", writingDone, writingDone ? "✓" : "—"]] as [string, boolean, string][]).map(([label, done, sc]) => (
                <div key={label} className={`rounded-2xl p-3 border-2 text-center ${done ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-200"}`}>
                  <div className="text-sm font-bold text-gray-700" style={{ fontFamily: "Nunito, sans-serif" }}>{label}</div>
                  <div className={`text-xs font-bold mt-1 ${done ? "text-green-600" : "text-gray-400"}`}>{done ? `✓ ${sc}` : "—"}</div>
                </div>
              ))}
            </div>
            <div className="bg-violet-50 rounded-2xl p-4 border-2 border-violet-200">
              <div className="text-sm font-bold text-violet-500 font-body mb-1">📝 Mufradāt: {v}/{VOCAB_QS.length} benar</div>
              <div className="text-4xl font-black text-violet-600" style={{ fontFamily: "Nunito, sans-serif" }}>{total}/{maxScore}</div>
              <div className="text-gray-400 font-body text-sm">total poin</div>
            </div>
            <button onClick={onComplete} className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
              💭 Lanjut ke Refleksi!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 p-6 pt-20 pb-10">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-4">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-3xl p-5 text-white text-center">
          <div className="text-3xl mb-1">📝</div>
          <h2 className="text-2xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>Evaluasi — 4 Maharah</h2>
          <p className="text-violet-100 font-body text-sm">Uji keempat keterampilan bahasamu!</p>
        </div>

        {/* Sequential section tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {sections.map((s) => {
            const unlocked = isSectionUnlocked(s);
            const done = sectionDone[s];
            return (
              <button key={s} onClick={() => { if (unlocked) setSection(s); }} disabled={!unlocked}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${s === section ? "bg-violet-500 text-white shadow-md" : done ? "bg-green-100 text-green-700 border-2 border-green-300" : unlocked ? "bg-white text-gray-500 border-2 border-gray-200 hover:border-violet-300" : "bg-gray-100 text-gray-300 border-2 border-gray-200 cursor-not-allowed"}`}
                style={{ fontFamily: "Nunito, sans-serif" }}>
                {done ? "✓ " : !unlocked ? "🔒 " : ""}{sectionLabels[s]}
              </button>
            );
          })}
        </div>

        {section === "listening" && (
          <div className="space-y-4 pop-in">
            <div className="bg-cyan-50 rounded-2xl border-2 border-cyan-200 p-4">
              <p className="text-sm font-bold text-cyan-600 font-body mb-2">🎧 Istimā' — Dengarkan dan jawab:</p>
              <AudioPlayer label="مَاذَا يَفْعَلُ أَحْمَدُ يَوْمَ الِاثْنَيْنِ؟" duration={8} />
            </div>
            <p className="font-black text-gray-700 text-center" style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif", fontSize: "1.2rem" }} dir="rtl">مَاذَا يَفْعَلُ أَحْمَدُ يَوْمَ الِاثْنَيْنِ؟</p>
            <div className="space-y-2">
              {["يَذْهَبُ إِلَى الْمَسْجِدِ", "يَذْهَبُ إِلَى الْمَدْرَسَةِ", "يَسْتَرِيحُ فِي الْبَيْتِ", "يَقْرَأُ الْكُتُبَ"].map((opt) => (
                <button key={opt} onClick={() => { if (!listeningAns) { playSound(opt === "يَذْهَبُ إِلَى الْمَدْرَسَةِ" ? "correct" : "wrong"); setListeningAns(opt); setTimeout(() => setSection("reading"), 800); } }}
                  disabled={!!listeningAns}
                  className={`w-full py-3 px-4 rounded-2xl border-2 font-body text-right transition-all ${!listeningAns ? "bg-white border-gray-200 text-gray-700 hover:border-cyan-400" : opt === "يَذْهَبُ إِلَى الْمَدْرَسَةِ" ? "bg-green-100 border-green-400 text-green-700" : listeningAns === opt ? "bg-red-100 border-red-400 text-red-600" : "bg-gray-50 border-gray-200 text-gray-300 opacity-50"}`}
                  dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }}>
                  {opt}
                </button>
              ))}
            </div>
            {listeningAns && <div ref={evalFeedbackRef} className={`rounded-xl p-3 text-center font-bold font-body pop-in ${listeningAns === "يَذْهَبُ إِلَى الْمَدْرَسَةِ" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{listeningAns === "يَذْهَبُ إِلَى الْمَدْرَسَةِ" ? "🎉 Benar!" : "💡 Benar: يَذْهَبُ إِلَى الْمَدْرَسَةِ"}</div>}
          </div>
        )}

        {section === "reading" && (
          <div className="space-y-4 pop-in">
            <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 p-4">
              <p className="text-xs font-bold text-emerald-600 font-body mb-2">📖 Qirā'ah — Baca dan jawab:</p>
              <div className="text-right space-y-1" dir="rtl">
                {["أَحْمَدُ يَذْهَبُ إِلَى الْمَدْرَسَةِ يَوْمَ الِاثْنَيْنِ.", "وَهُوَ يَذْهَبُ إِلَى الْمَسْجِدِ يَوْمَ الْجُمُعَةِ.", "يَوْمَ السَّبْتِ يَسْتَرِيحُ فِي الْبَيْتِ."].map((s, i) => (
                  <p key={i} className="text-sm text-gray-700" style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }}>{s}</p>
                ))}
              </div>
            </div>
            <p className="font-bold text-gray-700 text-center font-body" dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }}>أَحْمَدُ يَذْهَبُ إِلَى الْمَسْجِدِ يَوْمَ ...؟</p>
            <div className="grid grid-cols-2 gap-3">
              {["الِاثْنَيْنِ", "الْأَحَدِ", "الْجُمُعَةِ", "السَّبْتِ"].map((opt) => (
                <button key={opt} onClick={() => { if (!readingAns) { playSound(opt === "الْجُمُعَةِ" ? "correct" : "wrong"); setReadingAns(opt); setTimeout(() => setSection("speaking"), 800); } }}
                  disabled={!!readingAns}
                  className={`py-4 rounded-2xl border-2 font-black text-xl transition-all ${!readingAns ? "bg-white border-gray-200 hover:border-emerald-400" : opt === "الْجُمُعَةِ" ? "bg-green-100 border-green-400 text-green-700" : readingAns === opt ? "bg-red-100 border-red-400 text-red-600" : "bg-gray-50 border-gray-200 text-gray-300 opacity-50"}`}
                  style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }}>
                  {opt}
                </button>
              ))}
            </div>
            {readingAns && <div ref={evalFeedbackRef} className={`rounded-xl p-3 text-center font-bold font-body pop-in ${readingAns === "الْجُمُعَةِ" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{readingAns === "الْجُمُعَةِ" ? "🎉 Benar!" : "💡 Benar: الْجُمُعَةِ"}</div>}
          </div>
        )}

        {section === "speaking" && (
          <div className="space-y-4 pop-in">
            <div className="bg-rose-50 rounded-2xl border-2 border-rose-200 p-4 text-center">
              <p className="text-xs font-bold text-rose-600 font-body mb-2">🎤 Kalām — Rekam jawabanmu:</p>
              <ArabicText className="block text-2xl font-black text-gray-700">مَاذَا تَفْعَلُ يَوْمَ الْجُمُعَةِ؟</ArabicText>
              <p className="text-gray-400 font-body text-xs mt-1">Apa yang kamu lakukan hari Jumat?</p>
            </div>
            {!speakingDone
              ? <MicRecorder onSubmit={() => { setSpeakingDone(true); setTimeout(() => setSection("writing"), 600); }} submitLabel="✓ Kirim Jawaban" />
              : <div ref={evalFeedbackRef} className="bg-green-100 rounded-2xl p-4 text-center font-bold text-green-700 font-body pop-in">Rekaman kalām selesai!</div>}
          </div>
        )}

        {section === "writing" && (
          <div className="space-y-4 pop-in">
            <div className="bg-indigo-50 rounded-2xl border-2 border-indigo-200 p-4 text-center">
              <p className="text-xs font-bold text-indigo-600 font-body mb-1">✍️ Kitābah — Tulis kata Arab:</p>
              <div className="text-2xl font-black text-indigo-700" style={{ fontFamily: "Nunito, sans-serif" }}>Hari Jumat</div>
              <p className="text-xs text-indigo-400 font-body">Tulis dalam Bahasa Arab di kanvas!</p>
            </div>
            <div className="flex gap-2">
              <button onClick={miniUndo} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs">↩ Undo</button>
              <button onClick={miniClear} className="px-3 py-2 rounded-xl bg-red-100 text-red-600 font-bold text-xs">🗑 Hapus</button>
            </div>
            <div className="relative bg-white rounded-2xl shadow-lg border-2 border-indigo-200 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.12]">
                <ArabicText className="font-black" style={{ fontSize: "clamp(36px, 10vw, 60px)" }}>يَوْمُ الْجُمُعَةِ</ArabicText>
              </div>
              <canvas ref={miniCanvasRef} className="relative z-10 w-full touch-none block" style={{ height: 200, cursor: "crosshair" }}
                onMouseDown={miniStart} onMouseMove={miniDraw} onMouseUp={miniEnd} onMouseLeave={miniEnd}
                onTouchStart={miniStart} onTouchMove={miniDraw} onTouchEnd={miniEnd} />
            </div>
            {!writingDone
              ? <button onClick={() => { setWritingDone(true); setTimeout(() => setSection("vocab"), 400); }} className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-lg hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>📤 Kirim Tulisan</button>
              : <div ref={evalFeedbackRef} className="bg-green-100 rounded-2xl p-4 text-center font-bold text-green-700 font-body pop-in">Kitābah selesai!</div>}
          </div>
        )}

        {section === "vocab" && (
          <div className="space-y-4 pop-in">
            <div className="bg-purple-50 rounded-2xl border-2 border-purple-200 p-3 text-center">
              <p className="text-xs font-bold text-purple-600 font-body">📝 Mufradāt — Soal {vocabIdx + 1}/{VOCAB_QS.length}</p>
            </div>
            <div className="bg-white rounded-3xl shadow-lg border-2 border-purple-200 p-5 text-center" key={vocabIdx}>
              <p className="font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>{VOCAB_QS[vocabIdx].q}</p>
            </div>
            <div className="space-y-2">
              {VOCAB_QS[vocabIdx].opts.map((opt) => {
                const isC = opt === VOCAB_QS[vocabIdx].ans; const isSel = vocabChosen === opt; const isAr = /[؀-ۿ]/.test(opt);
                return (
                  <button key={opt} onClick={() => handleVocabAnswer(opt)} disabled={!!vocabChosen}
                    dir={isAr ? "rtl" : "ltr"}
                    className={`w-full py-3 px-4 rounded-2xl border-2 font-bold font-body text-left transition-all ${!vocabChosen ? "bg-white border-gray-200 text-gray-700 hover:border-purple-400 active:scale-95" : isC ? "bg-green-100 border-green-400 text-green-700" : isSel ? "bg-red-100 border-red-400 text-red-600" : "bg-gray-50 border-gray-200 text-gray-300 opacity-50"}`}
                    style={isAr ? { fontFamily: "'Noto Naskh Arabic', Arial, serif" } : {}}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {vocabChosen && <div ref={evalFeedbackRef} className={`rounded-xl p-3 text-center font-bold font-body pop-in ${vocabChosen === VOCAB_QS[vocabIdx].ans ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{vocabChosen === VOCAB_QS[vocabIdx].ans ? "🎉 Benar!" : `💡 Benar: ${VOCAB_QS[vocabIdx].ans}`}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// REFLECTION — Expanded with 4-skill self-assessment
// ────────────────────────────────────────────────────────────────
const REFLECT_QS = [
  { key: "learned" as const, q: "Apa yang kamu pelajari hari ini?", arabic: "مَاذَا تَعَلَّمْتَ الْيَوْمَ؟", emoji: "📚", opts: ["Nama-nama hari dalam Arab", "Cara mengucapkan hari", "Cara menulis hari dalam Arab", "Semua di atas! 🌟"] },
  { key: "remembered" as const, q: "Kosakata apa yang paling kamu ingat?", arabic: "مَا الْكَلِمَةُ الَّتِي تَتَذَكَّرُهَا أَكْثَرَ؟", emoji: "💡", opts: ["الْجُمُعَةُ (Jumat)", "الإِثْنَيْنِ (Senin)", "السَّبْتُ (Sabtu)", "الْأَحَدُ (Minggu)"] },
  { key: "liked" as const, q: "Aktivitas mana yang paling kamu sukai?", arabic: "أَيُّ نَشَاطٍ أَعْجَبَكَ أَكْثَرَ؟", emoji: "❤️", opts: ["📖 Belajar kosakata", "🎮 Mini game", "✍️ Menulis Arab", "🎧 Mendengarkan"] },
  { key: "difficult" as const, q: "Apa yang masih sulit untuk kamu pahami?", arabic: "مَا الَّذِي لَا يَزَالُ صَعْبًا عَلَيْكَ؟", emoji: "🤔", opts: ["Cara mengucapkan kata", "Cara menulis huruf Arab", "Memahami yang didengar", "Semuanya sudah mudah! 😊"] },
  { key: "feeling" as const, q: "Bagaimana perasaanmu setelah belajar hari ini?", arabic: "كَيْفَ تَشْعُرُ الْآنَ؟", emoji: "😊", opts: ["😄 Sangat senang!", "🙂 Cukup menyenangkan", "😐 Biasa saja", "🤩 Bersemangat belajar lagi!"] },
];

const SKILL_QS = [
  { key: "skillReading" as const, q: "Apakah kamu sudah bisa membaca kata-kata Arab?", arabic: "هَلْ تَسْتَطِيعُ قِرَاءَةَ الْكَلِمَاتِ الْعَرَبِيَّةِ؟", emoji: "📖" },
  { key: "skillListening" as const, q: "Apakah kamu bisa memahami bahasa Arab yang kamu dengar?", arabic: "هَلْ تَسْتَطِيعُ فَهْمَ الْكَلَامِ الْمَسْمُوعِ؟", emoji: "🎧" },
  { key: "skillSpeaking" as const, q: "Apakah kamu sudah bisa berbicara menggunakan bahasa Arab?", arabic: "هَلْ تَسْتَطِيعُ التَّحَدُّثَ بِاللُّغَةِ الْعَرَبِيَّةِ؟", emoji: "🎤" },
  { key: "skillWriting" as const, q: "Apakah kamu sudah bisa menulis kata-kata Arab?", arabic: "هَلْ تَسْتَطِيعُ كِتَابَةَ الْكَلِمَاتِ الْعَرَبِيَّةِ؟", emoji: "✍️" },

];

const SKILL_OPTS = [
  { label: "Sudah bisa!", color: "bg-green-100 border-green-400 text-green-700" },
  { label: "Hampir bisa", color: "bg-yellow-100 border-yellow-400 text-yellow-700" },
  { label: "Belum bisa", color: "bg-red-100 border-red-400 text-red-600" },
];

function ReflectionPage({ onComplete, mindfulData, onSave }: { onComplete: () => void; mindfulData: MindfulData; onSave: (d: ReflectionData) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<ReflectionData>>({});
  const totalSteps = REFLECT_QS.length + SKILL_QS.length;
  const isSkillPhase = step >= REFLECT_QS.length;
  const skillIdx = step - REFLECT_QS.length;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [step]);

  const handleSelect = (opt: string) => {
    const key = isSkillPhase ? SKILL_QS[skillIdx].key : REFLECT_QS[step].key;
    const newAns = { ...answers, [key]: opt } as ReflectionData;
    setAnswers(newAns);
    setTimeout(() => {
      if (step + 1 >= totalSteps) { onSave(newAns); onComplete(); }
      else setStep((s) => s + 1);
    }, 500);
  };

  const currentQ = isSkillPhase ? SKILL_QS[skillIdx] : REFLECT_QS[step];
  const currentKey = currentQ.key;
  const currentOpts = isSkillPhase ? SKILL_OPTS.map((o) => o.label) : REFLECT_QS[step].opts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-rose-50 p-6 pt-28">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-5">
        <div className="bg-gradient-to-r from-amber-500 to-rose-500 rounded-3xl p-5 text-white text-center">
          <div className="text-3xl mb-1">💭</div>
          <h2 className="text-2xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>Refleksi</h2>
          <p className="text-amber-100 font-body text-sm">Renungkan pengalaman belajarmu hari ini</p>
        </div>

        {step === 0 && mindfulData.experience && (
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-4 pop-in">
            <p className="text-xs font-bold text-amber-600 mb-1 font-body">💾 Jawaban Mindful Learning-mu tadi:</p>
            <p className="text-gray-600 font-body text-sm">{mindfulData.experience === "yes" ? `Kamu bilang pernah belajar. Ingatan: "${mindfulData.memory}"` : `Kamu belum pernah belajar. Dugaanmu: "${mindfulData.guess}"`}</p>
            <p className="text-amber-500 text-xs font-bold mt-2">Sekarang bandingkan dengan yang sudah kamu pelajari! 🔍</p>
          </div>
        )}

        {isSkillPhase && step === REFLECT_QS.length && (
          <div className="bg-purple-50 rounded-2xl border-2 border-purple-200 p-4 pop-in">
            <p className="text-xs font-bold text-purple-600 font-body">📊 Penilaian Diri — 4 Maharah Bahasa Arab</p>
            <p className="text-gray-500 font-body text-xs mt-1">Nilai kemampuanmu sendiri setelah belajar hari ini!</p>
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all min-w-[8px] ${i < step ? "bg-amber-400" : i === step ? "bg-rose-500 scale-y-150" : "bg-gray-200"}`} />
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl border-2 border-amber-100 p-6 text-center" key={step}>
          <div className="text-4xl mb-3">{currentQ.emoji}</div>
          {isSkillPhase && (
            <ArabicText className="block text-sm text-amber-500 mb-2">{(currentQ as typeof SKILL_QS[0]).arabic}</ArabicText>
          )}
          {!isSkillPhase && (
            <ArabicText className="block text-sm text-amber-400 mb-1">{(currentQ as typeof REFLECT_QS[0]).arabic}</ArabicText>
          )}
          <p className="text-lg font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>{currentQ.q}</p>
        </div>

        <div className={`${isSkillPhase ? "grid grid-cols-1 gap-3" : "space-y-3"}`}>
          {currentOpts.map((opt) => {
            const skillStyle = isSkillPhase ? SKILL_OPTS.find((o) => o.label === opt)?.color : "";
            return (
              <button key={opt} onClick={() => handleSelect(opt)}
                className={`w-full py-4 px-5 rounded-2xl border-2 font-bold font-body text-left transition-all ${answers[currentKey as keyof ReflectionData] === opt ? (isSkillPhase ? skillStyle + " scale-102" : "bg-amber-100 border-amber-400 text-amber-800") : isSkillPhase ? "bg-white border-gray-200 text-gray-700 hover:border-amber-400" : "bg-white border-gray-200 text-gray-700 hover:border-amber-400 active:scale-95"}`}>
                {opt}
              </button>
            );
          })}
        </div>

        <p className="text-center text-gray-400 font-body text-xs">Pertanyaan {step + 1} dari {totalSteps}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// RESULT PAGE — with 4-Maharah tracker
// ────────────────────────────────────────────────────────────────
function ResultPage({ gameScore, evalScore, reflectionData, mindfulData, maharah, profile, onRestart }: {
  gameScore: number; evalScore: number; reflectionData: ReflectionData | null; mindfulData: MindfulData;
  maharah: MaharahProgress; profile: StudentProfile | null; onRestart: () => void;
}) {
  const GAME_MAX = 20; // 6 cocokkan + 7 tebak + 6 susun + 1 draw
  const EVAL_MAX = 14; // 2 skill + 10 vocab QS
  const total = Math.round(((gameScore / GAME_MAX + evalScore / EVAL_MAX) / 2) * 100);
  const badge = total >= 75 ? { emoji: "🏆", msg: "Luar biasa! Kamu bintang hari ini!", color: "from-yellow-400 to-orange-500" }
    : total >= 50 ? { emoji: "🌟", msg: "Bagus sekali! Kamu sudah belajar dengan baik!", color: "from-cyan-500 to-blue-500" }
    : { emoji: "💪", msg: "Semangat! Setiap usaha membawamu lebih maju!", color: "from-green-500 to-teal-500" };

  const maharahData = [
    { skill: "الِاسْتِمَاعُ", name: "Istimā'", sub: "Mendengar", icon: "🎧", done: maharah.listening, skillKey: "skillListening" as keyof ReflectionData },
    { skill: "الْكَلَامُ", name: "Kalām", sub: "Berbicara", icon: "🎤", done: maharah.speaking, skillKey: "skillSpeaking" as keyof ReflectionData },
    { skill: "الْقِرَاءَةُ", name: "Qirā'ah", sub: "Membaca", icon: "📖", done: maharah.reading, skillKey: "skillReading" as keyof ReflectionData },
    { skill: "الْكِتَابَةُ", name: "Kitābah", sub: "Menulis", icon: "✍️", done: maharah.writing, skillKey: "skillWriting" as keyof ReflectionData },
  ];

  const selfScore = (key: keyof ReflectionData) => {
    const val = reflectionData?.[key];
    if (!val) return null;
    if (String(val).includes("Sudah")) return { label: "Sudah bisa!", color: "text-green-600" };
    if (String(val).includes("Hampir")) return { label: "Hampir bisa 🟡", color: "text-yellow-600" };
    return { label: "Belum bisa", color: "text-red-500" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-rose-50 p-6 pt-20 pb-12">
      <GeomShapes />
      <div className="relative z-10 max-w-lg mx-auto space-y-5">
        {profile && (
          <div className="bg-white rounded-3xl shadow-lg border-2 border-yellow-200 p-5 text-center bounce-in">
            <div className="text-6xl mb-2">{profile.avatar}</div>
            <h2 className="text-2xl font-black text-gray-800" style={{ fontFamily: "Nunito, sans-serif" }}>Hebat, {profile.name}! 🎉</h2>
            <p className="text-gray-500 font-body text-sm mt-1">Kelas {profile.kelas}</p>
            <p className="text-gray-600 font-body text-sm mt-2">Kamu sudah menyelesaikan pembelajaran Bahasa Arab tentang <span className="font-bold" style={{ fontFamily: "'Noto Naskh Arabic', Arial, serif" }}>الأيام</span>.</p>
          </div>
        )}
        <div className={`bg-gradient-to-r ${badge.color} rounded-3xl p-6 text-center text-white bounce-in`}>
          <div className="text-6xl mb-3">{badge.emoji}</div>
          <h2 className="text-3xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>Hasil Belajar</h2>
          <p className="text-white/80 font-body mt-2">{badge.msg}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[{ label: "Skor Game", val: `${gameScore}/${GAME_MAX}`, color: "border-pink-200 text-pink-600" }, { label: "Evaluasi", val: `${evalScore}/${EVAL_MAX}`, color: "border-purple-200 text-purple-600" }, { label: "Total", val: `${Math.min(100, total)}%`, color: "border-orange-200 text-orange-600" }].map(({ label, val, color }) => (
            <div key={label} className={`bg-white rounded-2xl border-2 ${color} p-4 text-center`}>
              <div className="text-2xl font-black" style={{ fontFamily: "Nunito, sans-serif" }}>{val}</div>
              <div className="text-xs text-gray-400 font-body mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* 4-Maharah Progress Tracker */}
        <div className="bg-white rounded-3xl shadow-lg border-2 border-purple-200 p-5">
          <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2" style={{ fontFamily: "Nunito, sans-serif" }}>
            📊 الْمَهَارَاتُ اللُّغَوِيَّةُ الْأَرْبَعُ
            <span className="text-sm text-gray-400 font-normal">4 Maharah Bahasa</span>
          </h3>
          <div className="space-y-3">
            {maharahData.map((m) => {
              const self = selfScore(m.skillKey);
              return (
                <div key={m.name} className={`rounded-2xl p-3 border-2 ${m.done ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <ArabicText className="block text-sm font-black text-gray-700">{m.skill}</ArabicText>
                        <div className="text-xs text-gray-500 font-body">{m.name} — {m.sub}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {m.done ? (
                        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">—</div>
                      )}
                    </div>
                  </div>
                  {self && (
                    <div className={`text-xs font-bold mt-1.5 font-body ${self.color}`}>Penilaian diri: {self.label}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Activities */}
        <div className="bg-white rounded-3xl shadow-lg border-2 border-yellow-200 p-5">
          <h3 className="font-black text-gray-800 mb-3" style={{ fontFamily: "Nunito, sans-serif" }}>Aktivitas Selesai</h3>
          <div className="space-y-1">
            {[
              { name: "Mindful Learning", icon: "🧠" }, { name: "Materi الأيام (13 kosakata)", icon: "📖" },
              { name: "Cerita Pendek + Membaca", icon: "📕" }, { name: "Latihan Cocokkan", icon: "🔗" },
              { name: "Istimā' (Mendengarkan)", icon: "🎧" }, { name: "Kalām (Berbicara)", icon: "🎤" },
              { name: "Kitābah (Menulis — 3 Level)", icon: "✍️" }, { name: "Joyful Games", icon: "🎮", score: `${gameScore}/${GAME_MAX}` },
              { name: "Evaluasi 4 Maharah", icon: "📝", score: `${evalScore}/${EVAL_MAX}` }, { name: "Refleksi", icon: "💭" },
            ].map((act) => (
              <div key={act.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{act.icon}</span>
                  <span className="font-body text-sm text-gray-700">{act.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {act.score && <span className="text-xs font-bold text-gray-400">{act.score}</span>}
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {reflectionData && (
          <div className="bg-white rounded-3xl shadow-lg border-2 border-rose-200 p-5">
            <h3 className="font-black text-gray-800 mb-3" style={{ fontFamily: "Nunito, sans-serif" }}>💭 Refleksimu</h3>
            <div className="space-y-2">
              {[["Perasaan", reflectionData.feeling], ["Paling suka", reflectionData.liked], ["Kosakata ingat", reflectionData.remembered], ["Masih sulit", reflectionData.difficult]].map(([label, val]) => (
                <div key={String(label)} className="text-sm font-body text-gray-600">
                  <span className="font-bold text-rose-500">{String(label)}: </span>{String(val)}
                </div>
              ))}
            </div>
          </div>
        )}

        {mindfulData.experience && (
          <div className="bg-indigo-50 rounded-2xl border-2 border-indigo-200 p-4">
            <p className="text-xs font-bold text-indigo-600 font-body">🔍 Perbandingan Mindful Learning:</p>
            <p className="text-gray-600 font-body text-sm mt-1">
              <span className="font-bold">Sebelum: </span>{mindfulData.experience === "yes" ? `Ingatan awal — "${mindfulData.memory}"` : `Belum pernah, dugaan: "${mindfulData.guess}"`}
            </p>
            <p className="text-gray-600 font-body text-sm mt-0.5">
              <span className="font-bold">Sesudah: </span>Kamu sudah mengenal 7 hari dalam Bahasa Arab + 4 keterampilan bahasa! 🎉
            </p>
          </div>
        )}

        <button onClick={onRestart} className="w-full py-5 rounded-3xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all" style={{ fontFamily: "Nunito, sans-serif" }}>
          🏠 Kembali ke Beranda
        </button>
        <p className="text-center text-gray-400 text-xs font-body">Materi lebih banyak akan segera hadir! 🌟</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MAIN APP
// ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mindfulData, setMindfulData] = useState<MindfulData>({ experience: null });
  const [gameScore, setGameScore] = useState(0);
  const [evalScore, setEvalScore] = useState(0);
  const [reflectionData, setReflectionData] = useState<ReflectionData | null>(null);
  const [maharah, setMaharah] = useState<MaharahProgress>({ listening: false, speaking: false, reading: false, writing: false });

  const resetAll = () => {
    setPage("home"); setProfile(null); setMindfulData({ experience: null }); setGameScore(0); setEvalScore(0);
    setReflectionData(null); setMaharah({ listening: false, speaking: false, reading: false, writing: false });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [page]);

  return (
    <div className="min-h-screen bg-amber-50">
      <NavBar page={page} onHome={() => setPage("home")} />
      <StepBar page={page} />

      {page === "home" && <HomePage onStart={() => setPage("profile")} onNav={(p) => setPage(p)} />}
      {page === "about" && <AboutPage onBack={() => setPage("home")} />}
      {page === "info" && <InfoPage onBack={() => setPage("home")} />}
      {page === "profile" && <StudentProfilePage onComplete={(p) => { setProfile(p); setPage("materials"); }} />}
      {page === "materials" && <MaterialsPage onSelect={() => setPage("mindful")} />}
      {page === "mindful" && <MindfulPage onComplete={() => setPage("meaningful")} onSave={setMindfulData} />}
      {page === "meaningful" && (
        <MeaningfulPage onComplete={() => setPage("listening")} />
      )}
      {page === "listening" && (
        <ListeningPage onComplete={() => { setMaharah((m) => ({ ...m, listening: true, reading: true })); setPage("speaking"); }} />
      )}
      {page === "speaking" && (
        <SpeakingPage onComplete={() => { setMaharah((m) => ({ ...m, speaking: true })); setPage("writing"); }} />
      )}
      {page === "writing" && (
        <WritingPage
          onComplete={() => setPage("joyful")}
          onWritingDone={() => setMaharah((m) => ({ ...m, writing: true }))}
        />
      )}
      {page === "joyful" && <JoyfulPage onComplete={() => setPage("evaluation")} onSaveScore={setGameScore} />}
      {page === "evaluation" && <EvaluationPage onComplete={() => setPage("reflection")} onSaveScore={setEvalScore} />}
      {page === "reflection" && (
        <ReflectionPage onComplete={() => setPage("result")} mindfulData={mindfulData} onSave={setReflectionData} />
      )}
      {page === "result" && (
        <ResultPage gameScore={gameScore} evalScore={evalScore} reflectionData={reflectionData} mindfulData={mindfulData} maharah={maharah} profile={profile} onRestart={resetAll} />
      )}
    </div>
  );
}
