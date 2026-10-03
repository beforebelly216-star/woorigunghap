import { NextRequest, NextResponse } from "next/server";
import { calculateTossBasicResult, TossBasicInputError } from "@/lib/toss-basic-result";

const headers={"cache-control":"private, no-store"};
async function readInput(request: NextRequest) {
  const reader=request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  const chunks: Uint8Array[]=[]; let length=0;
  try {
    while (true) {
      const {done,value}=await reader.read(); if (done) break;
      length+=value.byteLength;
      if (length>16384) { await reader.cancel(); throw new Error("body_too_large"); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}
export function createTossBasicHandler(deps: {
  authenticate:(request:NextRequest)=>Promise<{provider?:string}|null>;
  allowedOrigin:(origin:string|null)=>boolean;
  enabled:()=>boolean;
}) { return async function POST(request: NextRequest) {
  if (!deps.allowedOrigin(request.headers.get("origin"))) return NextResponse.json({error:"invalid_origin"},{status:403,headers});
  const user=await deps.authenticate(request).catch(()=>null);
  if (!user || user.provider!=="toss") return NextResponse.json({error:"login_required"},{status:401,headers});
  if (!deps.enabled()) return NextResponse.json({error:"calculation_not_configured"},{status:503,headers});
  let body;
  try { body=await readInput(request); }
  catch { return NextResponse.json({error:"invalid_body"},{status:400,headers}); }
  if (body?.partnerConsent!==true) return NextResponse.json({error:"partner_consent_required",fieldErrors:{partnerConsent:"상대 정보 사용에 대한 동의를 확인해 주세요."}},{status:400,headers});
  try { return NextResponse.json({result:calculateTossBasicResult(body.input)},{headers}); }
  catch(error) {
    return NextResponse.json({error:"invalid_calculation",fieldErrors:error instanceof TossBasicInputError?error.fieldErrors:{input:"생년정보와 달력·윤달·출생시간을 다시 확인해 주세요."}},{status:400,headers});
  }
}; }
