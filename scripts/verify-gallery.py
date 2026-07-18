#!/usr/bin/env python3
"""
갤러리 API 종단 검증.
사전: npx wrangler dev --port 8799 --local
실행: python3 scripts/verify-gallery.py
"""
import json, urllib.request, urllib.error, base64, zlib, sys
B = "http://localhost:8799"

def call(path, data=None, method=None):
    req = urllib.request.Request(B+path, data=json.dumps(data).encode() if data else None,
                                 headers={'content-type':'application/json'} if data else {})
    if method: req.get_method = lambda: method
    try:
        with urllib.request.urlopen(req, timeout=15) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try: return e.code, json.loads(body)
        except Exception: return e.code, body

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None

def get_raw(path, follow=True):
    """JSON이 아닌 원문 응답(HTML 등). follow=False면 리다이렉트를 안 따라가 302를 그대로 본다."""
    opener = urllib.request.build_opener(*([] if follow else [_NoRedirect]))
    try:
        with opener.open(B+path, timeout=10) as r:
            return r.status, dict(r.headers), r.read().decode('utf-8','replace')
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode('utf-8','replace')

b64url = lambda b: base64.urlsafe_b64encode(b).decode().rstrip('=')
scene = bytes([1, 0xC0,0x07, 0x9C,0x04, 7, 0x80,0x80,0x1F])   # v=1, w=960, h=540, RLE
DATA  = b64url(zlib.compress(scene, 9)[2:-4])
PNG   = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
THUMB = base64.b64encode(PNG).decode()

fails = []
def check(c, m):
    print(("  O " if c else "  X ") + m)
    if not c: fails.append(m)

print("\n=== 업로드 ===")
s, r = call("/api/scenes", {"title":"  First   scene  ", "data":DATA, "thumb":THUMB, "w":960, "h":540})
check(s == 200 and 'id' in r, f"업로드 성공 → {r}")
sid = r.get('id')

print("\n=== 잘못된 입력 거부 ===")
check(call("/api/scenes", {"title":"x","data":"!!!","thumb":THUMB,"w":960,"h":540})[0] == 400, "잘못된 data 거부")
check(call("/api/scenes", {"title":"x","data":DATA,"thumb":THUMB,"w":99999,"h":540})[0] == 400, "잘못된 크기 거부")
check(call("/api/scenes", {"title":"x","data":DATA,"thumb":"!!!","w":960,"h":540})[0] == 400, "잘못된 thumb 거부(charset)")
# charset은 통과하지만 atob가 던지는 thumb("A": 길이 mod4 아님) → 500 아닌 400이어야 한다
check(call("/api/scenes", {"title":"x","data":DATA,"thumb":"A","w":960,"h":540})[0] == 400, "atob 실패 thumb → 400(500 아님)")

print("\n=== 목록 ===")
s, r = call("/api/scenes?sort=hot")
check(s == 200 and r['total'] >= 1, f"hot 목록 total={r.get('total')}")
sc = r['scenes'][0]
check(sc['title'] == "First scene", f"제목 정규화(내부 공백 압축) → {sc['title']!r}")
check('data' not in sc, "목록에 무거운 data 미포함")
check(call("/api/scenes?sort=new")[0] == 200, "new 목록")

print("\n=== 썸네일 (D1 BLOB → Array<number> 변환) ===")
try:
    with urllib.request.urlopen(B+f"/api/scenes/{sid}/thumb", timeout=10) as rr:
        ct, cc, body = rr.headers.get('content-type'), rr.headers.get('cache-control'), rr.read()
    check(ct == 'image/png', f"content-type={ct}")
    check(body[:8] == b'\x89PNG\r\n\x1a\n', f"실제 PNG 바이트 ({len(body)}B)")
    check(body == PNG, "썸네일 무손실 왕복")
    check('immutable' in (cc or ''), "불변 캐시 헤더")
except Exception as e:
    check(False, f"썸네일 실패: {e}")

print("\n=== 단건 조회 ===")
s, r = call(f"/api/scenes/{sid}")
check(s == 200 and r.get('data') == DATA, "장면 데이터 무손실 왕복")

print("\n=== ?meta=1 (data 제외, 표수 최신) ===")
s, r = call(f"/api/scenes/{sid}?meta=1")
check(s == 200 and 'data' not in r, "meta=1이면 무거운 data 제외")
check(isinstance(r, dict) and r.get('votes') is not None, "meta에도 votes 포함")
_, hd, _ = get_raw(f"/api/scenes/{sid}?meta=1")
check('no-store' in (hd.get('Cache-Control','')), "meta는 no-store(표수가 최신이어야 함)")

print("\n=== 씬 공유 OG (/s/:id) ===")
st, hd, html = get_raw(f"/s/{sid}")
check(st == 200, f"/s/:id 200 → {st}")
check(f"/api/scenes/{sid}/thumb" in html, "og:image가 씬 썸네일을 가리킴")
check('summary_large_image' in html, "twitter 대형 카드")
check(f"#s={sid}" in html and 'location.replace' in html, "브라우저는 #s=id로 리다이렉트")
st, _, _ = get_raw("/s/ZZZZZZZZ", follow=False)
check(st == 302, f"형식 맞지만 없는 id → 302 홈 (got {st})")
st, _, _ = get_raw("/s/bad!!id", follow=False)
check(st == 302, f"잘못된 형식 id → 302 홈 (got {st})")

print("\n=== 제목 HTML 이스케이프 (OG 인젝션 방지) ===")
evil = '<img src=x onerror=alert(1)>'
s, r = call("/api/scenes", {"title":evil,"data":DATA,"thumb":THUMB,"w":960,"h":540})
if s == 200:
    _, _, html = get_raw(f"/s/{r['id']}")
    check('<img src=x onerror' not in html, "악성 제목이 OG에 원문 그대로 안 들어감")
    check('&lt;img' in html, "제목이 HTML 이스케이프됨(&lt;)")
else:
    check(False, f"이스케이프 테스트 업로드 실패({s}) — 레이트리밋일 수 있음")

print("\n=== 투표 ===")
s, r = call(f"/api/scenes/{sid}/vote", method="POST"); check(s == 200 and r.get('votes') == 1, f"첫 투표 → {r}")
s, r = call(f"/api/scenes/{sid}/vote", method="POST"); check(s == 409, "같은 IP 중복 투표 차단(409)")

print("\n=== 없는 id ===")
check(call("/api/scenes/nonexistent99")[0] == 404, "없는 장면 404")
check(call("/api/scenes/!!!")[0] in (400, 404), "잘못된 id 형식 거부")
# 형식은 맞지만 없는 씬에 투표 → 404, orphan 투표 row를 만들지 않아야 함
check(call("/api/scenes/zzzzzz/vote", method="POST")[0] == 404, "없는 씬 투표 거부(404, orphan 방지)")

print("\n=== 레이트리밋 (시간당 12건) ===")
codes = [call("/api/scenes", {"title":f"s{i}","data":DATA,"thumb":THUMB,"w":960,"h":540})[0] for i in range(14)]
check(429 in codes, f"초과 시 429 → 통과 {codes.count(200)} / 차단 {codes.count(429)}")

print("\n" + "="*50)
print(f"  {'전부 통과' if not fails else str(len(fails))+'건 실패'}")
print("="*50 + "\n")
sys.exit(1 if fails else 0)
