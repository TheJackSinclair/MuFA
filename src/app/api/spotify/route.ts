import { getSpotifyToken } from "@/lib/spotify";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const token = await getSpotifyToken();

    const res = await fetch(
        `https://api.spotify.com/v1/search?q=${q}&type=track&limit=5`,
        {
            headers: {
                Authorization: `Bearer ${token.access_token}`
            }
        }
    );

    return Response.json(await res.json());
}
