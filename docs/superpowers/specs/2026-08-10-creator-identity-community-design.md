# 설계: 익명 크리에이터 정체성 + 리더보드 (사이트 내 커뮤니티, 1단계)

- 날짜: 2026-08-10
- 배경: 실제 방문자 확인(Cloudflare Web Analytics 7일 346명, 3주째 40~70 unique/day 안정) 이후
  사용자가 "적극적 커뮤니티 운영"을 요청. 브레인스토밍으로 범위를 좁힘: **외부 Discord/포럼이 아니라
  사이트 내부의 비-댓글 상호작용 강화.**
- 절대 제약 (CLAUDE.md·charter.md에서 상속, 협상 불가):
  - 댓글 기능 금지.
  - 계정/로그인 금지 — 카피 쐐기가 "무설치·무가입".
  - 격자 1200×600 고정, Cloudflare Workers 전용.

## 문제

sandlab엔 "누가 만들었는지 알아볼 수 있는" 개념이 아예 없다. `scenes.ip`는 SHA-256 해시(레이트리밋
전용, 비식별)뿐이고 "Yours" 탭도 서버가 아니라 로컬스토리지 기반 자기 자신만의 뷰다. 리믹스 계보
(`parent` 필드)는 있지만 "누가"가 없어 계보가 익명 노드들의 연결일 뿐이다. Sandspiel의 재방문
엔진이 커뮤니티 서버가 아니라 인프로덕트 리믹스 문화였다는 1차 자료(`references/distribution.md`)에
비춰, 이 벽을 넘는 게 다음 단계다.

## 범위 (1단계)

포함: 익명 지속 크리에이터 핸들, 갤러리 카드에 "by 이름" 노출, 크리에이터 프로필 페이지,
Top Creators 리더보드.

제외(비범위, 별도 판단 필요): 실시간 프레즌스/활동 티커(트래픽 규모상 시기상조로 3안에서 기각),
리믹스 계보 트리 시각화 심화(2안, 이번엔 크리에이터 프로필에 통계 숫자로만 편입하고 그래프 뷰는 안 함),
알림/구독(기존 mineDeltas가 "내 씬" 범위에서 이미 충족).

## A. 데이터 모델 + API

### 스키마 변경 (`schema.sql`, D1 마이그레이션 — 사용자가 `!` 프리픽스로 직접 실행)

```sql
ALTER TABLE scenes ADD COLUMN creator_id TEXT;    -- 로컬스토리지 랜덤 토큰. nullable(기존 39건=NULL="Anonymous")
ALTER TABLE scenes ADD COLUMN creator_name TEXT;  -- 업로드 시점 닉네임 스냅샷. nullable
CREATE INDEX IF NOT EXISTS idx_scenes_creator ON scenes(creator_id);
```

별도 `creators` 테이블은 만들지 않는다. 계정이 없으므로 "크리에이터"는 로그인된 실체가 아니라
`scenes.creator_id`로 묶이는 집계 뷰다(YAGNI). 닉네임은 씬마다 스냅샷이라 개명해도 과거 글은
안 바뀐다.

### API (`worker/index.ts`)

- `POST /api/scenes`: body에 `creator`(토큰, 정규식 검증 `^[A-Za-z0-9_-]{6,24}$`)·`creatorName`
  (기존 `cleanTitle`과 동일한 코드포인트-세이프 새니타이즈, 최대 24자, 빈 값 → 저장 안 함/Anonymous)
  선택 필드 추가.
- `GET /api/scenes` (list): 응답 각 행에 `creatorId`/`creatorName` 포함. `?creator=<id>` 필터
  파라미터 추가 — 크리에이터 프로필의 씬 그리드가 기존 리스트 엔드포인트(페이지네이션 포함)를
  그대로 재사용.
- `GET /api/creators/top` (신규): 리더보드용 집계.
  ```sql
  SELECT creator_id,
         (SELECT creator_name FROM scenes s2 WHERE s2.creator_id = s.creator_id
            ORDER BY created_at DESC LIMIT 1) AS creator_name,
         SUM(votes) AS votes, COUNT(*) AS scenes
  FROM scenes s
  WHERE creator_id IS NOT NULL
  GROUP BY creator_id ORDER BY votes DESC LIMIT 20
  ```
  `creator_id IS NOT NULL` 조건으로 아트 카운슬 시드 39건(creator_id 없음)이 리더보드를 오염시키지
  않음 — 시딩 콘텐츠와 실사용자 크리에이터가 자연 분리된다. 닉네임은 최신 업로드 시점 스냅샷을 쓴다
  (개명 시 리더보드도 곧 새 이름으로 갱신).
- `GET /api/creators/:id` (신규) — 크리에이터 프로필 헤더용 집계 단건. 씬 목록은 페이지네이션되는
  `GET /api/scenes?creator=:id`로 따로 가져오므로, 이 엔드포인트는 통계만 반환한다:
  `{ name, totalVotes: SUM(votes), sceneCount: COUNT(*), remixCount: COUNT(*) FROM scenes WHERE
  parent IN (SELECT id FROM scenes WHERE creator_id=:id) }`. 클라이언트가 페이지당 24건만 합산해
  통계가 틀리는 걸 방지하기 위해 서버 집계로 분리했다.

### 남용 방어

`creator_id`는 권한이 없는 순수 표시용 라벨(자기 것 아닌 씬을 수정/삭제할 수 없음)이라 별도
레이트리밋 불필요 — 기존 업로드 IP 상한(`UPLOADS_PER_HOUR=12`)이 그대로 방패.

## B. 프론트엔드 UX 흐름

1. **신규 `src/lib/sand/creator.ts`** — 기존 `gallery.ts`/`discovery.ts`와 동일하게 순수함수+
   localStorage 래퍼로 작성(유닛테스트 가능).
   - `getOrCreateCreatorId()`: 없으면 랜덤 토큰(8자) 생성해 `sandlab.creatorId`에 저장, 있으면 재사용.
   - `getCreatorName()` / `setCreatorName(name)`: `sandlab.creatorName`. 미설정 시 `undefined`.
2. **Publish 연결** — `gallery.ts`의 `uploadScene(body)` 타입에 `creator?`/`creatorName?` 추가.
   호출부(`SandCanvas.tsx`의 Publish 핸들러)에서 `getOrCreateCreatorId()`/`getCreatorName()`을
   실어 보냄. 새 호출 경로 없음, 기존 배선에 필드만 추가.
3. **첫 Publish 시 닉네임 프롬프트** — 로그인이 아니라 선택적 한 줄. 닉네임 미설정 상태에서 처음
   Publish를 누르는 순간에만 가벼운 인라인 입력을 보여주고 건너뛰기 가능. 건너뛰면 Anonymous로
   계속 업로드되고, Yours 탭 등에서 나중에 "닉네임 설정"으로 뒤늦게 지정 가능. **그리는 행위 자체는
   절대 막지 않는다** — 캔버스 진입·드로잉 중엔 뜨지 않음, Publish 시점에만.
4. **갤러리 카드** — 제목 아래 "by 이름" 노출(Anonymous는 흐리게, 클릭 불가). 이름 있는 크리에이터는
   클릭 시 프로필로 이동(해시 라우팅 `#c=<creator_id>`, 기존 `#s=`/`#g=` 패턴과 동일).
5. **크리에이터 프로필 (`#c=<id>`)** — 기존 `GalleryBrowser`를 재사용해 `?creator=<id>` 필터로
   그 사람 씬만 나열(페이지네이션 포함). 상단 헤더(이름 + 총 표·게시 수·파생 리믹스 수)는
   `GET /api/creators/:id` 집계 단건 호출로 별도 렌더 — 그리드 합산이 아니라 서버 집계를 쓰는 이유는
   위 API 절 참조.
6. **리더보드 탭** — 기존 네비(New/Hot/Yours)에 "Top Creators" 탭 추가. `/api/creators/top` 호출해
   이름+합산 표로 랭킹 리스트(카드 그리드 아님, 심플 리스트).

## C. 마이그레이션 · 테스트 · 리스크

**마이그레이션**: 에이전트는 프로덕션 D1 스키마 변경이 안전분류기에 막히는 게 이 프로젝트의 확립된
패턴(선례: 인덱스 정정·갤러리 정리). `ALTER TABLE` 2줄 + 인덱스 1개를 사용자가 `!` 프리픽스로 직접
실행.

**테스트**:
- `creator.ts`: id 생성·영속성, 닉네임 새니타이즈(코드포인트-세이프, `cleanTitle` 패턴 재사용)
  유닛테스트.
- `scripts/verify-gallery.py`에 왕복 테스트 추가: creator 포함 업로드 → list에 creator 노출 →
  `/api/creators/top` 집계 정확성.

**리스크 (완화하지 않고 투명하게 남겨둠)**:
- **닉네임 도용/충돌**: 인증이 없어 막을 방법이 없다. `creator_id`가 캐노니컬이라 이름이 겹쳐도
  사고 리스크는 낮다 — 익명 프로덕트에서 수용 가능한 트레이드오프로 판단.
- **초기 리더보드가 휑할 수 있음**: 아트 카운슬 시드 39건은 `creator_id`가 없어 자동 제외되고,
  실사용자 크리에이터는 지금 극소수일 가능성 — "빈 갤러리" 함정의 변주. 완화책: 리더보드를
  내비게이션에 조용히 추가만 하고 랜딩에서 강하게 밀지 않는다. 사람이 쌓이면 노출을 올린다.
- **기존 39건 하위호환**: `creator_id` NULL → "Anonymous" 표시, 프로필 링크 없음, 리더보드 제외.
  별도 백필 마이그레이션 불필요.

## 비범위로 명시적으로 남기는 것

- 실시간 프레즌스/활동 티커: WebSocket/Durable Objects급 인프라 필요, 현재 트래픽(40~70/day)에선
  대부분 시간대에 "0명 접속" 노출 위험 — 재검토는 트래픽이 한 자릿수 더 붙은 뒤.
  - 재검토 트리거: `/api/creators/top`가 안정적으로 10명 이상의 실크리에이터를 보여주는 시점.
- 리믹스 계보 그래프/트리 시각화: 크리에이터 프로필의 숫자 통계로만 이번엔 편입. 별도 그래프 뷰는
  다음 사이클에 트래픽·리텐션 신호를 보고 재판단.
