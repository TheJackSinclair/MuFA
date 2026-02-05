import { redis } from "@/lib/redis";

type Track = {
    id: string;
    name: string;
    preview_url?: string;
};

type UserRecord = {
    songs: Track[];
    locked: boolean;
};

export async function POST(req: Request) {
    const body: {
        username: string;
        guess?: string;
        setupSongs?: Track[];
    } = await req.json();

    const { username, guess, setupSongs } = body;

    const userKey = `user:${username}`;
    const challengeKey = `challenge:${username}`;

    const user = await redis.get<UserRecord>(userKey);

    // ─── Setup new user ─────────────────────
    if (!user && setupSongs) {
        const newUser: UserRecord = {
            songs: setupSongs,
            locked: false,
        };

        await redis.set(userKey, newUser);
        return Response.json({ created: true });
    }

    // ─── User not found ─────────────────────
    if (!user) {
        return Response.json({ exists: false });
    }

    // ─── Locked account ─────────────────────
    if (user.locked) {
        return Response.json({ locked: true });
    }

    // ─── Start challenge ────────────────────
    if (!guess) {
        const song =
            user.songs[Math.floor(Math.random() * user.songs.length)];

        // optional: expire challenge after 30s
        await redis.set(challengeKey, song, { ex: 30 });

        return Response.json({
            exists: true,
            preview: song.preview_url,
        });
    }

    // ─── Verify guess ───────────────────────
    const challenge = await redis.get<Track>(challengeKey);

    if (
        challenge &&
        guess.trim().toLowerCase() ===
        challenge.name.trim().toLowerCase()
    ) {
        return Response.json({ success: true });
    }

    // Lock on failure
    await redis.set(userKey, { ...user, locked: true });

    return Response.json({ success: false });
}
