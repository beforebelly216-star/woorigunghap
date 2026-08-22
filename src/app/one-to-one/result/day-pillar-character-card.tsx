import type { DayPillarCharacter } from "@/lib/narrative/day-pillar-characters";

type Props = {
  label: string;
  displayName: string;
  character: DayPillarCharacter;
};

export function DayPillarCharacterCard({ label, displayName, character }: Props) {
  return <article className="day-pillar-character-card">
    <div className="day-pillar-character-card__eyebrow">
      <span>60일주 캐릭터</span>
      <strong>{label}</strong>
    </div>
    <p className="day-pillar-character-card__name">{displayName}</p>
    <h3>{character.title}</h3>
    <p className="day-pillar-character-card__tagline">{character.tagline}</p>
    <div className="day-pillar-character-card__clues">
      <div><small>잘 쓰는 힘</small><p>{character.strengths[0]}</p></div>
      <div><small>관계 단서</small><p>{character.relationshipCue}</p></div>
    </div>
    <p className="day-pillar-character-card__watch"><strong>사주소년의 메모</strong>{character.watchOut}</p>
  </article>;
}
