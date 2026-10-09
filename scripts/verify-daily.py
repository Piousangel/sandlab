"""데일리 API 검증 — wrangler dev 필요(기본 8799, 인자로 베이스 URL).
로컬 D1을 쓰므로 실행 전 daily_results를 비운다(같은 IP라 하루 1건 제한에 걸리지 않게).
  python3 scripts/verify-daily.py [http://localhost:8799]
"""
import json, sys, subprocess, urllib.request, urllib.error, datetime

B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8799'
LAUNCH = datetime.datetime(2026, 10, 10, tzinfo=datetime.timezone.utc)

def parse(raw):
    try: return json.loads(raw or b'null')
    except ValueError: return None  # HTML 404 등

def call(path, data=None, method=None):
    req = urllib.request.Request(B + path, data=json.dumps(data).encode() if data is not None else None,
                                 headers={'content-type': 'application/json'}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, parse(r.read()), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, parse(e.read()), dict(e.headers)

def level_for(day):
    out = subprocess.check_output(['npx', 'tsx', '-e', f"import {{dailyFor}} from './src/lib/challenge/daily'; const l=dailyFor({day}); console.log(JSON.stringify({{id:l.id,stars:l.stars,budget:Object.values(l.palette).reduce((a,b)=>a+b,0)}}))"])
    return json.loads(out)

subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'sandlab-gallery', '--local', '--command', 'DELETE FROM daily_results'], capture_output=True)

now = datetime.datetime.now(datetime.timezone.utc)
today = max(1, (now - LAUNCH).days + 1)
L = level_for(today)
ok = fail = 0
def check(name, cond, extra=''):
    global ok, fail
    if cond: ok += 1; print('  O', name)
    else: fail += 1; print('  X', name, extra)

good = {'day': today, 'levelId': L['id'], 'ink': L['stars'][0], 'stars': 3}
s, b, _ = call('/api/daily', good, 'POST');                         check('정상 제출 201', s == 201, (s, b))
s, b, _ = call('/api/daily', good, 'POST');                         check('같은 날 중복 409', s == 409, (s, b))
s, b, _ = call('/api/daily', {**good, 'levelId': 'd-999'}, 'POST'); check('다른 레벨 id 400', s == 400, (s, b))
s, b, _ = call('/api/daily', {**good, 'ink': L['budget'] + 1}, 'POST'); check('예산 초과 잉크 400', s == 400, (s, b))
s, b, _ = call('/api/daily', {**good, 'ink': L['stars'][1] + 1, 'stars': 3}, 'POST'); check('별-잉크 불일치 400', s == 400, (s, b))
s, b, _ = call('/api/daily', {**good, 'day': today + 5}, 'POST');   check('먼 날짜 400', s == 400, (s, b))
s, b, _ = call('/api/daily', 'nope', 'POST');                       check('잘못된 본문 400', s == 400, (s, b))
s, b, h = call(f'/api/daily/{today}/stats')
check('통계 200 + 집계', s == 200 and b.get('clears') == 1 and b.get('stars') == [0, 0, 1] and b.get('inkPercentiles', [None])[0] == L['stars'][0], (s, b))
check('통계 60초 캐시', 'max-age=60' in (h.get('cache-control') or h.get('Cache-Control') or ''), h)
s, b, _ = call('/api/daily/abc/stats');                              check('잘못된 day 경로는 데일리 라우트가 아님', s != 200 or 'clears' not in (b or {}), (s, b))

print(f'\n  {ok} 통과 / {fail} 실패')
sys.exit(1 if fail else 0)
