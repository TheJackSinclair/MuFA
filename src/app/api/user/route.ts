import { redis } from "@/lib/redis";

type Track = {
    id: string;
    name: string;
    artist: string;
};

type TrackWithPreview = Track & {
    preview_url: string;
};

type UserRecord = {
    songs: Track[];
    password: string;
    locked: boolean;
};

type Session = {
    index: number;
    songs: Track[];
    replays: number;
    decoyIndex: number;
};

const previewCache = new Map<
    string,
    { url: string; expires: number }
>();

const PREVIEW_TTL = 5 * 60 * 1000;

async function attachPreview(song: Track): Promise<TrackWithPreview> {
    const cached = previewCache.get(song.id);

    if (cached && cached.expires > Date.now()) {
        return {
            ...song,
            preview_url: cached.url,
        };
    }

    const res = await fetch(`https://api.deezer.com/track/${song.id}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch track ${song.id}`);
    }

    const data = await res.json();

    if (!data?.preview) {
        throw new Error(`No preview found for track ${song.id}`);
    }

    previewCache.set(song.id, {
        url: data.preview,
        expires: Date.now() + PREVIEW_TTL,
    });

    return {
        ...song,
        preview_url: data.preview,
    };
}

async function getRandomDecoy(): Promise<TrackWithPreview> {
    const offset = Math.floor(Math.random() * 300);

    const res = await fetch(
        `https://api.deezer.com/search?q=track&index=${offset}&limit=25`,
        { cache: "no-store" }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch decoy tracks");
    }

    const data = await res.json();

    const pool = (data.data ?? []).filter((t: any) => t.preview);

    if (!pool.length) {
        throw new Error("No decoy tracks with previews found");
    }

    const t = pool[Math.floor(Math.random() * pool.length)];

    return {
        id: String(t.id),
        name: t.title,
        artist: t.artist.name,
        preview_url: t.preview,
    };
}

async function getOptions(song: Track) {
    const offset = Math.floor(Math.random() * 300);

    const res = await fetch(
        `https://api.deezer.com/search?q=track&index=${offset}&limit=30`,
        { cache: "no-store" }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch options");
    }

    const data = await res.json();

    const decoys = (data.data ?? [])
        .filter((t: any) => t.preview && t.title !== song.name)
        .slice(0, 4)
        .map((t: any) => ({
            id: String(t.id),
            name: t.title,
            artist: t.artist.name,
        }));

    return [...decoys, song].sort(() => Math.random() - 0.5);
}

export async function POST(req: Request) {
    try {
        if (!redis) {
            return Response.json({ error: "Redis not configured" }, { status: 500 });
        }

        const body = await req.json();
        const { username, guess, setupSongs, password, notMine } = body;

        const userKey = `user:${username}`;
        const sessionKey = `session:${username}`;

        const user = await redis.get<UserRecord>(userKey);

        /* SETUP */
        if (!user && setupSongs) {
            await redis.set(userKey, {
                songs: setupSongs.map((s: any) => ({
                    id: String(s.id),
                    name: s.name,
                    artist: s.artist,
                })),
                password,
                locked: false,
            });

            return Response.json({ created: true });
        }

        if (!user) {
            return Response.json({ exists: false });
        }

        /* LOCKED ACCOUNT */
        if (user.locked && !password) {
            return Response.json({ exists: true, locked: true });
        }

        /* PASSWORD UNLOCK */
        if (user.locked && password === user.password) {
            await redis.set(userKey, { ...user, locked: false });
            return Response.json({ unlocked: true });
        }

        /* START SESSION */
        if (!guess && !notMine) {
            const shuffled = [...user.songs].sort(() => Math.random() - 0.5);

            const totalSteps = shuffled.length + 1;
            const decoyIndex = Math.floor(Math.random() * totalSteps);

            const session: Session = {
                index: 0,
                songs: shuffled,
                replays: 3,
                decoyIndex,
            };

            await redis.set(sessionKey, session);

            const firstSong: TrackWithPreview =
                session.index === session.decoyIndex
                    ? await getRandomDecoy()
                    : await attachPreview(shuffled[0]);

            return Response.json({
                exists: true,
                preview: firstSong.preview_url,
                options: await getOptions(firstSong),
                progress: 1,
                total: totalSteps,
                replays: 3,
            });
        }

        const session = await redis.get<Session>(sessionKey);
        if (!session) {
            return Response.json({ error: "No session" }, { status: 400 });
        }

        const totalSteps = session.songs.length + 1;
        const isDecoyStep = session.index === session.decoyIndex;

        if (isDecoyStep) {
            if (!notMine) {
                await redis.set(userKey, { ...user, locked: true });
                return Response.json({ success: false });
            }

            session.index++;
            await redis.set(sessionKey, session);
        } else {
            const songIndex =
                session.index > session.decoyIndex
                    ? session.index - 1
                    : session.index;

            const currentSong = session.songs[songIndex];

            if (guess !== currentSong.name) {
                await redis.set(userKey, { ...user, locked: true });
                return Response.json({ success: false });
            }

            session.index++;
            await redis.set(sessionKey, session);
        }

        if (session.index >= totalSteps) {
            await redis.del(sessionKey);
            return Response.json({ success: true });
        }

        const nextIsDecoy = session.index === session.decoyIndex;

        let nextSong: TrackWithPreview;

        if (nextIsDecoy) {
            nextSong = await getRandomDecoy();
        } else {
            const songIndex =
                session.index > session.decoyIndex
                    ? session.index - 1
                    : session.index;

            nextSong = await attachPreview(session.songs[songIndex]);
        }

        return Response.json({
            preview: nextSong.preview_url,
            options: await getOptions(nextSong),
            progress: session.index + 1,
            total: totalSteps,
            replays: 3,
        });
    } catch (error) {
        console.error(error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
