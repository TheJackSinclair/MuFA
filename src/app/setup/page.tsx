"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

/* ───────────────────────────
   Types
─────────────────────────── */

type Track = {
    id: string;
    name: string;
    preview_url?: string;
};

/* ───────────────────────────
   Inner component (uses useSearchParams)
─────────────────────────── */

function SetupInner() {
    const params = useSearchParams();
    const username = params.get("u");

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Track[]>([]);
    const [selected, setSelected] = useState<Track[]>([]);
    const [status, setStatus] = useState("");

    async function search() {
        if (!query.trim()) return;

        const res = await fetch(`/api/spotify?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        setResults(data.tracks?.items ?? []);
    }

    async function finishSetup() {
        setStatus("Saving security songs…");

        await fetch("/api/user", {
            method: "POST",
            body: JSON.stringify({
                username,
                setupSongs: selected.map((t) => ({
                    id: t.id,
                    name: t.name,
                    preview_url: t.preview_url,
                })),
            }),
        });

        window.location.href = "/";
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1f3a30] via-[#2f5546] to-black px-4">
            <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
                <h1 className="text-2xl font-semibold text-emerald-100 mb-1">
                    Set up MuFA
                </h1>
                <p className="text-sm text-emerald-300 mb-6">
                    Choose 5 songs only you would recognize
                </p>

                <div className="flex gap-2 mb-6">
                    <input
                        className="flex-1 px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Search for a song"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        onClick={search}
                        className="px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition"
                    >
                        Search
                    </button>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto mb-6">
                    {results.map((track) => {
                        const added = selected.some((s) => s.id === track.id);

                        return (
                            <div
                                key={track.id}
                                className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                            >
                <span className="text-sm text-emerald-100 truncate">
                  {track.name}
                </span>
                                <button
                                    disabled={added || selected.length === 5}
                                    onClick={() => setSelected([...selected, track])}
                                    className="text-xs px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40"
                                >
                                    {added ? "Added" : "Add"}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-sm text-emerald-300">
                        {selected.length} / 5 selected
                    </p>

                    {selected.length === 5 && (
                        <button
                            onClick={finishSetup}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition"
                        >
                            Finish
                        </button>
                    )}
                </div>

                {status && (
                    <p className="mt-4 text-sm text-emerald-200 text-center">
                        {status}
                    </p>
                )}
            </div>
        </main>
    );
}

/* ───────────────────────────
   Suspense wrapper (required)
─────────────────────────── */

export default function SetupPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1f3a30] via-[#2f5546] to-black">
                    <div className="text-emerald-200 text-sm">
                        Loading setup…
                    </div>
                </main>
            }
        >
            <SetupInner />
        </Suspense>
    );
}
