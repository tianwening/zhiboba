import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db";

const SELECT_FIELDS = `
  id,
  category,
  title,
  source,
  published_label as "time",
  heat,
  description as "desc",
  appointment_status as "appointmentStatus",
  appointment_note as "appointmentNote",
  appointment_at as "appointmentAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const ALLOWED_CATEGORIES = new Set([
  "football",
  "basketball",
  "esports",
  "tennis",
  "general",
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      select ${SELECT_FIELDS}
      from public.sports_news_appointments
      order by heat desc, id asc
    `);

    return NextResponse.json({ appointments: rows });
  } catch {
    return NextResponse.json(
      { error: "Unable to load appointments." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const pool = getPool();
    const body = await request.json();

    const category = String(body.category ?? "").trim();
    const title = String(body.title ?? "").trim();
    const source = String(body.source ?? "").trim();
    const time = String(body.time ?? body.published_label ?? "").trim();
    const desc = String(body.desc ?? body.description ?? "").trim();
    const heat = Number.isFinite(Number(body.heat)) ? Number(body.heat) : 0;
    const appointmentStatus = String(body.appointmentStatus ?? "available").trim();
    const appointmentNote = body.appointmentNote ? String(body.appointmentNote).trim() : null;
    const appointmentAt = body.appointmentAt ? new Date(body.appointmentAt) : null;

    if (!ALLOWED_CATEGORIES.has(category) || !title || !source || !time || !desc) {
      return NextResponse.json(
        { error: "category, title, source, time, and desc are required." },
        { status: 400 },
      );
    }

    if (!["available", "reserved", "cancelled"].includes(appointmentStatus)) {
      return NextResponse.json(
        { error: "appointmentStatus must be available, reserved, or cancelled." },
        { status: 400 },
      );
    }

    if (appointmentAt && Number.isNaN(appointmentAt.getTime())) {
      return NextResponse.json(
        { error: "appointmentAt must be a valid date string." },
        { status: 400 },
      );
    }

    const { rows } = await pool.query(
      `
        insert into public.sports_news_appointments
          (category, title, source, published_label, heat, description, appointment_status, appointment_note, appointment_at)
        values
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning ${SELECT_FIELDS}
      `,
      [
        category,
        title,
        source,
        time,
        Math.max(0, Math.trunc(heat)),
        desc,
        appointmentStatus,
        appointmentNote,
        appointmentAt,
      ],
    );

    return NextResponse.json({ appointment: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to save appointment." },
      { status: 500 },
    );
  }
}
