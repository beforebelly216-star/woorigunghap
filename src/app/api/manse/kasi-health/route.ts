import assert from "node:assert/strict";
import { NextResponse } from "next/server";
import { solarToLunar } from "manseryeok";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";
import { fetchKasiSolarDay } from "@/lib/manseryeok/kasi";
import type { PersonBirthInput } from "@/lib/report-input";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const dates = [
  "2024-01-01",
  "2023-05-20",
  "2020-05-23",
  "2000-06-10",
  "1997-02-08",
  "1992-10-24",
  "1984-06-15",
  "1960-03-15",
  "1948-05-01",
  "1936-08-25",
] as const;

function normalizeGanji(value: string) {
  const match = value.match(/[갑을병정무기경신임계][자축인묘진사오미신유술해]/);
  if (!match) throw new Error(`KASI 일진 형식을 해석할 수 없습니다: ${value}`);
  return match[0];
}

function isLeapLabel(value: string) {
  return value.includes("윤");
}

export async function GET() {
  if (!process.env.KASI_SERVICE_KEY) {
    return NextResponse.json(
      { ok: false, error: "KASI_SERVICE_KEY is not configured", region: process.env.VERCEL_REGION ?? null },
      { status: 503 },
    );
  }

  const results: Array<{ date: string; ok: boolean; dayPillar?: string; error?: string }> = [];

  for (const date of dates) {
    try {
      const [year, month, day] = date.split("-").map(Number);
      const person: PersonBirthInput = {
        displayName: "kasi-health",
        gender: "male",
        calendarType: "solar",
        birthDate: date,
        birthTimeKnown: true,
        birthTime: "12:00",
        isLeapMonth: false,
      };

      const kasi = await fetchKasiSolarDay(date);
      const snapshot = calculateManseSnapshot(person);
      const lunar = solarToLunar(year, month, day);

      assert.equal(snapshot.pillars.day.korean, normalizeGanji(kasi.lunIljin));
      assert.equal(lunar.year, Number(kasi.lunYear));
      assert.equal(lunar.month, Number(kasi.lunMonth));
      assert.equal(lunar.day, Number(kasi.lunDay));
      assert.equal(lunar.isLeapMonth, isLeapLabel(kasi.lunLeapmonth));

      results.push({ date, ok: true, dayPillar: snapshot.pillars.day.korean });
    } catch (error) {
      results.push({
        date,
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      });
      break;
    }
  }

  const passed = results.filter((result) => result.ok).length;
  const ok = passed === dates.length;

  return NextResponse.json(
    {
      ok,
      passed,
      total: dates.length,
      region: process.env.VERCEL_REGION ?? null,
      results,
    },
    { status: ok ? 200 : 500 },
  );
}
