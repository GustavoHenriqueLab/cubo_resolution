import { NextResponse } from "next/server";
import { toggleFavorite, getStartupFavorites } from "@/lib/queries";

export async function POST(request: Request) {
  try {
    const { startupId } = (await request.json()) as { startupId?: string };
    if (!startupId) {
      return NextResponse.json({ error: "startupId e obrigatorio" }, { status: 400 });
    }

    const isFavorited = await toggleFavorite(startupId);
    const favorites = await getStartupFavorites();

    return NextResponse.json({
      favorited: isFavorited,
      favorites: Array.from(favorites),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao processar favorito" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const favorites = await getStartupFavorites();
    return NextResponse.json({ favorites: Array.from(favorites) });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar favoritos" }, { status: 500 });
  }
}
