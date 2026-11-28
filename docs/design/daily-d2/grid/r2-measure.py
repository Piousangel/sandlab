# 실행: /usr/bin/python3 docs/design/daily-d2/grid/r2-measure.py (저장소 루트에서, 카드 #141)
# 흑백 격자 사본(r2-gray.webp)에서 오늘 층·이웃 층 평균 휘도 측정 + 원본에서 WCAG 상대휘도 대비
# 층 경계(y)는 원본 572x1024 시안의 열 평균 프로파일에서 읽은 값. 각 층 안쪽 2px 들여 측정.
import sys
from PIL import Image
G="docs/design/daily-d2/grid/r2-gray.webp"; CON="docs/design/daily-d2/concepts/"
gray=Image.open(G).convert("L")
def rl(c):
    c=c/255; return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(p): return 0.2126*rl(p[0])+0.7152*rl(p[1])+0.0722*rl(p[2])
# (이름, 원본파일, 격자 패널 번호(1..4), x0,x1, [(층, y0,y1)...]) 원본 좌표
JARS=[("B2 미니 병","daily-d2-b2-mini-jar-r2.webp",2,85,165,[("오늘 wood",808,833),("plant",834,854),("stone",855,873),("acid",874,894),("lava",895,914),("sand",915,934),("water",935,954)]),
 ("B3 위 병(보드 옆)","daily-d2-b3-mini-jar-high-r2.webp",3,345,410,[("오늘 wood",389,421),("plant",422,442),("stone",443,461),("acid",462,483),("lava",484,504),("sand",505,525),("water",526,546)]),
 ("B3 아래 병(중복 카드)","daily-d2-b3-mini-jar-high-r2.webp",3,85,165,[("오늘 wood",810,837),("stone",838,856),("acid",857,877),("lava",878,896),("lava2",897,915),("sand",916,934),("water",935,953)])]
SX=390/572; SY=844/1024
for name,f,panel,x0,x1,bands in JARS:
    im=Image.open(CON+f).convert("RGB")
    px0=(panel-1)*398+4
    print(f"## {name} ({f}, 격자 패널 {panel})")
    res=[]
    for b,y0,y1 in bands:
        h=y1-y0+1
        # gray copy
        gx0=px0+int(x0*SX); gx1=px0+int(x1*SX); gy0=4+int((y0+2)*SY); gy1=4+int((y1-2)*SY)
        vals=[gray.getpixel((x,y)) for x in range(gx0,gx1) for y in range(gy0,gy1+1)]
        g=sum(vals)/len(vals)
        ps=[im.getpixel((x,y)) for x in range(x0,x1) for y in range(y0+2,y1-1)]
        rel=sum(L(p) for p in ps)/len(ps)
        res.append((b,h,g,rel))
        print(f"  {b:10s} 높이 {h:3d}px(572) = {h*SX:5.1f}px(390)  흑백 평균 {g:6.1f}/255  상대휘도 {rel:.3f}")
    t=res[0]; n=res[1]
    older=[r[1] for r in res[1:]]
    c=(max(t[3],n[3])+0.05)/(min(t[3],n[3])+0.05)
    print(f"  → 오늘/이웃({n[0]}) 흑백 차 {abs(t[2]-n[2]):.1f}, 대비 {c:.2f}:1, 오늘 두께 / 지난 층 평균 = {t[1]/(sum(older)/len(older)):.2f}배, 병 안쪽 높이 중 오늘 {t[1]/sum(r[1] for r in res)*100:.0f}%")
