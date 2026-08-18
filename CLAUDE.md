@AGENTS.md

# Claude 인수 메모

Claude는 이 저장소에서 별도 진도 체계를 만들지 않는다. 반드시 루트 `AGENTS.md`와 아래 공유 상태 문서를 기준으로 GPT가 하던 작업을 이어간다.

1. `docs/PROJECT_STATE.md`
2. `docs/NEXT_TASK.md`
3. `docs/DECISIONS.md`

작업 시작 시 최신 `main`을 먼저 확인하고, `NEXT_TASK.md`의 `Current HANDOFF`와 가장 위의 미완료 우선순위를 읽는다. 작업 종료 시 테스트 결과, 커밋 SHA, 남은 정확한 작업을 `Current HANDOFF`에 갱신한다.

GPT가 작성한 코드라는 이유만으로 재작성하지 말고, 기존 계약·테스트·제품 결정을 유지하면서 필요한 범위만 수정한다.
