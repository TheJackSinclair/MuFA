import { redis } from "@/lib/redis";

type Track = {
    id: string;
    name: string;
    artist: string;
    preview_url?: string;
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

async function getRandomDecoy(): Promise<Track> {
    const res = await fetch("https://api.deezer.com/search?q=top");
    const data = await res.json();
    const t = data.data[Math.floor(Math.random() * data.data.length)];

    return {
        id: String(t.id),
        name: t.title,
        artist: t.artist.name,
        preview_url: t.preview,
    };
}

async function getOptions(song: Track) {
    const res = await fetch("https://api.deezer.com/search?q=top");
    const data = await res.json();

    const decoys = data.data
        .filter((t: any) => t.title !== song.name)
        .slice(0, 4)
        .map((t: any) => ({
            id: String(t.id),
            name: t.title,
            artist: t.artist.name,
        }));

    return [...decoys, song].sort(() => Math.random() - 0.5);
}

export async function POST(req: Request) {
    if (!redis) return Response.json({}, { status: 500 });

    const body = await req.json();
    const { username, guess, setupSongs, password, notMine } = body;

    const userKey = `user:${username}`;
    const sessionKey = `session:${username}`;

    const user = await redis.get<UserRecord>(userKey);

    /* SETUP */
    if (!user && setupSongs) {
        await redis.set(userKey, {
            songs: setupSongs,
            password,
            locked: false,
        });
        return Response.json({ created: true });
    }

    if (!user) return Response.json({ exists: false });
    if (user.locked) return Response.json({ locked: true });

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

        const firstSong =
            session.index === session.decoyIndex
                ? await getRandomDecoy()
                : shuffled[0];

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
    if (!session) return Response.json({ error: "No session" });

    const totalSteps = session.songs.length + 1;
    const isDecoyStep = session.index === session.decoyIndex;

    /* HANDLE DECOY STEP */
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

    /* COMPLETE */
    if (session.index >= totalSteps) {
        await redis.del(sessionKey);
        return Response.json({ success: true });
    }

    /* NEXT STEP */
    const nextIsDecoy = session.index === session.decoyIndex;

    let nextSong: Track;

    if (nextIsDecoy) {
        nextSong = await getRandomDecoy();
    } else {
        const songIndex =
            session.index > session.decoyIndex
                ? session.index - 1
                : session.index;

        nextSong = session.songs[songIndex];
    }

    return Response.json({
        preview: nextSong.preview_url,
        options: await getOptions(nextSong),
        progress: session.index + 1,
        total: totalSteps,
        replays: 3,
    });
}
