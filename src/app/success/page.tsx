"use client";

export default function SuccessPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1f3a30] via-[#2f5546] to-black px-4">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-10 rounded-2xl shadow-2xl text-center">
                <div className="text-5xl mb-4">🎧</div>

                <h1 className="text-3xl font-semibold text-emerald-100 mb-3">
                    Authentication Successful
                </h1>

                <p className="text-emerald-300 mb-6">
                    Your musical identity has been verified.
                </p>

                <div className="h-1 w-full bg-white/10 rounded overflow-hidden mb-6">
                    <div className="h-full bg-emerald-500 animate-pulse w-full"></div>
                </div>

                <button
                    onClick={() => (window.location.href = "/")}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 transition rounded-lg"
                >
                    Return Home
                </button>
            </div>
        </main>
    );
}
