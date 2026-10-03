const relationships={ '짝사랑':'crush', '썸':'flirting', '연인':'lover', '친구':'friend', '직장동료':'coworker' };
const ids=['dayMaster','dayBranch','usefulGodFit','elementComplementarity','heavenlyStemInteraction','earthlyBranchInteraction','specialStars','spouseStarRealization','luckCycleAlignment'];
export function basicInput(draft) {
  const person=value=>({displayName:value.name.trim(),gender:value.gender,calendarType:value.calendar,birthDate:value.date,
    birthTimeKnown:!value.unknownTime,birthTime:value.unknownTime?null:value.time,isLeapMonth:value.calendar==='lunar'&&value.leapMonth});
  return {relationshipType:relationships[draft.relationship],coworkerHierarchy:draft.relationship==='직장동료'?(draft.coworkerHierarchy||null):null,
    personA:person(draft.self),personB:person(draft.partner)};
}
export function validateBasicResult(result) {
  const score=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
  const validLabel=value=>typeof value==='string'&&value.length>0&&value.length<=80;
  const range=result?.scoreRange;
  const grade=result?.score>=90?'S':result?.score>=80?'A':result?.score>=70?'B':result?.score>=60?'C':result?.score>=50?'D':'E';
  const dimension=value=>ids.includes(value?.id)&&validLabel(value.label)&&score(value.score);
  const mentions=values=>Array.isArray(values)&&values.length<=3&&values.every(item=>ids.includes(item?.id)&&validLabel(item.label)&&result.dimensions.some(d=>d.id===item.id));
  if (result?.schemaVersion!=='toss-basic-v1'||!validLabel(result.engineVersion)||!validLabel(result.scoringVersion)
    ||!Object.values(relationships).includes(result.relationshipType)||!validLabel(result.relationshipLabel)
    ||!Array.isArray(result.names)||result.names.length!==2||!result.names.every(name=>validLabel(name)&&name.length<=20)
    ||!score(result.score)||result.score<30||result.grade!==grade||!score(range?.min)||!score(range?.max)
    ||range.min<30||range.min>result.score||range.max<result.score||typeof result.timeUnknown!=='boolean'
    ||!Array.isArray(result.dimensions)||result.dimensions.length<1||result.dimensions.length>9
    ||!result.dimensions.every(dimension)||new Set(result.dimensions.map(d=>d.id)).size!==result.dimensions.length
    ||!mentions(result.strengths)||!mentions(result.adjustments)) throw new Error('계산 결과를 확인하지 못했습니다. 다시 시도해 주세요.');
  return result;
}
export async function calculateBasic(session,draft,partnerConsent,signal) {
  if (!partnerConsent) throw new Error('상대 정보 사용에 대한 동의를 확인해 주세요.');
  const response=await session.request('/api/toss/compatibility',{method:'POST',signal,
    body:JSON.stringify({input:basicInput(draft),partnerConsent:true})});
  return validateBasicResult(response?.result);
}
