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

  // Mobile audio unlock
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioHint, setAudioHint] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<any>(null);

  async function enableAudio() {
    try {
      setAudioHint(null);

      const AudioContextCtor =
          (window as any).AudioContext ||
          (window as any).webkitAudioContext;

      if (!AudioContextCtor) {
        setAudioEnabled(true);
        return;
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextCtor();
      }

      if (audioCtxRef.current.state !== "running") {
        await audioCtxRef.current.resume();
      }

      const ctx = audioCtxRef.current;
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);

      setAudioEnabled(true);
    } catch {
      setAudioEnabled(false);
    }
  }

  async function playClip() {
    if (!audioRef.current || !audioEnabled) return;

    try {
      audioRef.current.currentTime = 0;

      // Some mobile browsers require play() to be awaited and can still reject
      await audioRef.current.play();

      setTimeout(() => audioRef.current?.pause(), 1000);
    } catch {
      // If blocked, force user to unlock again
      setAudioEnabled(false);
      setAudioHint("Audio was blocked. Tap “Enable Audio” and try again.");
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
    // Force-lock via your existing failure path
    await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, guess: "__timeout__" }),
    });

    setPreview(null);
    setLocked(true);
  }

  async function startLogin() {
    if (!audioEnabled) {
      setAudioHint("Enable audio before continuing.");
      return;
    }

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
      // eslint-disable-next-line react-hooks/immutability
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
      // eslint-disable-next-line react-hooks/immutability
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
      // eslint-disable-next-line react-hooks/immutability
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
    if (preview && audioEnabled) {
      playClip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, audioEnabled]);

  const continueDisabled = !audioEnabled || username.trim().length === 0;

  return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1f3a30] via-[#2f5546] to-black px-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-2xl">
          <h1 className="text-3xl text-emerald-100 mb-6">MuFA</h1>

          {!preview && !locked && (
              <>
                {!audioEnabled && (
                    <button
                        onClick={enableAudio}
                        className="w-full mb-3 py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-95 transition rounded-xl"
                    >
                      Enable Audio
                    </button>
                )}

                {audioHint && (
                    <p className="text-emerald-200/90 text-sm mb-3">{audioHint}</p>
                )}

                <input
                    className="w-full mb-4 px-4 py-3 bg-black/40 rounded"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <button
                    onClick={startLogin}
                    disabled={continueDisabled}
                    className={`w-full py-3 rounded-xl transition active:scale-95 ${
                        continueDisabled
                            ? "bg-gray-600/60 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                >
                  Continue
                </button>
              </>
          )}

          {locked && (
              <>
                <p className="text-red-300 mb-3">Account locked</p>
                <input
                    type="password"
                    placeholder="Recovery password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mb-3 px-4 py-2 bg-black/40 rounded"
                />
                <button
                    onClick={unlock}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition rounded-xl"
                >
                  Unlock
                </button>
              </>
          )}

          {preview && (
              <>
                <audio ref={audioRef} src={preview} playsInline />

                <p className="text-emerald-200 mb-2">
                  Song {progress} of {total}
                </p>

                <p className="text-red-300 mb-2">Time left: {timeLeft}s</p>

                <button
                    onClick={replay}
                    disabled={replays === 0}
                    className={`w-full mb-4 py-2 rounded-xl transition active:scale-95 ${
                        replays === 0
                            ? "bg-gray-600/60 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                >
                  Replay ({replays})
                </button>

                <button
                    onClick={notMySong}
                    className="w-full mb-3 py-2 bg-red-600 hover:bg-red-700 active:scale-95 transition rounded-xl"
                >
                  Not my song
                </button>

                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => submitGuess(opt.name)}
                        className="w-full mb-2 py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-95 transition rounded-xl"
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
