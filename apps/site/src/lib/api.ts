import { NextResponse } from "next/server";

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
