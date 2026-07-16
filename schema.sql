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
  ip         TEXT NOT NULL    -- SHA-256 앞 12바이트. 원본 IP는 저장하지 않는다.
);

-- hot 랭킹: 최근 1주일 이내 + 표 순 (Powder Toy FP 복제).
-- 이 창이 없으면 오래된 히트작이 상단을 영원히 점거해 신규가 절대 안 보인다.
CREATE INDEX IF NOT EXISTS idx_scenes_hot ON scenes(created_at DESC, votes DESC);
CREATE INDEX IF NOT EXISTS idx_scenes_new ON scenes(created_at DESC);
-- 업로드 레이트리밋 조회용
CREATE INDEX IF NOT EXISTS idx_scenes_ip ON scenes(ip, created_at);

CREATE TABLE IF NOT EXISTS votes (
  scene      TEXT NOT NULL,
  ip         TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (scene, ip)   -- IP당 장면당 1표. 중복은 DB가 막는다.
);
