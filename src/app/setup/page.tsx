"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Track = {
    id: string;
    name: string;
    artist: string;
    preview_url?: string;
};

export default function SetupPage() {
    const username = useSearchParams().get("u");

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Track[]>([]);
    const [selected, setSelected] = useState<Track[]>([]);
    const [password, setPassword] = useState("");

    async function search() {
        const res = await fetch(`/api/music?q=${query}`);
        const data = await res.json();
        setResults(data.tracks);
    }

    function toggleSong(track: Track) {
        if (selected.find((s) => s.id === track.id)) {
            setSelected(selected.filter((s) => s.id !== track.id));
            return;
        }

        if (selected.length < 5) {
            setSelected([...selected, track]);
        }
    }

    async function finish() {
        if (selected.length !== 5 || !password) return;

        await fetch("/api/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                password,
                setupSongs: selected,
            }),
        });

        window.location.href = "/";
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1f3a30] via-[#2f5546] to-black px-4">
            <div className="w-full max-w-lg bg-white/10 backdrop-blur-xl p-8 rounded-2xl">
                <h1 className="text-2xl text-emerald-100 mb-4">Setup MuFA</h1>

                <div className="flex gap-2 mb-4">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 px-4 py-2 bg-black/40 rounded"
                        placeholder="Search songs"
                    />
                    <button onClick={search} className="px-4 bg-emerald-600 rounded">
                        Search
                    </button>
                </div>

                {/* SEARCH RESULTS */}
                <div className="grid grid-cols-1 gap-2 mb-4">
                    {results.map((track) => {
                        const isSelected = selected.find((s) => s.id === track.id);

                        return (
                            <button
                                key={track.id}
                                onClick={() => toggleSong(track)}
                                className={`text-left p-3 rounded-lg border transition
                ${
                                    isSelected
                                        ? "bg-emerald-700 border-emerald-400"
                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                }`}
                            >
                                <div className="text-sm font-medium">
                                    {track.name}
                                </div>
                                <div className="text-xs text-emerald-300">
                                    {track.artist}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* SELECTED SONGS */}
                <div className="mb-4">
                    <p className="text-emerald-300 text-sm mb-2">
                        Selected songs ({selected.length}/5)
                    </p>

                    <div className="space-y-2">
                        {selected.map((song) => (
                            <div
                                key={song.id}
                                className="flex justify-between bg-white/5 rounded px-3 py-2"
                            >
                <span>
                  {song.name} — {song.artist}
                </span>
                                <button
                                    onClick={() =>
                                        setSelected(selected.filter((s) => s.id !== song.id))
                                    }
                                    className="text-red-300"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PASSWORD REQUIRED */}
                <input
                    type="password"
                    placeholder="Recovery password (required)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mt-2 px-4 py-2 bg-black/40 rounded"
                />

                <button
                    disabled={selected.length !== 5 || !password}
                    onClick={finish}
                    className="w-full mt-4 py-3 bg-emerald-600 rounded disabled:opacity-40"
                >
                    Finish Setup
                </button>
            </div>
        </main>
    );
}
