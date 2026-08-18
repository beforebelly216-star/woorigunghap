<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 우리궁합 공통 AI 작업 규칙

이 파일은 GPT/Codex와 Claude가 함께 따르는 저장소 최상위 규칙이다. 채팅 기록이 아니라 GitHub `main`을 작업 상태의 단일 진실 공급원으로 사용한다.

## 작업 시작 절차

작업 전에 반드시 다음 순서로 확인한다.

1. 최신 `main` 확인
   - 로컬 git 사용 가능 시: `git fetch origin main && git status && git pull --ff-only origin main`
   - 로컬 git이 없으면 GitHub의 default branch 최신 커밋을 직접 확인한다.
   - 미커밋 로컬 변경이 있으면 덮어쓰거나 삭제하지 않는다.
2. 이 `AGENTS.md` 전체 읽기
3. `docs/PROJECT_STATE.md` 읽기
4. `docs/NEXT_TASK.md` 읽기
5. `docs/DECISIONS.md` 읽기
6. 변경 대상과 직접 관련된 `docs/*.md`, 테스트, 기존 구현을 읽기
7. `NEXT_TASK.md`의 최상단 미완료 우선순위를 선택하되, 최신 사용자 지시가 있으면 사용자 지시를 우선한다.

## 작업 원칙

- 이전 GPT/Claude 대화를 알고 있다고 가정하지 않는다.
- 기존 완료 기능을 취향이나 리팩터링 욕구만으로 다시 작성하지 않는다.
- Day 24 이후에는 `blocker > hotfix > improvement` 순서를 따른다.
- 유료 결제, 결과 보존, 권한, 개인정보, AI 중복 비용 관련 회귀를 최우선으로 막는다.
- 1:1과 1:N 상품을 모두 유지한다.
- 계산 결과는 서버 결정론 로직이 권위 데이터이며 AI는 서술만 담당한다.
- 이름/원본 생년월일시/비밀값을 외부 AI에 새로 노출하지 않는다.
- 비밀값을 코드, 로그, 문서, GitHub에 커밋하지 않는다.
- Vercel Hobby build rate limit은 코드 실패로 취급하지 않는다.
- 같은 파일을 GPT와 Claude가 동시에 편집하는 병렬 작업을 피한다.

## 변경/검증 절차

1. 관련 구현과 계약 테스트를 먼저 읽는다.
2. 필요한 최소 범위로 수정한다.
3. 변경 범위에 맞는 테스트를 실행한다.
4. 병합/배포 가능 변경이면 최소 `npm run lint`와 `npm run build`를 확인한다. 환경 제약으로 실행 불가하면 그 사실을 HANDOFF에 명시한다.
5. 기존 핵심 플로우를 깨뜨리지 않았는지 확인한다.
6. 커밋 메시지는 `feat:`, `fix:`, `test:`, `docs:`, `chore:` 등 명확한 prefix를 사용한다.
7. 가능하면 `main` 최신 상태에 반영한다. 충돌 시 임의 덮어쓰기보다 최신 상태를 다시 읽고 병합한다.

## 작업 종료 절차

의미 있는 작업을 마치기 전에 반드시 다음을 수행한다.

1. `docs/NEXT_TASK.md`에서 완료 항목을 체크하거나 정확한 중단 지점을 기록한다.
2. 프로젝트의 중요 상태가 바뀌면 `docs/PROJECT_STATE.md`를 갱신한다.
3. 새로운 장기 결정이 생기면 `docs/DECISIONS.md`를 갱신한다.
4. `NEXT_TASK.md`의 `Current HANDOFF`를 최대 8줄로 갱신한다.
5. 테스트 결과와 커밋 SHA를 남긴다.
6. 다음 작업자가 바로 시작할 수 있도록 `Remaining`을 구체적으로 작성한다.

## 절대 하지 말 것

- 채팅 문맥만 믿고 GitHub 상태 확인 없이 작업 시작
- 완료 여부를 코드/테스트 없이 추측
- 사용자 승인 없이 1:N 제거, 가격 변경, 관계 유형 축소
- 이미 저장된 유료 결과를 새 AI 출력으로 자동 덮어쓰기
- 결제 검증 전에 AI 유료 생성
- 보안/권한 회귀를 문체 개선보다 후순위로 미루기
- Vercel 배포 제한을 이유로 정상 기능 revert

## 빠른 인수 프롬프트

새 GPT/Claude 세션에서는 다음 의도로 시작한다.

`최신 main을 확인하고 AGENTS.md → docs/PROJECT_STATE.md → docs/NEXT_TASK.md → docs/DECISIONS.md 순서로 읽은 뒤, Current HANDOFF와 최상단 미완료 작업부터 이어서 수행한다. 완료 후 테스트, 커밋/푸시, 상태 문서 갱신까지 한다.`
