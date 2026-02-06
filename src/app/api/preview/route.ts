export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
        return new Response("Missing url", { status: 400 });
    }

    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
        headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
        },
    });
}
