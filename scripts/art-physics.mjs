/** 낙사 물리 근사 — "씬을 열면 무슨 일이 벌어지나"를 보기 위함. 앱 Margolus와 완전동일은 아니고
 *  이동(밀도)·핵심 반응·기체수명을 그럴듯하게 재현. 아트 설계용(최종은 실제 앱에서 확인). */
export const W=1200,H=600
const EMPTY=0,WALL=1,STONE=2,METAL=3,WOOD=4,PLANT=5,ICE=6,SAND=7,SALT=8,ASH=9,GUNPOWDER=10,SEED=11,WATER=12,OIL=13,ACID=14,LAVA=15,FIRE=16,STEAM=17,SMOKE=18
// movement: 0 static, 1 powder, 2 liquid, 3 gas
const MV={0:3,1:0,2:0,3:0,4:0,5:0,6:0,7:1,8:1,9:1,10:1,11:1,12:2,13:2,14:2,15:2,16:3,17:3,18:3}
const DEN={0:0,1:9,2:8,3:9,4:7,5:6,6:4,7:5,8:5,9:4,10:5,11:4,12:3,13:2,14:3,15:6,16:1,17:1,18:1}
const LIFE0={16:45,17:150,18:120} // 기체 수명
const isPow=m=>MV[m]===1, isLiq=m=>MV[m]===2, isGas=m=>MV[m]===3, isMob=m=>MV[m]!==0, isStat=m=>MV[m]===0&&m!==EMPTY

// 결정적 난수(x,y,tick)
function rnd(x,y,t){let n=(x*374761+y*668265+t*2246822519)>>>0;n=(n^(n>>13))*1274126177>>>0;return((n^(n>>16))>>>0)/4294967296}

// 반응표: [self, other] → {p, becomeSelf, becomeOther}. 접촉 시 확률로.
const RX = {
  // key = self*32+other
}
function addRx(self,other,p,bs,bo){RX[self*32+other]={p,bs,bo}}
addRx(WOOD,FIRE,0.12,FIRE,FIRE)
addRx(PLANT,FIRE,0.35,FIRE,FIRE); addRx(PLANT,WATER,0.03,PLANT,PLANT) // 물 타고 자람
addRx(SEED,WATER,0.08,PLANT,EMPTY) // 씨앗+물→식물
addRx(ICE,LAVA,0.9,WATER,STONE); addRx(ICE,FIRE,0.5,WATER,STEAM)
addRx(SALT,WATER,0.05,EMPTY,WATER)
addRx(GUNPOWDER,FIRE,0.85,FIRE,FIRE); addRx(GUNPOWDER,LAVA,0.85,FIRE,FIRE)
addRx(WATER,FIRE,0.9,STEAM,STEAM); addRx(WATER,LAVA,0.6,STEAM,STONE)
addRx(OIL,FIRE,0.5,FIRE,FIRE); addRx(OIL,LAVA,0.6,FIRE,FIRE)
addRx(ACID,METAL,0.25,ACID,EMPTY); addRx(ACID,STONE,0.12,ACID,EMPTY); addRx(ACID,WOOD,0.3,ACID,EMPTY); addRx(ACID,WATER,0.4,STEAM,STEAM)
addRx(LAVA,WOOD,0.4,LAVA,FIRE); addRx(LAVA,PLANT,0.6,LAVA,FIRE); addRx(LAVA,OIL,0.7,LAVA,FIRE)
addRx(FIRE,WOOD,0.15,FIRE,FIRE); addRx(FIRE,OIL,0.5,FIRE,FIRE); addRx(FIRE,PLANT,0.3,FIRE,FIRE)

const N4=[[0,-1],[0,1],[-1,0],[1,0]]

export function makeLife(cells){const life=new Int16Array(W*H);for(let i=0;i<W*H;i++){const m=cells[i];if(LIFE0[m])life[i]=LIFE0[m]}return life}

export function step(cells,life,t){
  const idx=(x,y)=>y*W+x
  // 1) 반응 (contact)
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=idx(x,y),m=cells[i];if(m===EMPTY)continue
    for(const[dx,dy]of N4){const nx=x+dx,ny=y+dy;if(nx<0||nx>=W||ny<0||ny>=H)continue;const ni=idx(nx,ny),o=cells[ni]
      const r=RX[m*32+o];if(r&&rnd(x,y,t)<r.p){cells[i]=r.bs;cells[ni]=r.bo;if(LIFE0[r.bs])life[i]=LIFE0[r.bs];if(LIFE0[r.bo])life[ni]=LIFE0[r.bo];break}}}
  // 2) 기체 수명
  for(let i=0;i<W*H;i++){const m=cells[i];if(LIFE0[m]){if(--life[i]<=0){cells[i]= m===FIRE?(rnd(i,0,t)<0.4?SMOKE:EMPTY):EMPTY;if(cells[i]===SMOKE)life[i]=LIFE0[SMOKE]}}}
  // 3) 이동: 아래→위(가루/액체 낙하), 그 뒤 기체 상승
  const dir=t%2?1:-1
  for(let y=H-2;y>=0;y--)for(let k=0;k<W;k++){const x=dir>0?k:W-1-k;const i=idx(x,y),m=cells[i];if(!isPow(m)&&!isLiq(m))continue
    const bi=idx(x,y+1),b=cells[bi]
    if(b===EMPTY){cells[bi]=m;cells[i]=EMPTY;continue}
    if((isLiq(b)||isPow(b))&&DEN[m]>DEN[b]){cells[bi]=m;cells[i]=b;continue}
    let moved=false
    for(const dx of (dir>0?[-1,1]:[1,-1])){const nx=x+dx;if(nx<0||nx>=W)continue;const d=cells[idx(nx,y+1)]
      if(d===EMPTY){cells[idx(nx,y+1)]=m;cells[i]=EMPTY;moved=true;break}
      if((isLiq(d))&&DEN[m]>DEN[d]){cells[idx(nx,y+1)]=m;cells[i]=d;moved=true;break}}
    if(moved)continue
    if(isLiq(m))for(const dx of (dir>0?[-1,1]:[1,-1])){const nx=x+dx;if(nx<0||nx>=W)continue;if(cells[idx(nx,y)]===EMPTY){cells[idx(nx,y)]=m;cells[i]=EMPTY;break}}}
  // 기체 상승
  for(let y=1;y<H;y++)for(let k=0;k<W;k++){const x=dir>0?k:W-1-k;const i=idx(x,y),m=cells[i];if(!isGas(m))continue
    const ai=idx(x,y-1),ab=cells[ai]
    if(ab===EMPTY){cells[ai]=m;cells[i]=EMPTY;if(LIFE0[m]){life[ai]=life[i];life[i]=0}continue}
    for(const dx of (dir>0?[-1,1]:[1,-1])){const nx=x+dx;if(nx<0||nx>=W)continue;if(cells[idx(nx,y-1)]===EMPTY){cells[idx(nx,y-1)]=m;cells[i]=EMPTY;if(LIFE0[m]){life[idx(nx,y-1)]=life[i];life[i]=0}break}}}
}

export function simulate(cells,steps){const life=makeLife(cells);for(let t=0;t<steps;t++)step(cells,life,t);return cells}
