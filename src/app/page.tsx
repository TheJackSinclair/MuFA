"use client";

import { useEffect, useRef, useState } from "react";

export default function Page() {
  const [username, setUsername] = useState("");
  const [guess, setGuess] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  async function handleUsernameSubmit() {
    const res = await fetch("/api/user", {
      method: "POST",
      body: JSON.stringify({ username }),
    });

    const data = await res.json();

    if (data.exists) {
      setPreview(data.preview);
      setStatus("Identify the song");
    } else {
      window.location.href = `/setup?u=${username}`;
    }
  }

  async function handleGuessSubmit() {
    const res = await fetch("/api/user", {
      method: "POST",
      body: JSON.stringify({ username, guess }),
    });

    const data = await res.json();
    setStatus(data.success ? "Access granted" : "Account locked");
  }

  useEffect(() => {
    if (!preview || !audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play();

    const stop = setTimeout(() => {
      audioRef.current?.pause();
    }, 1000);

    return () => clearTimeout(stop);
  }, [preview]);

  return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1f3a30] via-[#2f5546] to-black px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
          <h1 className="text-3xl font-semibold text-emerald-100 mb-1">
            MuFA
          </h1>
          <p className="text-sm text-emerald-300 mb-8">
            Music-Factor Authentication
          </p>

          {!preview && (
              <>
                <label className="block text-sm text-emerald-200 mb-2">
                  Username
                </label>
                <input
                    className="w-full mb-6 px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <button
                    onClick={handleUsernameSubmit}
                    className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition font-medium"
                >
                  Continue
                </button>
              </>
          )}

          {preview && (
              <>
                <audio ref={audioRef} src={preview} />

                <label className="block text-sm text-emerald-200 mb-2">
                  Song title
                </label>
                <input
                    className="w-full mb-6 px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="What song did you hear?"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                />

                <button
                    onClick={handleGuessSubmit}
                    className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition font-medium"
                >
                  Verify
                </button>
              </>
          )}

          {status && (
              <p className="mt-6 text-center text-sm text-emerald-200">
                {status}
              </p>
          )}
        </div>
      </main>
  );
}
