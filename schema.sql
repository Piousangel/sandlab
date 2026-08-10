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
  parent     TEXT             -- 리믹스 계보: 이 작품이 파생된 원본 씬 id. 원작은 NULL.
                              -- (댓글 없이 크리에이터를 잇는 리텐션 플라이휠 — Sandspiel 리믹스 문화)
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

-- 익명 지속 크리에이터 정체성. 계정/로그인 없음 — creator_id는 클라이언트가 생성해 보내는
-- 표시용 라벨일 뿐(권한 없음). 닉네임을 한 번도 지정 안 한 사용자는 둘 다 NULL(=Anonymous),
-- 리더보드 집계에서 자연 제외된다.
ALTER TABLE scenes ADD COLUMN creator_id TEXT;
ALTER TABLE scenes ADD COLUMN creator_name TEXT;
CREATE INDEX IF NOT EXISTS idx_scenes_creator ON scenes(creator_id);

CREATE TABLE IF NOT EXISTS votes (
  scene      TEXT NOT NULL,
  ip         TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (scene, ip)   -- IP당 장면당 1표. 중복은 DB가 막는다.
);

-- 투표 레이트리밋(IP당 시간당 상한) COUNT가 풀스캔 안 하도록.
CREATE INDEX IF NOT EXISTS idx_votes_ip ON votes(ip, created_at);
