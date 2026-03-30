Original prompt: 지금 그리고 그냥 돌아다니기만 해서 재미가 없어 돌아다니면서 뭔가를 하면 좋겠는데. F부터 A까지 모두 먹으면 난사가 나간다거나 코어에서 뭐 그런거 재밌는거 완전 다른것도 상관없어 그런거 어때?

- 2026-03-31: Added a roaming reward concept plan: collect F-A shards while moving, then trigger a short core overdrive barrage.
- 2026-03-31: Implemented F-A roaming protocol shards in `DefenseGame`, added HUD/state output, and wired a short core overdrive barrage with 3-shot fire.
- 2026-03-31: Verified syntax with `node --check` on modified files.
- 2026-03-31: Verified in browser that safe-zone shards render on screen and text state reports shard positions.
- 2026-03-31: Verified overdrive activation via Playwright/eval path; state showed `active: true`, all letters collected, and core barrage created 3 pink projectiles.
- TODO: If needed later, tune shard spacing and overdrive balance after real gameplay sessions.
