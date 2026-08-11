const KASI_SOLAR_DAY_ENDPOINT =
  "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo";

export type KasiSolarDayRecord = {
  solYear: string;
  solMonth: string;
  solDay: string;
  lunYear: string;
  lunMonth: string;
  lunDay: string;
  lunLeapmonth: string;
  lunSecha: string;
  lunWolgeon: string;
  lunIljin: string;
  solJd: string;
};

function readTag(xml: string, tag: string) {
  const match = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i").exec(xml);
  return match?.[1]?.trim() ?? "";
}

function normalizeServiceKey(value: string) {
  const trimmed = value.trim();
  if (!/%[0-9a-f]{2}/i.test(trimmed)) return trimmed;

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeGatewayError(body: string) {
  const candidates = [
    readTag(body, "returnAuthMsg"),
    readTag(body, "resultMsg"),
    readTag(body, "resultMag"),
    readTag(body, "errMsg"),
    readTag(body, "cmmMsgHeader"),
  ].filter(Boolean);

  if (candidates.length > 0) return candidates.join(" / ");

  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300) || "응답 본문 없음";
}

async function fetchWithRetry(url: URL, solarDate: string) {
  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(url, {
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.warn(`KASI ${solarDate} 요청 ${attempt}/${maxAttempts} timeout/네트워크 오류 — 재시도합니다.`);
        await wait(1_500 * attempt);
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : "unknown network error";
  throw new Error(`KASI ${solarDate} 조회가 ${maxAttempts}회 모두 실패했습니다: ${reason}`);
}

/**
 * KASI OpenAPI는 우리궁합의 런타임 계산 엔진이 아니라 Day 5 검산용 oracle이다.
 *
 * 주의: KASI 응답의 lunSecha/lunWolgeon을 입춘·절기 기준 사주 연주/월주의
 * 직접 정답으로 취급하지 않는다. 공식 검산은 음양력 변환과 일진(lunIljin)을 중심으로 하고,
 * 연주/월주는 정밀 절입 시각 및 별도 경계 테스트로 검증한다.
 */
export async function fetchKasiSolarDay(solarDate: string): Promise<KasiSolarDayRecord> {
  const serviceKey = process.env.KASI_SERVICE_KEY;
  if (!serviceKey) throw new Error("KASI_SERVICE_KEY가 설정되지 않았습니다.");

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(solarDate);
  if (!match) throw new RangeError("KASI 조회 날짜는 YYYY-MM-DD 형식이어야 합니다.");

  const url = new URL(KASI_SOLAR_DAY_ENDPOINT);
  url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey));
  url.searchParams.set("solYear", match[1]);
  url.searchParams.set("solMonth", match[2]);
  url.searchParams.set("solDay", match[3]);

  const response = await fetchWithRetry(url, solarDate);
  const xml = await response.text();

  if (!response.ok) {
    throw new Error(
      `KASI ${solarDate} HTTP ${response.status}: ${summarizeGatewayError(xml)}`,
    );
  }

  if (readTag(xml, "resultCode") !== "00") {
    throw new Error(
      `KASI API 오류 (${solarDate}): ${summarizeGatewayError(xml)}`,
    );
  }

  const record: KasiSolarDayRecord = {
    solYear: readTag(xml, "solYear"),
    solMonth: readTag(xml, "solMonth"),
    solDay: readTag(xml, "solDay"),
    lunYear: readTag(xml, "lunYear"),
    lunMonth: readTag(xml, "lunMonth"),
    lunDay: readTag(xml, "lunDay"),
    lunLeapmonth: readTag(xml, "lunLeapmonth"),
    lunSecha: readTag(xml, "lunSecha"),
    lunWolgeon: readTag(xml, "lunWolgeon"),
    lunIljin: readTag(xml, "lunIljin"),
    solJd: readTag(xml, "solJd"),
  };

  if (!record.solYear || !record.lunIljin) {
    throw new Error(`KASI ${solarDate} 응답에서 필요한 날짜/일진 정보를 찾지 못했습니다.`);
  }
  return record;
}
