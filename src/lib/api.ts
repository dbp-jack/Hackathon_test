import { NextResponse } from "next/server";

export function apiError(status: number, error: string, message?: string, hint?: string) {
  return NextResponse.json({ error, message, hint }, { status });
}

export const LIMITS = {
  videoMaxSec: 600,
  videoMaxBytes: 2 * 1024 ** 3,
  photoMax: 20,
  titleMax: 140,
  tagsMax: 13,
} as const;
