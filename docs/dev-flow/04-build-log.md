# S4 Build Log

## 啟動方式

- 直接開啟 `index.html`
- 或執行 `npm start`，開啟 `http://127.0.0.1:4188`

## Backlog

- [x] 左右旋轉視角與藏在兩側的敵人
- [x] 按住噴水與冰凍值 0–100%
- [x] 完全冰凍後擊碎與鄰近連鎖
- [x] 普通、快速、胖型、盾牌四種敵人
- [x] 全畫面冰爆必殺技
- [ ] Boss 與完整關卡結算
- [ ] 實體水槍控制器輸入
- [ ] 原創美術與音效資產

## 2026-09-26 垂直切片 1：可遊玩原型

- 建立 Canvas 場景、HUD、觸控與鍵盤控制、敵人狀態機、波次與計分。
- 核心冰凍／連鎖規則拆至 `src/mechanics.js`，並加入 Node 單元測試。

## 2026-09-26 發佈：GitHub Pages

- 使用 `gh-pages` 分支部署靜態遊戲，避免依賴 GitHub Actions workflow 權限。
- 公開網址：`https://freshrogerchang-dev.github.io/monster-game/`

## 2026-09-26 垂直切片 2：3D 手機體感版

- 重建為 Three.js/WebGL 第一人稱 3D 場景，加入立體遊樂園、低多邊形殭屍與第一人稱花朵水槍。
- 移除左右按鈕，以 Device Orientation 控制鏡頭；桌機只保留滑鼠拖曳備援。
- 殭屍會朝玩家前進，接觸後扣血；生命歸零可重新開始。
- 按住畫面射擊，累積冰凍值後擊碎敵人。
