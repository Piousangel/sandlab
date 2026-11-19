// 03시 QA: Spill 레벨을 정답 동작(level dev 배열)으로 포인터 드래그 재생 → RUN 탭 → 결과 카드 Share 문구·localStorage 확인.
// 사용: ACTS='[[0,"dig",9,9,9,12],[0,"dig",29,10,29,13]]' U=/daily node scripts/qa/play.cjs  (보드 40x60 타일 가정)
const { chromium } = require('playwright');
const ACTS = JSON.parse(process.env.ACTS); const URL_ = process.env.U;
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await ctx.newPage();
const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.goto((process.env.BASE||'http://localhost:8799')+URL_);await p.waitForTimeout(1500);
const sy0 = await p.evaluate(()=>scrollY);
const ov = p.locator('canvas').nth(1); const r = await ov.boundingBox();
const px=(tx,ty)=>[r.x+(tx+0.5)/40*r.width, r.y+(ty+0.5)/60*r.height];
for (const [, verb, x1,y1,x2,y2] of ACTS){ const [ax,ay]=px(x1,y1),[bx,by]=px(x2,y2);
  await p.mouse.move(ax,ay);await p.mouse.down();for(let i=1;i<=8;i++)await p.mouse.move(ax+(bx-ax)*i/8,ay+(by-ay)*i/8);await p.mouse.up();await p.waitForTimeout(300);}
const sy1 = await p.evaluate(()=>scrollY);
await p.getByRole('button',{name:/RUN/}).first().tap();
await p.waitForTimeout(12000);
await p.screenshot({path:(process.env.OUT||'.')+'/play-result.png'});
console.log(JSON.stringify(await p.evaluate(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k).slice(0,200)}return o})));
console.log('scroll before/after drag',sy0,sy1,'errs',JSON.stringify(errs));
await ctx.grantPermissions(['clipboard-read','clipboard-write']);await p.getByRole('button',{name:'Share',exact:true}).tap();await p.waitForTimeout(500);console.log('card share text:',await p.evaluate(()=>[...document.querySelectorAll('section[role=dialog] *')].map(e=>e.value||'').filter(Boolean).join('|')||document.querySelector('section[role=dialog]')?.innerText));
await b.close();})();
