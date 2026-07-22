/** 아트 하네스 — 시네마틱 렌더러(멀티스케일 HDR bloom·ACES 톤맵·비네트·그레인·4x SS) + 씬 API.
 *  export: renderScene(fn)->PNG buffer, HELPERS(씬 함수에 주입). 다른 스크립트가 import해서 씬 배열 렌더. */
import zlib from 'node:zlib'
export const W = 1200, H = 600
export const M = { EMPTY:0,WALL:1,STONE:2,METAL:3,WOOD:4,PLANT:5,ICE:6,SAND:7,SALT:8,ASH:9,GUNPOWDER:10,SEED:11,WATER:12,OIL:13,ACID:14,LAVA:15,FIRE:16,STEAM:17,SMOKE:18 }
const HEX = {0:'#07090D',1:'#525A6B',2:'#79808C',3:'#B9C2CE',4:'#6B4423',5:'#43B04A',6:'#A8E4EC',7:'#E8C87A',8:'#F2F4F7',9:'#5E5A57',10:'#2E3033',11:'#B4D96A',12:'#2E6FD9',13:'#4A3520',14:'#8CFF2E',15:'#FF5A0A',16:'#FF7A18',17:'#D6E2EA',18:'#4C5058'}
// 발광 강도(HDR). 톤맵 후 코어가 화이트핫이 되도록 크게.
const EMIT = {6:1.7,14:3.4,15:5.5,16:6.5,17:0.8}
const rgbv = h => [parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255]
const COL = Object.fromEntries(Object.entries(HEX).map(([k,v])=>[k,rgbv(v)]))

// ── 씬 API 헬퍼 ──
export function h2(x,y){let n=(x|0)*374761393+(y|0)*668265263;n=(n^(n>>13))*1274126177;return((n^(n>>16))>>>0)/4294967296}
function vn(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf)
  const a=h2(xi,yi),b=h2(xi+1,yi),c=h2(xi,yi+1),d=h2(xi+1,yi+1);return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v}
export function fbm(x,y){let s=0,a=0.5,f=1;for(let i=0;i<5;i++){s+=a*vn(x*f,y*f);f*=2;a*=0.5}return s}
const g = () => new Uint8Array(W*H)
const set=(a,x,y,m)=>{if(x>=0&&x<W&&y>=0&&y<H)a[(y|0)*W+(x|0)]=m}
function rect(a,x0,y0,x1,y1,m){for(let y=Math.max(0,y0|0);y<=Math.min(H-1,y1|0);y++)for(let x=Math.max(0,x0|0);x<=Math.min(W-1,x1|0);x++)a[y*W+x]=m}
function disk(a,cx,cy,r,m){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r)set(a,cx+x,cy+y,m)}
function line(a,x0,y0,x1,y1,m,th=1){const dx=x1-x0,dy=y1-y0,n=Math.max(Math.abs(dx),Math.abs(dy))|0||1
  for(let i=0;i<=n;i++){const x=x0+dx*i/n,y=y0+dy*i/n;disk(a,x|0,y|0,Math.max(0,(th/2)|0),m)}}
function vgrad(a,y0,y1,mTop,mBot,region=null){y0|=0;y1|=0;for(let y=y0;y<y1;y++){const t=(y-y0)/(y1-y0)
  for(let x=0;x<W;x++){if(region&&!region(x,y))continue;a[y*W+x]=(h2(x*1.7,y*1.7)<t)?mBot:mTop}}}
export const HELPERS = { W,H,M,g,set,rect,disk,line,vgrad,fbm,h2,
  EMPTY:0,WALL:1,STONE:2,METAL:3,WOOD:4,PLANT:5,ICE:6,SAND:7,SALT:8,ASH:9,GUNPOWDER:10,SEED:11,WATER:12,OIL:13,ACID:14,LAVA:15,FIRE:16,STEAM:17,SMOKE:18 }

// ── PNG ──
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})()
function crc32(b){let c=0xffffffff;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xff]^(c>>>8);return(c^0xffffffff)>>>0}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const ty=Buffer.from(t,'ascii');const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(Buffer.concat([ty,d])));return Buffer.concat([l,ty,d,cr])}
export function png(w,h,rgb){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2
  const st=w*3;const raw=Buffer.alloc((st+1)*h);for(let y=0;y<h;y++){raw[y*(st+1)]=0;rgb.copy(raw,y*(st+1)+1,y*st,y*st+st)}
  return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))])}

// ── 시네마틱 렌더러 ──
const SS=4, TW=640, TH=320, FW=TW*SS, FH=TH*SS
function boxBlur(buf,w,h,r){const tmp=new Float32Array(buf.length)
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++){let s=0,n=0;for(let k=-r;k<=r;k++){const xx=x+k;if(xx<0||xx>=w)continue;s+=buf[(y*w+xx)*3+c];n++}tmp[(y*w+x)*3+c]=s/n}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++){let s=0,n=0;for(let k=-r;k<=r;k++){const yy=y+k;if(yy<0||yy>=h)continue;s+=tmp[(yy*w+x)*3+c];n++}buf[(y*w+x)*3+c]=s/n}}
// ACES 필믹 톤맵
function aces(x){return Math.min(1,Math.max(0,(x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14)))}
export function renderScene(fn){ const a=g(); fn(a); return renderCells(a) }
export function renderCells(a){
  const base=new Float32Array(FW*FH*3), emit=new Float32Array(FW*FH*3)
  const sx=W/FW, sy=H/FH
  for(let y=0;y<FH;y++)for(let x=0;x<FW;x++){const m=a[((y*sy)|0)*W+((x*sx)|0)]&0xff;const c=COL[m]||COL[0];const e=EMIT[m]||0;const o=(y*FW+x)*3
    base[o]=c[0];base[o+1]=c[1];base[o+2]=c[2];if(e>0){emit[o]=c[0]*e;emit[o+1]=c[1]*e;emit[o+2]=c[2]*e}}
  // 멀티스케일 bloom: 작은+큰 블러 합
  const b1=emit.slice();boxBlur(b1,FW,FH,4)
  const b2=emit.slice();boxBlur(b2,FW,FH,14);boxBlur(b2,FW,FH,14)
  const cx=FW/2, cy=FH/2, maxd=Math.hypot(cx,cy)
  const out=Buffer.alloc(TW*TH*3), n=SS*SS
  for(let ty=0;ty<TH;ty++)for(let tx=0;tx<TW;tx++){let R=0,Gg=0,B=0
    for(let dy=0;dy<SS;dy++)for(let dx=0;dx<SS;dx++){const px=tx*SS+dx,py=ty*SS+dy,o=(py*FW+px)*3
      // HDR 합성: 베이스 + 발광 + bloom(멀티스케일)
      let r=base[o]+emit[o]*0.55+b1[o]*0.7+b2[o]*0.5
      let gg=base[o+1]+emit[o+1]*0.55+b1[o+1]*0.7+b2[o+1]*0.5
      let b=base[o+2]+emit[o+2]*0.55+b1[o+2]*0.7+b2[o+2]*0.5
      // 비네트
      const vig=1-0.42*Math.pow(Math.hypot(px-cx,py-cy)/maxd,2.2)
      r*=vig;gg*=vig;b*=vig
      // 톤맵 + sRGB 근사(감마)
      r=Math.pow(aces(r),1/2.2);gg=Math.pow(aces(gg),1/2.2);b=Math.pow(aces(b),1/2.2)
      // 블랙포인트 크러시 — 근검정 배경을 진짜 검정으로 눌러 글로우가 확 살게(전 씬 대비↑).
      const bp=0.10; r=Math.max(0,(r-bp)/(1-bp));gg=Math.max(0,(gg-bp)/(1-bp));b=Math.max(0,(b-bp)/(1-bp))
      R+=r*255;Gg+=gg*255;B+=b*255}
    // (그레인 제거 — per-pixel 노이즈가 PNG 압축을 죽여 썸네일이 300KB 초과했다. SS+그라데이션으로 밴딩 충분히 억제.)
    const o=(ty*TW+tx)*3
    out[o]=Math.max(0,Math.min(255,R/n));out[o+1]=Math.max(0,Math.min(255,Gg/n));out[o+2]=Math.max(0,Math.min(255,B/n))}
  return out}

// data 인코딩(업로드용, 앱 포맷)
const Vv=1
function pushVarint(o,v){while(v>=0x80){o.push((v&0x7f)|0x80);v>>>=7}o.push(v)}
export function encodeCells(a){
  const b=[];pushVarint(b,Vv);pushVarint(b,W);pushVarint(b,H);let rm=a[0]&0xff,rl=0
  for(let i=0;i<W*H;i++){const m=a[i]&0xff;if(m===rm)rl++;else{b.push(rm&0xff);pushVarint(b,rl);rm=m;rl=1}}b.push(rm&0xff);pushVarint(b,rl)
  return zlib.deflateRawSync(Buffer.from(b),{level:9}).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
export function encodeScene(fn){const a=g();fn(a);return encodeCells(a)}
