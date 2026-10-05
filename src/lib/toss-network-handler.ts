import { NextRequest, NextResponse } from "next/server";
import { TossNetworkError, type createTossNetworkStore } from "./toss-network-core";

type Store=ReturnType<typeof createTossNetworkStore>;
const headers={"cache-control":"private, no-store","referrer-policy":"no-referrer"};
export function createTossNetworkHandler(deps:{
  authenticate:(request:NextRequest)=>Promise<{userId:string;provider?:string}|null>;
  allowedOrigin:(origin:string|null)=>boolean; enabled:()=>boolean; store:()=>Store;
}) {
  return async function POST(request:NextRequest) {
    if (!deps.allowedOrigin(request.headers.get("origin"))) return NextResponse.json({error:"invalid_origin"},{status:403,headers});
    const user=await deps.authenticate(request).catch(()=>null);
    if (!user || user.provider!=="toss") return NextResponse.json({error:"login_required"},{status:401,headers});
    if (!deps.enabled()) return NextResponse.json({error:"network_not_configured"},{status:503,headers});
    let body;
    try {
      const reader=request.body?.getReader();if (!reader) throw new Error("missing_body");
      try {
        let size=0;const chunks:Uint8Array[]=[];
        while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
          if(size>8192){await reader.cancel();throw new Error("body_limit");}chunks.push(value);}
        body=JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } finally {reader.releaseLock();}
    } catch {return NextResponse.json({error:"invalid_body"},{status:400,headers});}
    try {
      const store=deps.store();let response;
      switch(body?.action) {
        case "list":response={networks:await store.list(user.userId)};break;
        case "create":response=await store.create(user.userId,body.person,body.consent,body.requestId);break;
        case "join":response=await store.join(user.userId,body.invite,body.person,body.consent);break;
        case "view":response={network:await store.view(user.userId,body.networkId)};break;
        case "pair":response={result:(await store.pair(user.userId,body.networkId,body.memberAId,body.memberBId)).result};break;
        case "leave":response=await store.leave(user.userId,body.networkId);break;
        case "close":response=await store.close(user.userId,body.networkId);break;
        default:throw new TossNetworkError("invalid_action",400);
      }
      return NextResponse.json(response,{headers});
    } catch(error) {
      return NextResponse.json({error:error instanceof TossNetworkError?error.code:"network_unavailable"},
        {status:error instanceof TossNetworkError?error.status:503,headers});
    }
  };
}
