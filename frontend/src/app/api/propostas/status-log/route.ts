import { NextRequest, NextResponse } from "next/server";
import { getPropostaStatusLog } from "@/lib/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propostaId = searchParams.get("propostaId");

    if (!propostaId) {
      return NextResponse.json({ error: "propostaId e obrigatorio" }, { status: 400 });
    }

    const log = await getPropostaStatusLog(propostaId);
    return NextResponse.json({ log });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
