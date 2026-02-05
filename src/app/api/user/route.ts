import { redis } from "@/lib/redis";

/* ───────────────────────────
   Domain Types
─────────────────────────── */

type Track = {
    id: string;
    name: string;
    preview_url?: string;
};

type UserRecord = {
    songs: Track[];
    locked: boolean;
};

/* ───────────────────────────
   POST /api/user
─────────────────────────── */

export async function POST(req: Request) {
    // ── Safety guard for local builds ──
    if (!redis) {
        return Response.json(
            { error: "Redis not configured" },
            { status: 500 }
        );
    }

    const body: {
        username: string;
        guess?: string;
        setupSongs?: Track[];
    } = await req.json();

    const { username, guess, setupSongs } = body;

    const userKey = `user:${username}`;
    const challengeKey = `challenge:${username}`;

    /* ───────────────────────────
       New user setup
    ──────────────────────────── */
    const existingUser = await redis.get<UserRecord>(userKey);

    if (!existingUser && setupSongs) {
        const newUser: UserRecord = {
            songs: setupSongs,
            locked: false,
        };

        await redis.set(userKey, newUser);

        return Response.json({ created: true });
    }

    /* ───────────────────────────
       User does not exist
    ──────────────────────────── */
    if (!existingUser) {
        return Response.json({ exists: false });
    }

    /* ───────────────────────────
       Locked account
    ──────────────────────────── */
    if (existingUser.locked) {
        return Response.json({ locked: true });
    }

    /* ───────────────────────────
       Start login challenge
    ──────────────────────────── */
    if (!guess) {
        const song =
            existingUser.songs[
                Math.floor(Math.random() * existingUser.songs.length)
                ];

        // Store challenge with TTL (30s)
        await redis.set(challengeKey, song, { ex: 30 });

        return Response.json({
            exists: true,
            preview: song.preview_url,
        });
    }

    /* ───────────────────────────
       Verify guess
    ──────────────────────────── */
    const challenge = await redis.get<Track>(challengeKey);

    if (
        challenge &&
        guess.trim().toLowerCase() ===
        challenge.name.trim().toLowerCase()
    ) {
        return Response.json({ success: true });
    }

    /* ───────────────────────────
       Lock account on failure
    ──────────────────────────── */
    await redis.set(userKey, {
        ...existingUser,
        locked: true,
    });

    return Response.json({ success: false });
}
