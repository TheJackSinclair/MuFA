export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const res = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(q)}`
    );

    const data = await res.json();

    return Response.json({
        tracks: data.data.slice(0, 5).map((t: any) => ({
            id: String(t.id),
            name: t.title,
            preview_url: t.preview,
        })),
    });
}
