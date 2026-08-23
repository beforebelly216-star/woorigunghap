<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 우리사주 공통 AI 작업 규칙

이 파일은 GPT/Codex와 Claude가 함께 따르는 저장소 최상위 규칙이다. 채팅 기록이 아니라 GitHub 최신 `main`을 작업 상태의 단일 진실 공급원으로 사용한다.

## 브랜드 기준

- 공식 프로젝트명/서비스명: **우리사주**
- 사용자 화면, 결제 상품명, 정책, 알림, SEO/메타데이터, 운영 문서에서는 이전 브랜드명을 새 브랜드명으로 사용하지 않는다.
- GitHub 저장소 `beforebelly216-star/woorigunghap`, 기존 Vercel 도메인, DB 테이블/로그·저장 버전의 `woorigunghap_*` 같은 기술 식별자는 기존 구매 데이터와 배포 연결을 깨뜨릴 수 있으므로 별도 마이그레이션 전까지 레거시 내부 식별자로 유지할 수 있다.
- 레거시 기술 식별자를 사용자에게 브랜드명으로 노출하지 않는다.

## 작업 시작 절차

1. 최신 `main` 확인
   - 로컬 git 사용 가능 시: `git fetch origin main && git status && git pull --ff-only origin main`
   - 로컬 git이 없으면 GitHub default branch 최신 커밋을 직접 확인한다.
2. `AGENTS.md` 전체 읽기
3. `docs/PROJECT_STATE.md` 읽기
4. `docs/NEXT_TASK.md` 읽기
5. `docs/DECISIONS.md` 읽기
6. 변경 대상과 관련된 명세·테스트·기존 구현 확인
7. 사용자 요청이 있으면 `NEXT_TASK`보다 우선한다.

## 작업 원칙

- 이전 GPT/Claude 대화만 보고 현재 상태를 추측하지 않는다.
- 기존 완료 기능을 취향이나 리팩터링 욕구만으로 다시 작성하지 않는다.
- Day 24 이후에는 `blocker > hotfix > post-beta 운영 QA > improvement` 순서를 따른다.
- 유료 결제, 결과 보존, 권한, 개인정보, AI 중복 비용 관련 회귀를 최우선으로 막는다.
- 1:1과 1:N 상품을 모두 유지한다.
- 계산 결과는 서버 결정론 로직이 권위 데이터이며 AI는 서술만 담당한다.
- 이름/원본 생년월일시/비밀값을 외부 AI에 새로 노출하지 않는다.
- 비밀값을 코드, 로그, 문서, GitHub에 커밋하지 않는다.
- Vercel Hobby build rate limit은 코드 실패로 취급하지 않는다.
- **Vercel Git 자동 배포는 비활성화 상태를 유지한다. Preview/Production 배포 또는 Git 자동 배포 재활성화는 해당 배포 배치에 대한 사용자 명시 승인 후에만 수행한다.**
- 코드의 `main` 병합과 Vercel Production 배포는 별도 단계로 취급한다.
- 관련 코드·테스트·상태 문서는 작업 단위가 끝날 때까지 모아서 원격 `main`에는 한 번에 push한다.
- GitHub connector처럼 파일별 쓰기가 commit을 만드는 환경에서는 임시 branch 또는 Git tree/commit 방식으로 변경을 모은 뒤 `main`을 한 번만 갱신한다.
- 같은 파일을 GPT와 Claude가 동시에 편집하는 병렬 작업을 피한다.

## 변경/검증 절차

1. 관련 구현과 계약 테스트를 읽는다.
2. 필요한 최소 범위로 수정한다.
3. 변경 범위에 맞는 테스트를 실행한다.
4. 병합 가능한 변경이면 최소 `npm run lint`, `npm run build`를 확인한다. 실행 환경 제약이 있으면 HANDOFF에 명시한다.
5. 기존 핵심 플로우 회귀 여부를 확인한다.
6. 커밋 메시지는 `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `brand:` 등 명확한 prefix를 사용한다.
7. 코드·테스트·`PROJECT_STATE`·`NEXT_TASK/HANDOFF`를 같은 작업 묶음에서 끝낸 뒤 `main`을 한 번만 갱신한다.
8. Vercel 배포가 필요한 경우 테스트 결과와 대상 `main` SHA를 사용자에게 먼저 제시하고 승인 후 별도 배포한다.

## 작업 종료 절차

1. `docs/NEXT_TASK.md` 완료/중단 상태 갱신
2. `docs/PROJECT_STATE.md` 실제 상태 갱신
3. 장기 제품 결정이 바뀌면 `docs/DECISIONS.md` 갱신
4. `Current HANDOFF`를 최대 8줄로 갱신
5. 테스트 결과와 커밋 SHA 기록
6. 다음 작업을 구체적으로 남김
7. 관련 변경을 확인한 뒤 원격 `main`에 한 번만 push
8. Production 배포는 사용자 승인 여부를 확인해 별도로 처리

## 절대 하지 말 것

- GitHub 최신 상태 확인 없이 작업 시작
- 완료 여부를 코드/테스트 없이 추측
- 사용자 승인 없이 1:N 제거, 가격 변경, 관계 유형 축소
- 저장된 유료 결과를 새 AI 출력으로 자동 덮어쓰기
- 결제 검증 전에 유료 AI 생성
- 보안/권한 회귀를 문체 개선보다 후순위로 미루기
- Vercel 배포 제한을 이유로 정상 기능 revert
- **사용자 승인 없이 Vercel Preview/Production 배포를 실행하거나 `git.deploymentEnabled`를 다시 켜기**
- 파일별 중간 상태를 `main`에 연속 push해 불필요한 배포를 반복 트리거하기

## 빠른 인수 프롬프트

`최신 main을 확인하고 AGENTS.md → docs/PROJECT_STATE.md → docs/NEXT_TASK.md → docs/DECISIONS.md 순서로 읽은 뒤 Current HANDOFF와 최상단 미완료 작업부터 이어서 수행한다. 완료 후 테스트와 상태 문서 갱신까지 끝내고 관련 변경을 묶어 main에 한 번만 push한다. Vercel 배포가 필요하면 테스트 결과와 대상 SHA를 사용자에게 먼저 제시하고 승인 후 별도 수행한다.`
