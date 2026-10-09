-- Sandlab 갤러리 스키마
--
-- 댓글 테이블이 없는 건 누락이 아니라 결정이다.
-- Sandspiel 제작자가 의도적으로 뺐다 — 독성 차단. 관객은 필요하고 싸움은 필요 없다.

CREATE TABLE IF NOT EXISTS scenes (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  data       TEXT NOT NULL,   -- base64url(deflate(RLE)) — urlState와 동일 포맷
  thumb      BLOB NOT NULL,   -- PNG
  votes      INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  w          INTEGER NOT NULL,
  h          INTEGER NOT NULL,
  ip         TEXT NOT NULL,   -- SHA-256 앞 12바이트. 원본 IP는 저장하지 않는다.
  parent     TEXT,            -- 리믹스 계보: 이 작품이 파생된 원본 씬 id. 원작은 NULL.
                              -- (댓글 없이 크리에이터를 잇는 리텐션 플라이휠 — Sandspiel 리믹스 문화)
  -- 익명 지속 크리에이터 정체성. 계정/로그인 없음 — creator_id는 클라이언트가 생성해 보내는
  -- 표시용 라벨일 뿐(권한 없음). 닉네임을 한 번도 지정 안 한 사용자는 둘 다 NULL(=Anonymous),
  -- 리더보드 집계에서 자연 제외된다.
  creator_id   TEXT,
  creator_name TEXT
);

-- hot 랭킹: 최근 1주일 이내 + 표 순 (Powder Toy FP 복제). ORDER BY가 votes DESC, created_at DESC라
-- 컬럼 순서를 그대로 맞춘다 — (created_at, votes) 순이면 정렬에 못 쓰여 TEMP B-TREE로 떨어지고
-- (SELECT COUNT(*)...) remixCount 서브쿼리가 OFFSET/LIMIT 전에 창 안 전체 행에 대해 돈다(EXPLAIN QUERY
-- PLAN으로 확인). (votes, created_at) 순이면 이 인덱스 자체가 정렬 순서를 제공해 LIMIT이 앞에서 끊는다.
CREATE INDEX IF NOT EXISTS idx_scenes_hot ON scenes(votes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenes_new ON scenes(created_at DESC);
-- 업로드 레이트리밋 조회용
CREATE INDEX IF NOT EXISTS idx_scenes_ip ON scenes(ip, created_at);
-- 리믹스 카운트(이 씬에서 파생된 작품 수) 조회용
CREATE INDEX IF NOT EXISTS idx_scenes_parent ON scenes(parent);

-- 크리에이터 프로필 조회(WHERE creator_id=? ORDER BY created_at DESC)가 필터와 정렬을 모두
-- 이 인덱스에서 받도록 복합 인덱스로 둔다 — idx_scenes_hot과 같은 이유(위 주석 참조).
CREATE INDEX IF NOT EXISTS idx_scenes_creator ON scenes(creator_id, created_at DESC);

CREATE TABLE IF NOT EXISTS votes (
  scene      TEXT NOT NULL,
  ip         TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (scene, ip)   -- IP당 장면당 1표. 중복은 DB가 막는다.
);

-- 투표 레이트리밋(IP당 시간당 상한) COUNT가 풀스캔 안 하도록.
CREATE INDEX IF NOT EXISTS idx_votes_ip ON votes(ip, created_at);

-- 데일리 챌린지 결과 — IP당 하루 1건(첫 클리어). 순위표 없음: 워커엔 GPU가 없어 플레이를 재생 검증할 수 없어서
-- 조작돼도 피해가 작은 집계(백분위·별 분포)만 낸다. ip는 scenes와 같은 SHA-256 앞 12바이트.
CREATE TABLE IF NOT EXISTS daily_results (
  day        INTEGER NOT NULL,
  level_id   TEXT NOT NULL,
  ink        INTEGER NOT NULL,
  stars      INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ip         TEXT NOT NULL,
  PRIMARY KEY (day, ip)
);
