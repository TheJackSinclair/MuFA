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
  const [isDecoy, setIsDecoy] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function playClip() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setTimeout(() => audioRef.current?.pause(), 1000);
  }

  function startTimer() {
    setTimeLeft(5);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPreview(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function startLogin() {
    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();

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
    setIsDecoy(data.isDecoy);

    startTimer();
  }

  async function submitGuess(name: string) {
    if (timerRef.current) clearInterval(timerRef.current);

    const res = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
    setIsDecoy(data.isDecoy);

    startTimer();
  }

  async function notMySong() {
    const res = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
    setIsDecoy(data.isDecoy);

    startTimer();
  }

  function replay() {
    if (replays <= 0) return;
    playClip();
    setReplays((r) => r - 1);
  }

  useEffect(() => {
    if (preview) playClip();
  }, [preview]);

  return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1f3a30] via-[#2f5546] to-black px-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-2xl">
          <h1 className="text-3xl text-emerald-100 mb-6">MuFA</h1>

          {!preview && (
              <>
                <input
                    className="w-full mb-4 px-4 py-3 bg-black/40 rounded"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button onClick={startLogin} className="w-full py-3 bg-emerald-600 rounded">
                  Continue
                </button>
              </>
          )}

          {preview && (
              <>
                <audio ref={audioRef} src={preview} />

                <p className="text-emerald-200 mb-2">
                  Song {progress} of {total}
                </p>

                <p className="text-red-300 mb-2">Time left: {timeLeft}s</p>

                <button
                    onClick={replay}
                    disabled={replays === 0}
                    className="w-full mb-4 py-2 bg-emerald-600 rounded"
                >
                  Replay ({replays})
                </button>


                    <button
                        onClick={notMySong}
                        className="w-full mb-3 py-2 bg-red-600 rounded"
                    >
                      Not my song
                    </button>


                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => submitGuess(opt.name)}
                        className="w-full mb-2 py-2 bg-emerald-700 rounded"
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
