import { NextRequest, NextResponse } from "next/server";
import { getStartupStatusLog } from "@/lib/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startupId = searchParams.get("startupId");

    if (!startupId) {
      return NextResponse.json({ error: "startupId e obrigatorio" }, { status: 400 });
    }

    const log = await getStartupStatusLog(startupId);
    return NextResponse.json({ log });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
