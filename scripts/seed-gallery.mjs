/**
 * Sandlab 씨앗 생성기.
 * 1200×600 격자를 물리적으로 안정된 구성으로 그리고 → RLE+deflate-raw+base64url (앱 포맷과 바이트 호환)
 * → 640×320 썸네일 PNG 렌더(내가 눈으로 확인) → 컨택트시트. 좋은 것만 나중에 업로드.
 */
import zlib from 'node:zlib'
import fs from 'node:fs'

const W = 1200, H = 600
const OUT = './seed-out'
fs.mkdirSync(OUT, { recursive: true })

// ── 재료 id (PRESETS 인덱스) ──
const EMPTY=0, WALL=1, STONE=2, METAL=3, WOOD=4, PLANT=5, ICE=6, SAND=7, SALT=8,
      ASH=9, GUNPOWDER=10, SEED=11, WATER=12, OIL=13, ACID=14, LAVA=15, FIRE=16, STEAM=17, SMOKE=18
const HEX = {0:'#07090D',1:'#525A6B',2:'#79808C',3:'#B9C2CE',4:'#6B4423',5:'#43B04A',6:'#A8E4EC',
  7:'#E8C87A',8:'#F2F4F7',9:'#5E5A57',10:'#2E3033',11:'#B4D96A',12:'#2E6FD9',13:'#4A3520',
  14:'#8CFF2E',15:'#FF5A0A',16:'#FF7A18',17:'#D6E2EA',18:'#4C5058'}
const EMISS = {6:0.25,14:1.1,15:2.6,16:3.0,17:0.22}
const rgb = (h) => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]
const RGB = Object.fromEntries(Object.entries(HEX).map(([k,v])=>[k,rgb(v)]))

// 결정적 난수(시드별)
function mulberry(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// ── 그리기 헬퍼 ──
const g = () => new Uint8Array(W*H) // 0=empty
const set = (a,x,y,m) => { if(x>=0&&x<W&&y>=0&&y<H) a[(y|0)*W+(x|0)]=m }
function rect(a,x0,y0,x1,y1,m){for(let y=Math.max(0,y0|0);y<=Math.min(H-1,y1|0);y++)for(let x=Math.max(0,x0|0);x<=Math.min(W-1,x1|0);x++)a[y*W+x]=m}
// y = surface(x) 아래를 m으로 채움 (바닥까지)
function fillBelow(a,surf,m,floor=H){for(let x=0;x<W;x++){const s=Math.max(0,surf(x)|0);for(let y=s;y<Math.min(H,floor);y++)a[y*W+x]=m}}
function disk(a,cx,cy,r,m){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r)set(a,cx+x,cy+y,m)}

// ── 씬들 (물리적으로 안정된 구성) ──
const scenes = []
const add = (title,fn) => scenes.push({title,fn})

add('sand dunes', ()=>{const a=g();const rnd=mulberry(11)
  // 겹치는 사인 언덕 — 따뜻한 모래 지평선
  fillBelow(a,x=>H-140-70*Math.sin(x/190)-40*Math.sin(x/70+1)-18*Math.sin(x/28),SAND)
  // 결이 보이게 표면 근처 살짝 밝고 어두운 알갱이 → ash 살짝
  for(let x=0;x<W;x++){const s=H-140-70*Math.sin(x/190)-40*Math.sin(x/70+1)-18*Math.sin(x/28)|0;for(let k=0;k<3;k++)if(rnd()<0.15)set(a,x,s+k,ASH)}
  return a})

add('oil on water', ()=>{const a=g()
  // 돌 대야
  rect(a,120,300,150,560,STONE);rect(a,1050,300,1080,560,STONE);rect(a,120,540,1080,560,STONE)
  // 물 채우고 그 위 기름층(기름이 가벼워 위)
  rect(a,151,380,1049,538,WATER);rect(a,151,352,1049,380,OIL)
  // 가장자리 식물 몇
  for(let i=0;i<7;i++){const x=170+i*130;rect(a,x,330,x+6,352,PLANT)}
  return a})

add('sand & salt', ()=>{const a=g()
  // 위에서 모래+소금이 넉넉히 쏟아져 → settle이 크고 자연스러운 원뿔 더미로(섞인 알갱이)
  const rnd=mulberry(21)
  // 두 갈래로 많은 양을 채워둔다(더미가 화면 하단을 채우게)
  rect(a,360,80,470,470,SAND)
  rect(a,740,80,850,470,SALT)
  rect(a,540,60,680,470,SAND)
  // 알갱이 섞기
  for(let y=80;y<470;y++)for(let x=360;x<850;x++){if(a[y*W+x]&&rnd()<0.12)a[y*W+x]=(rnd()<0.5?SALT:SAND)}
  return a})

add('potions', ()=>{const a=g()
  // 돌 잔 4개에 각기 다른 액체 — 색색 + 발광
  const liq=[WATER,OIL,ACID,LAVA];const bx=180,bw=200,gap=40
  for(let c=0;c<4;c++){const x0=bx+c*(bw+gap)
    rect(a,x0,240,x0+14,540,STONE);rect(a,x0+bw-14,240,x0+bw,540,STONE);rect(a,x0,528,x0+bw,540,STONE)
    rect(a,x0+16,300,x0+bw-16,526,liq[c])} // 채우면 settle이 수평 잡음
  return a})

add('terrarium', ()=>{const a=g()
  // 유리(벽) 반원 항아리
  const cx=600,top=150,bot=540,r=430
  for(let x=0;x<W;x++){const dx=(x-cx)/r;if(Math.abs(dx)<=1){const yb=bot-Math.round(60*Math.sqrt(1-dx*dx));// 바닥 곡선
    set(a,x,yb,WALL);set(a,x,yb+1,WALL)}}
  rect(a,cx-r,top,cx-r+3,bot,WALL);rect(a,cx+r-3,top,cx+r,bot,WALL)
  // 흙(나무) + 물 얇게 + 무성한 식물 + 씨앗
  rect(a,cx-r+4,470,cx+r-4,536,WOOD)
  rect(a,cx-r+4,458,cx+r-4,470,WATER)
  const rnd=mulberry(31)
  for(let i=0;i<22;i++){const x=cx-r+30+i*38+(rnd()*10|0);const hgt=70+(rnd()*150|0)
    rect(a,x,470-hgt,x+3+(rnd()*3|0),470,PLANT) // 두꺼운 줄기
    // 겹치는 잎 덩어리(위로 갈수록 풍성)
    for(let l=0;l<4;l++){const ly=470-hgt+ (l*hgt/5|0);const lr=6+(rnd()*8|0);disk(a,x+1,ly,lr,PLANT)}
    disk(a,x+1,470-hgt,9+(rnd()*6|0),PLANT)}
  for(let i=0;i<50;i++)set(a,cx-r+20+((i*79)%(2*r-40)),455,SEED)
  return a})

add('ice cavern', ()=>{const a=g()
  // 어두운 동굴 — 위 종유석/아래 석순 얼음(빛남) + 물웅덩이
  rect(a,0,0,W-1,60,STONE)
  const rnd=mulberry(3)
  for(let i=0;i<26;i++){const x=30+((i*151)%(W-60));const len=40+(rnd()*160|0);for(let y=60;y<60+len;y++){const wdt=Math.max(1,(len-(y-60))/12|0);rect(a,x-wdt,y,x+wdt,y,ICE)}}
  // 바닥 물 + 석순
  rect(a,0,H-70,W-1,H-1,WATER)
  for(let i=0;i<18;i++){const x=60+((i*191)%(W-120));const len=30+(rnd()*90|0);for(let y=H-70;y>H-70-len;y--){const wdt=Math.max(1,(len-(H-70-y))/10|0);rect(a,x-wdt,y,x+wdt,y,ICE)}}
  return a})

add('lava well', ()=>{const a=g()
  // 돌 우물에 깊게 고인 용암(빛남) + 위로 오르는 방울 몇 + 돌 섬
  rect(a,360,90,410,560,STONE);rect(a,790,90,840,560,STONE);rect(a,360,540,840,560,STONE)
  rect(a,411,300,789,538,LAVA) // 깊은 용암 풀(프레임 하단 크게 채움)
  disk(a,560,240,30,LAVA);disk(a,660,200,20,LAVA) // 오르는 방울
  disk(a,500,470,26,STONE);disk(a,700,500,20,STONE) // 잠긴 돌 섬(대비)
  return a})

add('acid pool', ()=>{const a=g()
  // 돌 선반을 녹이는 형광 산 웅덩이(빛남)
  rect(a,0,H-90,W-1,H-1,ACID)
  rect(a,0,H-96,W-1,H-90,ACID)
  // 침식된 돌 선반
  const rnd=mulberry(9)
  for(let sh=0;sh<3;sh++){const y=180+sh*120;for(let x=0;x<W;x++){const bite=40*Math.sin(x/60+sh)+rnd()*30;if((x%400)<200+bite)rect(a,x,y,x,y+50,STONE)}}
  // 방울
  for(let i=0;i<20;i++){const x=(i*127)%W;disk(a,x,H-120-((i*53)%80),3,ACID)}
  return a})

add('rock pool', ()=>{const a=g()
  // 돌 협곡의 큰 물웅덩이 + 계단 바위 + 가장자리 식물
  rect(a,0,H-190,320,H-1,STONE)   // 좌측 바위
  rect(a,0,H-260,180,H-190,STONE)
  rect(a,880,H-220,W-1,H-1,STONE) // 우측 바위
  rect(a,980,H-300,W-1,H-220,STONE)
  rect(a,300,H-150,900,H-1,WATER) // 큰 웅덩이(settle이 수평 채움)
  rect(a,300,H-160,900,H-150,WATER)
  // 가장자리 식물
  for(let i=0;i<6;i++){const x=200+i*20;rect(a,x,H-260-40,x+5,H-260,PLANT);disk(a,x+2,H-300,10,PLANT)}
  for(let i=0;i<5;i++){const x=980+i*22;rect(a,x,H-300-36,x+5,H-300,PLANT);disk(a,x+2,H-336,9,PLANT)}
  return a})

add('strata cliff', ()=>{const a=g()
  // 대각 퇴적 절벽 — 정적 재료만(설정 유지)
  const bands=[STONE,WOOD,METAL,STONE,WOOD,STONE]
  for(let x=0;x<W;x++){let y=140+((x*0.18)|0);for(let bi=0;bi<bands.length;bi++){const h=[70,40,24,44,30,120][bi];for(let k=0;k<h;k++){if(y<H)a[y*W+x]=bands[bi];y++}}}
  return a}); scenes[scenes.length-1].noSettle=true

// ── 간이 물리 안정화 (앱의 낙사 규칙 축약) ──
const _POW=new Set([SAND,SALT,ASH,GUNPOWDER,SEED]), _LIQ=new Set([WATER,OIL,ACID,LAVA])
const _DEN={[SAND]:5,[SALT]:5,[ASH]:4,[GUNPOWDER]:5,[SEED]:4,[WATER]:3,[OIL]:2,[ACID]:3,[LAVA]:6}
const _mob=m=>_POW.has(m)||_LIQ.has(m)
function settle(a,iters){const ix=(x,y)=>y*W+x
  for(let it=0;it<iters;it++){const l2r=it%2===0
    for(let y=H-2;y>=0;y--)for(let k=0;k<W;k++){const x=l2r?k:W-1-k;const m=a[ix(x,y)];if(!_mob(m))continue
      const bi=ix(x,y+1),b=a[bi]
      if(b===EMPTY){a[bi]=m;a[ix(x,y)]=EMPTY;continue}
      if(_LIQ.has(b)&&_DEN[m]>_DEN[b]){a[bi]=m;a[ix(x,y)]=b;continue} // 무거운 게 가벼운 액체 밑으로(층 분리)
      const dirs=l2r?[-1,1]:[1,-1];let mv=false
      for(const dx of dirs){const nx=x+dx;if(nx<0||nx>=W)continue;const d=a[ix(nx,y+1)]
        if(d===EMPTY){a[ix(nx,y+1)]=m;a[ix(x,y)]=EMPTY;mv=true;break}
        if(_LIQ.has(d)&&_DEN[m]>_DEN[d]){a[ix(nx,y+1)]=m;a[ix(x,y)]=d;mv=true;break}}
      if(mv)continue
      if(_LIQ.has(m))for(const dx of dirs){const nx=x+dx;if(nx<0||nx>=W)continue;if(a[ix(nx,y)]===EMPTY){a[ix(nx,y)]=m;a[ix(x,y)]=EMPTY;break}}}}
}

// ── RLE + deflate-raw + base64url (앱 포맷) ──
const V=1
function pushVarint(out,v){while(v>=0x80){out.push((v&0x7f)|0x80);v>>>=7}out.push(v)}
function rleEncode(cells){const bytes=[];pushVarint(bytes,V);pushVarint(bytes,W);pushVarint(bytes,H)
  let runMat=cells[0]&0xff,runLen=0
  for(let i=0;i<W*H;i++){const m=cells[i]&0xff;if(m===runMat)runLen++;else{bytes.push(runMat&0xff);pushVarint(bytes,runLen);runMat=m;runLen=1}}
  bytes.push(runMat&0xff);pushVarint(bytes,runLen);return Buffer.from(bytes)}
function encodeScene(cells){const raw=rleEncode(cells);const def=zlib.deflateRawSync(raw,{level:9});
  return def.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}

// ── PNG 인코더(truecolor) ──
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})()
function crc32(buf){let c=0xffffffff;for(let i=0;i<buf.length;i++)c=CRC[(c^buf[i])&0xff]^(c>>>8);return(c^0xffffffff)>>>0}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const t=Buffer.from(type,'ascii');const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc])}
function png(width,height,rgbBuf){const sig=Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0
  const stride=width*3;const raw=Buffer.alloc((stride+1)*height);for(let y=0;y<height;y++){raw[y*(stride+1)]=0;rgbBuf.copy(raw,y*(stride+1)+1,y*stride,y*stride+stride)}
  const idat=zlib.deflateSync(raw,{level:9})
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))])}

// 격자 → 640×320 썸네일 rgb 버퍼 (nearest 다운샘플 + emissive 밝힘)
const TW=640,TH=320
function thumbRGB(cells){const buf=Buffer.alloc(TW*TH*3);const sx=W/TW,sy=H/TH
  for(let ty=0;ty<TH;ty++)for(let tx=0;tx<TW;tx++){const cx=(tx*sx)|0,cy=(ty*sy)|0;const m=cells[cy*W+cx]&0xff
    let [r,gg,b]=RGB[m]||RGB[0];const e=EMISS[m]||0;if(e>0){const k=1+Math.min(0.75,e*0.32);r=Math.min(255,r*k);gg=Math.min(255,gg*k);b=Math.min(255,b*k)}
    const o=(ty*TW+tx)*3;buf[o]=r;buf[o+1]=gg;buf[o+2]=b}
  return buf}

// ── 실행: 각 씬 인코딩 + 썸네일 + 컨택트시트 ──
const manifest=[]
const cols=3,rows=Math.ceil(scenes.length/cols),cw=TW/2,ch=TH/2 // 컨택트 타일 320×160
const sheet=Buffer.alloc(cols*cw*rows*ch*3)
scenes.forEach((s,i)=>{const cells=s.fn()
  settle(cells, s.noSettle?0:260) // 물리 안정화 — 유기적 더미·액체 층분리
  const data=encodeScene(cells)
  const trgb=thumbRGB(cells)
  const pngBuf=png(TW,TH,trgb)
  fs.writeFileSync(`${OUT}/${String(i).padStart(2,'0')}_${s.title.replace(/\s+/g,'-')}.png`,pngBuf)
  // 컨택트 타일(절반 스케일)
  const gx=(i%cols)*cw,gy=(Math.floor(i/cols))*ch
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const so=((y*2)*TW+(x*2))*3;const di=((gy+y)*(cols*cw)+(gx+x))*3;sheet[di]=trgb[so];sheet[di+1]=trgb[so+1];sheet[di+2]=trgb[so+2]}
  manifest.push({i,title:s.title,dataLen:data.length,data})
  console.log(`${String(i).padStart(2)} ${s.title.padEnd(16)} data=${data.length}c thumb=${pngBuf.length}B`)
})
fs.writeFileSync(`${OUT}/_contact.png`,png(cols*cw,rows*ch,sheet))
fs.writeFileSync(`${OUT}/_manifest.json`,JSON.stringify(manifest,null,0))
console.log(`\n컨택트시트: ${OUT}/_contact.png  (${cols}x${rows})`)
console.log(`매니페스트: ${manifest.length}개`)
