"use client";

import { useEffect, useRef, useState } from "react";

export default function Page() {
  const [username, setUsername] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [replays, setReplays] = useState(3);
  const [timeLeft, setTimeLeft] = useState(5);
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<any>(null);

  const button =
      "w-full py-3 rounded-xl transition-all duration-150 active:scale-95 shadow-md";

  async function enableAudio() {
    const AudioContextCtor =
        (window as any).AudioContext ||
        (window as any).webkitAudioContext;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextCtor();
    }

    await audioCtxRef.current.resume();
    setAudioEnabled(true);
  }

  async function playClip() {
    if (!audioRef.current || !audioEnabled) return;

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setTimeout(() => audioRef.current?.pause(), 1000);
    } catch {
      setAudioEnabled(false);
    }
  }

  function startTimer() {
    setTimeLeft(5);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function handleTimeout() {
    await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, guess: "__timeout__" }),
    });

    setPreview(null);
    setLocked(true);
  }

  async function startLogin() {
    if (!audioEnabled) return;

    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();

    if (data.locked) {
      setLocked(true);
      return;
    }

    if (!data.exists) {
      window.location.href = `/setup?u=${username}`;
      return;
    }

    setPreview(data.preview);
    setOptions(data.options);
    setProgress(data.progress);
    setTotal(data.total);
    setReplays(data.replays);

    startTimer();
  }

  async function unlock() {
    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.unlocked) {
      setLocked(false);
      startLogin();
    }
  }

  async function submitGuess(name: string) {
    if (timerRef.current) clearInterval(timerRef.current);

    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, guess: name }),
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = "/success";
      return;
    }

    setPreview(data.preview);
    setOptions(data.options);
    setProgress(data.progress);
    setTotal(data.total);
    setReplays(data.replays);

    startTimer();
  }

  async function notMySong() {
    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, notMine: true }),
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = "/success";
      return;
    }

    setPreview(data.preview);
    setOptions(data.options);
    setProgress(data.progress);
    setTotal(data.total);
    setReplays(data.replays);

    startTimer();
  }

  function replay() {
    if (replays <= 0) return;
    playClip();
    setReplays((r) => r - 1);
  }

  useEffect(() => {
    if (!preview || !audioEnabled) return;

    const t = setTimeout(() => playClip(), 150);
    return () => clearTimeout(t);
  }, [preview, audioEnabled]);

  return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1f3a30] via-[#2f5546] to-black px-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
          <h1 className="text-3xl text-emerald-100 mb-6 text-center">MuFA</h1>

          {!preview && !locked && (
              <>
                {!audioEnabled && (
                    <button
                        onClick={enableAudio}
                        className={`${button} mb-3 bg-emerald-700 hover:bg-emerald-600`}
                    >
                      Enable Audio
                    </button>
                )}

                <input
                    className="w-full mb-4 px-4 py-3 bg-black/40 rounded"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <button
                    onClick={startLogin}
                    disabled={!audioEnabled || username.trim() === ""}
                    className={`${button} ${
                        audioEnabled && username.trim() !== ""
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-gray-600 cursor-not-allowed"
                    }`}
                >
                  Continue
                </button>
              </>
          )}

          {preview && (
              <>
                <audio ref={audioRef} src={preview} preload="auto" playsInline />

                <p className="text-red-300 mb-2">Time left: {timeLeft}s</p>

                <button onClick={replay} className={`${button} bg-emerald-600 mb-3`}>
                  Replay ({replays})
                </button>

                <button onClick={notMySong} className={`${button} bg-red-600 mb-3`}>
                  Not my song
                </button>

                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => submitGuess(opt.name)}
                        className={`${button} bg-emerald-700 mb-2`}
                    >
                      {opt.name} — {opt.artist}
                    </button>
                ))}
              </>
          )}
        </div>
      </main>
  );
}
