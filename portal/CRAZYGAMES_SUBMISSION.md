# CrazyGames Basic Launch 제출 초안

계정 생성·업로드는 사용자 직접 수행 필요(developer.crazygames.com). 아래는 폼에 붙여넣을 텍스트 초안.

## 제출 파일
- `portal/sandlab-portal.zip` (없으면 재생성: `cd portal && npm run build && cd dist && zip -r ../sandlab-portal.zip .`)
- 755KB, 4파일 — Basic Launch 한도(50MB/1500파일) 여유 충분

## Title
Sand Sim

(다른 후보: Falling Sand, Sand Box Physics — CrazyGames 내 기존 타이틀과 중복 여부 확인 후 확정 필요)

## Short description (~100자)
Draw with falling sand, water, lava and more. A physics sandbox you can pour, mix, and record.

## Long description
A falling-sand physics playground right in your browser — no install, no sign-up.

Pick a material — sand, water, oil, lava, acid, gunpowder, ice, plant seeds and more — and pour it
onto the canvas. Watch sand pile into dunes, water find its level, lava ignite oil, acid eat through
stone. Every material reacts differently when it touches another.

- 18 materials across solids, powders, liquids and gases
- Real physics simulation, not pre-baked animations
- Record a 10-second clip of your creation to share
- Runs entirely in your browser — powered by WebGPU

## Category
Simulation / Sandbox (CrazyGames 카테고리 명칭에 맞춰 조정)

## Tags
sandbox, physics, simulation, falling sand, sand game, casual, relaxing, no install

## Controls
- Click/tap + drag: pour selected material
- Bottom dock: pick a material, adjust brush size
- Erase button (or right-click on desktop): erase
- Clear: reset canvas
- Record: capture a 10-second clip to download

## Monetization / age rating
- No violence, no user data collection in this build (network/gallery/creator features excluded from portal build by design)
- Suitable for all ages

## 참고
- 브랜드(sandlab.app 텍스트·Ko-fi·AdSense) 전부 이 빌드에서 제외됨 — CrazyGames 자체 트래픽 위에서
  광고 수익쉐어만 받는 구조(설계 의도, `.claude/handoff/main.md` 참고)
- 워터마크: `engine.recording` 플래그를 세팅하지 않아 클립에 워터마크 없음(의도된 동작)
