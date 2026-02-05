import { kv } from "@vercel/kv";

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

    const user = await kv.get<UserRecord>(userKey);

    // ─────────────────────────────────────
    // NEW USER SETUP
    // ─────────────────────────────────────
    if (!user && setupSongs) {
        const newUser: UserRecord = {
            songs: setupSongs,
            locked: false,
        };

        await kv.set(userKey, newUser);
        return Response.json({ created: true });
    }

    // ─────────────────────────────────────
    // USER DOES NOT EXIST
    // ─────────────────────────────────────
    if (!user) {
        return Response.json({ exists: false });
    }

    // ─────────────────────────────────────
    // ACCOUNT LOCKED
    // ─────────────────────────────────────
    if (user.locked) {
        return Response.json({ locked: true });
    }

    // ─────────────────────────────────────
    // START LOGIN CHALLENGE
    // ─────────────────────────────────────
    if (!guess) {
        const song =
            user.songs[Math.floor(Math.random() * user.songs.length)];

        await kv.set(challengeKey, song);

        return Response.json({
            exists: true,
            preview: song.preview_url,
        });
    }

    // ─────────────────────────────────────
    // VERIFY GUESS
    // ─────────────────────────────────────
    const challenge = await kv.get<Track>(challengeKey);

    if (
        challenge &&
        guess.trim().toLowerCase() ===
        challenge.name.trim().toLowerCase()
    ) {
        return Response.json({ success: true });
    }

    // Lock account on failure
    await kv.set(userKey, { ...user, locked: true });

    return Response.json({ success: false });
}
