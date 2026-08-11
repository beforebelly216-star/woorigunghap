import assert from "node:assert/strict";
import { solarToLunar } from "manseryeok";
import { calculateManseSnapshot } from "../src/lib/manseryeok/engine";
import { fetchKasiSolarDay } from "../src/lib/manseryeok/kasi";
import type { PersonBirthInput } from "../src/lib/report-input";

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

async function main() {
  if (!process.env.KASI_SERVICE_KEY) {
    console.log("[SKIP] KASI_SERVICE_KEY가 없어 공식 API 교차검증을 건너뜁니다.");
    return;
  }

  let passed = 0;
  for (const date of dates) {
    const [year, month, day] = date.split("-").map(Number);
    const input: PersonBirthInput = {
      displayName: "kasi-crosscheck",
      gender: "male",
      calendarType: "solar",
      birthDate: date,
      birthTimeKnown: true,
      birthTime: "12:00",
      isLeapMonth: false,
    };

    const [kasi, snapshot] = await Promise.all([
      fetchKasiSolarDay(date),
      Promise.resolve(calculateManseSnapshot(input)),
    ]);
    const lunar = solarToLunar(year, month, day);

    assert.equal(snapshot.pillars.day.korean, normalizeGanji(kasi.lunIljin), `${date} 일진 불일치`);
    assert.equal(lunar.year, Number(kasi.lunYear), `${date} 음력 연도 불일치`);
    assert.equal(lunar.month, Number(kasi.lunMonth), `${date} 음력 월 불일치`);
    assert.equal(lunar.day, Number(kasi.lunDay), `${date} 음력 일 불일치`);
    assert.equal(lunar.isLeapMonth, isLeapLabel(kasi.lunLeapmonth), `${date} 윤달 여부 불일치`);

    passed++;
    console.log(`✓ ${passed}/${dates.length} KASI ${date} — ${snapshot.pillars.day.korean}`);
  }

  console.log(`\nKASI 공식 API 교차검증: ${passed}/${dates.length} 통과`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
