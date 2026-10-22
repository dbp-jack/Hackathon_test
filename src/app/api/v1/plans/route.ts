import { NextResponse } from "next/server";
import { PLANS } from "@/lib/types";
export function GET() { return NextResponse.json(PLANS); }
