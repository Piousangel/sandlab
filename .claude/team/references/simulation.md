# 레퍼런스: 시뮬레이션 엔진 (Sim Architect) — 연구 사이클 2

WebGPU 낙사 구현 기법. "싸구려 데모"와 "살아있는 물질"을 가르는 것. 출처 있는 자료.
(주의: 시뮬 변경은 시각 검증이 WebGPU 실기기 필요 → 대부분 needsUser. "시뮬에 더 붓지 마라" 원칙 유의.)

## 핵심 사실 (출처)
- **셀 = 정확히 32비트**(Sandspiel: species u8 | ra u8 | rb u8 | clock u8) → 4바이트 RGBA 텍스처에 직결(zero-copy GPU 업로드). ra는 픽셀별 밝기 변주(grain) 난수 레지스터. → https://maxbittker.com/making-sandspiel/
- **레이스 프리 GPU 갱신 = 블록 CA + Margolus 이웃**: 격자를 겹치지 않는 2×2 블록으로 나누고 교대 스텝마다 파티션을 대각으로 1칸 이동 → 스레드마다 블록 소유, 같은 셀 동시 쓰기 없음(atomics 불필요), ping-pong 더블버퍼와 자연 짝. → http://zvold.blogspot.com/2010/03/margolus-neighborhood-in-cellular.html
- **naive 2-step 대각 Margolus는 방향 편향(추한 움직임)** → granular-media CA 문헌의 해법은 **확률적 4-step z자 블록 시프트 사이클**(방향 편향 상쇄). → https://github.com/GelamiSalami/GPU-Falling-Sand-CA (arXiv:2008.06341 인용)
- **픽셀당 발광(emissive) 조명 = 노력 대비 최고 시각 임팩트**: 일부 물질만 발광(불·독·기체·물), 지형은 어둡게 → 그림자·깊이. GPU 방법: RGB별 Jump Flooding Algorithm, 또는 이웃 샘플 누적 가짜 블룸(추가 패스 없음). → https://www.slowrush.dev/news/lighting-falling-sand/
- **CPU 스캔라인은 행별 스캔 방향 랜덤화**(Math.random()>0.5로 좌/우 패스)로 편향 회피 + dirty-rect로 변경 셀만 재시뮬. GPU에선 불필요(블록 CA가 대체). → https://jason.today/falling-improved
- **WebGPU 컴퓨트 = WebGL 프래그먼트 가짜 컴퓨트 대비 질적 도약**(네이티브 스토리지 버퍼·워크그룹 공유메모리·atomics). 관용 패턴은 ping-pong 더블버퍼. → https://webgpufundamentals.org/webgpu/lessons/webgpu-compute-shaders.html

## sandlab 통찰
1. **[agentSafe·코어] 4-step z-Margolus 블록 CA** — atomics 없이 레이스프리 + 방향편향 제거. (현재 엔진이 Margolus 이웃 사용 중 — 4-step 여부는 코드 확인 필요.)
2. **[agentSafe/시각검증 필요] 픽셀당 발광 + 블룸** — 이미 블룸 있음(핸드오프 "밝힘"). 발광 물질 확대는 시각 판단.
3. **[tech-health] 엄격한 ping-pong 더블버퍼**(read N, write N+1, 한 패스 내 read-after-write 금지) — 현재 엔진이 이미 cells[2] 더블버퍼 사용.
4. **[agentSafe/시각검증 필요] 가스/불/연기용 경량 속도장(velocity/wind field)** — granular solid엔 미적용. Sandspiel이 Pavel Dobryakov WebGL fluid 차용. "살아있는" 느낌의 원천이나 시각 검증 필요.

## 열린 질문
- 현재 engine.ts가 2-step vs 4-step z-Margolus 중 무엇인가 (방향 편향 여부) — 코드 확인 후 verify-margolus 불변식과 대조.
- 속도장 추가가 성능(72만 셀 100fps)을 얼마나 깎나 — 실측 필요(WebGPU).
