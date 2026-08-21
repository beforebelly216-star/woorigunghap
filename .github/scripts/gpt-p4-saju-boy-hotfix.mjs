import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const oldVersion = 'paid-report-v7-editorial-v12-persona-inner-mind';
const newVersion = 'paid-report-v7-editorial-v13-saju-boy-magic-school';
const read = (p) => readFileSync(p, 'utf8');
const write = (p, s) => writeFileSync(p, s.endsWith('\n') ? s : s + '\n');
const req = (s, a, b, label) => { if (!s.includes(a)) throw new Error('missing: ' + label); return s.replace(a,b); };
const walk = (d) => readdirSync(d).flatMap(n => { const p=join(d,n); return statSync(p).isDirectory()?walk(p):[p]; });

{
  const p='src/lib/narrative/report-engine-v7.ts';
  let s=read(p).replaceAll(oldVersion,newVersion);
  s=req(s,
`  "당신은 '우리사주'에서 사주를 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구처럼 말하는 한국어 해설자입니다.",
  "목소리는 관계 해설자가 중심이고, 친한 친구가 옆에서 핵심을 짚어 주는 친근함을 더하며, 명리 전문가는 필요한 근거를 짧고 정확하게 설명하는 정도로만 드러내세요. 도사체·점집체·논문체·상담 기록체는 피하세요.",`,
`  "당신은 '우리사주'의 화자 캐릭터 '사주소년'입니다. 오래된 마법학교 도서관에서 사람 사이의 기운과 관계의 단서를 발견해 들려주는 호기심 많은 소년 탐험가처럼 말하세요.",
  "분위기는 신비롭고 장난기와 발견의 설렘이 있지만, 특정 소설·영화의 인물·학교·주문·고유명사·대사를 흉내 내거나 인용하지 마세요. 우리사주만의 독립적인 현대 한국어 판타지 화자여야 합니다.",
  "사주소년은 어려운 명리 용어를 먼저 늘어놓지 않습니다. '여기 이상한 단서가 하나 보여요', '이 관계의 마법이 잘 걸리는 순간은 여기예요', '반대로 이 장면에서는 기운이 꼬여요'처럼 발견→현실 장면→사주 근거 순서로 설명하세요.",
  "말투는 소년다운 호기심 40%, 관계를 잘 읽는 영리함 40%, 명리 해설 20% 정도입니다. 유치한 아동체, 과한 역할극, 도사체·점집체·논문체·상담 기록체는 피하세요.",`,
'persona rules');
  s=req(s,
`  "재미를 위해 핵심을 숨기지 마세요. '이건 꽤 잘 맞아요', '여기서 자주 꼬입니다', '상대는 이 장면에서 속도가 느려집니다'처럼 관계 결론을 또렷하게 말하되, 근거 없는 운명론·공포 조장·희망고문은 만들지 마세요.",`,
`  "재미를 위해 핵심을 숨기지 마세요. 사주소년이 단서를 발견해 알려주듯 결론을 또렷하게 말하되, 판타지 비유는 문단마다 남발하지 말고 핵심 장면에만 짧게 사용하세요. 근거 없는 운명론·공포 조장·희망고문은 만들지 마세요.",`,
'fun rule');
  write(p,s);
}

for (const p of walk('scripts').filter(p=>p.endsWith('.ts'))) {
  const s=read(p); const n=s.replaceAll(oldVersion,newVersion); if(n!==s) write(p,n);
}

{
 const p='scripts/report-persona-hero-contract-test.ts'; let s=read(p);
 s=s.replace(/assert\.match\(engine, \/사주를 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구\/\);\n/,`assert.match(engine, /화자 캐릭터 '사주소년'/);\nassert.match(engine, /마법학교 도서관/);\nassert.match(engine, /특정 소설·영화의 인물·학교·주문·고유명사·대사를 흉내 내거나 인용하지 마세요/);\nassert.match(engine, /소년다운 호기심 40%/);\n`);
 s=s.replace(/assert\.match\(engine, \/도사체·점집체·논문체·상담 기록체는 피하세요\/\);\n/,`assert.match(engine, /유치한 아동체, 과한 역할극, 도사체·점집체·논문체·상담 기록체는 피하세요/);\n`);
 write(p,s);
}

{
 const p='docs/PROJECT_STATE.md'; let s=read(p).replaceAll(oldVersion,newVersion);
 s=req(s,
`- 유료 1:1 화자를 **사주를 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구**로 고정했다. 관계 해설이 중심이고 친한 친구의 직관적 말투를 더하되, 명리 전문가는 필요한 계산 근거를 짧게 설명하는 역할만 맡는다.`,
`- 유료 1:1 화자를 **사주소년**으로 교정했다. 오래된 마법학교 도서관에서 관계의 단서를 찾아내는 소년 탐험가 같은 신비감·호기심을 기본으로 하되, 특정 작품의 고유명사·인물·주문·대사는 모사하지 않는 우리사주 독자 캐릭터다.\n- 화자 비중은 소년다운 호기심 40% + 관계를 읽는 영리함 40% + 명리 해설 20% 정도로 두고, 판타지 비유는 핵심 장면에만 짧게 쓴다.`,
'project persona');
 write(p,s);
}

{
 const p='docs/DECISIONS.md'; let s=read(p);
 s=req(s,
`- 유료 1:1의 기본 화자는 **사주를 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구**다. 관계 해설자 중심 + 친한 친구의 직관적 친근함 + 필요한 만큼의 명리 근거를 조합하고, 도사체·점집체·논문체는 피한다.`,
`- 유료 1:1의 기본 화자는 **사주소년**이다. 마법학교의 어린 탐험가처럼 관계의 단서를 발견해 들려주는 신비감과 호기심을 주되, 특정 기존 작품의 인물·학교·주문·고유명사·대사나 문체를 직접 모사하지 않는 독립 캐릭터로 운영한다. 소년다운 호기심 40% + 관계를 읽는 영리함 40% + 명리 해설 20%를 기본 비중으로 한다.`,
'decision persona');
 write(p,s);
}

{
 const p='docs/NEXT_TASK.md'; let s=read(p);
 s=s.replace(`  - [x] P4-1: 유료 1:1 화자를 '사주 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구'로 고정하고 관계 유형별 미세 톤 적용.`, `  - [x] P4-1 hotfix: 유료 1:1 화자를 '사주소년'으로 교정. 마법학교 소년 탐험가의 신비감/호기심을 쓰되 특정 작품 요소는 직접 모사하지 않고 관계 유형별 미세 톤을 유지.`);
 s=s.replace(/## Current HANDOFF[\s\S]*$/,`## Current HANDOFF\n\n\`\`\`text\nHANDOFF\n- Worker: GPT\n- Task: P4-1 hotfix — 화자 페르소나를 '사주소년' 마법학교 탐험가 감성으로 교정\n- Status: complete\n- Validation: test:report:persona + 기존 P1~P4 회귀 + Core validation + lint + production build\n- Commit: clean PR 검증 후 main squash merge SHA 기준\n- Remaining: P4-2 궁합 유형/공유 카드 → P4-3 60일주 캐릭터; 1:N 서술 개선은 hotfix 후속 유지\n- Risk: 특정 작품 고유명사/인물/주문/대사 직접 모사 금지; 계산·결제·저장 구조 변경 없음\n\`\`\`\n`);
 write(p,s);
}
console.log('saju-boy persona hotfix applied');
