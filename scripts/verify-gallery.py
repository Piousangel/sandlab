#!/usr/bin/env python3
"""
갤러리 API 종단 검증.
사전: npx wrangler dev --port 8799 --local
실행: python3 scripts/verify-gallery.py
"""
import json, urllib.request, urllib.error, base64, zlib, sys, random, string
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
scene = bytes([1, 0xC0,0x07, 0x9C,0x04, 7, 0x80,0x80,0x1F])   # v=1, w=960, h=540, RLE(mat=7=채움)
DATA  = b64url(zlib.compress(scene, 9)[2:-4])
blank_scene = bytes([1, 0xC0,0x07, 0x9C,0x04, 0, 0x80,0x80,0x1F])  # 같은 크기, mat=0=EMPTY → 빈 씬
BLANK_DATA  = b64url(zlib.compress(blank_scene, 9)[2:-4])
GARBAGE_DATA = b64url(b"not a valid deflate stream at all")      # charset OK, 디코드 불가
PNG   = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
THUMB = base64.b64encode(PNG).decode()
NOTPNG = base64.b64encode(b"NOTAPNG!padding_bytes_here").decode()  # 유효 base64·충분한 길이지만 PNG 아님

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
# 서버측 씬 검증(새 방어): 형식만 맞고 디코드 불가/빈 씬/PNG 아닌 thumb 거부
check(call("/api/scenes", {"title":"x","data":GARBAGE_DATA,"thumb":THUMB,"w":960,"h":540})[0] == 400, "디코드 불가 data 거부(서버측 검증)")
check(call("/api/scenes", {"title":"x","data":BLANK_DATA,"thumb":THUMB,"w":960,"h":540})[0] == 400, "빈 씬 거부(isBlank 서버측)")
check(call("/api/scenes", {"title":"x","data":DATA,"thumb":THUMB,"w":800,"h":540})[0] == 400, "data 내부 w,h와 body 불일치 거부")
check(call("/api/scenes", {"title":"x","data":DATA,"thumb":NOTPNG,"w":960,"h":540})[0] == 400, "PNG 아닌 thumb 거부(시그니처)")

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

print("\n=== 리믹스 계보 (parent / remixCount) ===")
s, r = call("/api/scenes", {"title":"remix of first","data":DATA,"thumb":THUMB,"w":960,"h":540,"parent":sid})
check(s == 200 and 'id' in r, f"리믹스 업로드(parent={sid}) → {r}")
bid = r.get('id')
s, r = call(f"/api/scenes/{bid}?meta=1")
check(s == 200 and r.get('parent') == sid, f"자식이 parent를 기록 → parent={r.get('parent')}")
s, r = call(f"/api/scenes/{sid}?meta=1")
check(s == 200 and r.get('remixCount') == 1, f"원본 remixCount=1 → {r.get('remixCount')}")
# 잘못된 형식 parent는 무시(원작으로 저장)
s, r = call("/api/scenes", {"title":"bad parent","data":DATA,"thumb":THUMB,"w":960,"h":540,"parent":"nope!!"})
if s == 200:
    _, r2 = call(f"/api/scenes/{r['id']}?meta=1")
    check(r2.get('parent') in (None, ''), "잘못된 형식 parent는 무시(null)")
# 계보가 hot/new 공개 리스트에도 실린다(Yours뿐 아니라 모든 방문자에게 ↻N·remix 노출)
for sort in ("new", "hot"):
    _, lst = call(f"/api/scenes?sort={sort}")
    byid = {x['id']: x for x in lst.get('scenes', [])}
    check(byid.get(sid, {}).get('remixCount') == 1, f"{sort} 리스트에 원본 remixCount=1 노출 → {byid.get(sid,{}).get('remixCount')}")
    check(byid.get(bid, {}).get('parent') == sid, f"{sort} 리스트에 자식 parent 노출 → {byid.get(bid,{}).get('parent')}")

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

print("\n=== 크리에이터 정체성 (id/name 저장 + 필터 + 리더보드 + 프로필) ===")
# 레이트리밋(시간당 12건, 아래 블록에서 소진) 전에 실행해야 이 블록의 업로드들이 200을 받는다.
cid = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
s, r = call("/api/scenes", {"title":"creator scene","data":DATA,"thumb":THUMB,"w":960,"h":540,
                             "creator":cid,"creatorName":"TestCreator"})
check(s == 200 and 'id' in r, f"creator 지정 업로드 → {r}")
csid = r.get('id')

s, r = call("/api/scenes?sort=new")
row = {x['id']: x for x in r.get('scenes', [])}.get(csid, {})
check(row.get('creatorId') == cid, f"목록에 creatorId 노출 → {row.get('creatorId')}")
check(row.get('creatorName') == "TestCreator", f"목록에 creatorName 노출 → {row.get('creatorName')}")

s, r = call(f"/api/scenes?creator={cid}")
check(s == 200 and r.get('total', 0) >= 1, f"creator 필터 total>=1 → {r.get('total')}")
check(bool(r.get('scenes')) and all(x.get('creatorId') == cid for x in r['scenes']), "creator 필터 결과가 전부 해당 id")

s, r = call(f"/api/creators/{cid}")
check(s == 200 and r.get('sceneCount', 0) >= 1, f"프로필 sceneCount>=1 → {r}")
check(s == 200 and r.get('totalVotes', -1) >= 0, f"프로필 totalVotes>=0 → {r.get('totalVotes')}")
check(s == 200 and r.get('name') == "TestCreator", f"프로필 name==TestCreator → {r.get('name')}")

s, r = call("/api/creators/top")
check(s == 200, f"리더보드 200 → {s}")
check(any(c.get('id') == cid for c in r.get('creators', [])), "리더보드에 방금 만든 크리에이터 존재")

# 완전 익명 업로드(creator 필드 자체를 안 보냄) — 목록에서 creatorId가 null이어야 한다.
s, r = call("/api/scenes", {"title":"anon scene","data":DATA,"thumb":THUMB,"w":960,"h":540})
check(s == 200 and 'id' in r, f"익명 업로드 → {r}")
_, r2 = call("/api/scenes?sort=new")
anon_row = {x['id']: x for x in r2.get('scenes', [])}.get(r.get('id'), {})
check(anon_row.get('creatorId') is None, f"익명 업로드는 creatorId가 null → {anon_row.get('creatorId')}")

# 형식이 안 맞는 creator(6자 미만)는 400이 아니라 조용히 익명 취급되어야 한다.
s, r = call("/api/scenes", {"title":"bad creator id","data":DATA,"thumb":THUMB,"w":960,"h":540,
                             "creator":"abc12","creatorName":"ShouldBeIgnored"})
check(s == 200 and 'id' in r, f"형식 불량 creator는 400 아닌 익명 성공 → {s}, {r}")
if s == 200:
    _, r3 = call("/api/scenes?sort=new")
    bad_row = {x['id']: x for x in r3.get('scenes', [])}.get(r['id'], {})
    check(bad_row.get('creatorId') is None, f"형식 불량 creator는 저장 안 됨(null) → {bad_row.get('creatorId')}")

print("\n=== 레이트리밋 (시간당 12건) ===")
codes = [call("/api/scenes", {"title":f"s{i}","data":DATA,"thumb":THUMB,"w":960,"h":540})[0] for i in range(14)]
check(429 in codes, f"초과 시 429 → 통과 {codes.count(200)} / 차단 {codes.count(429)}")

print("\n" + "="*50)
print(f"  {'전부 통과' if not fails else str(len(fails))+'건 실패'}")
print("="*50 + "\n")
sys.exit(1 if fails else 0)
