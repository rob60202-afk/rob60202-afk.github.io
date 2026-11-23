// 頻道圖像素材:頭像、橫幅、L003 長片縮圖。沒有配音也沒有音樂,這裡的「時間」只用來選要畫哪一張圖。
//   @avatar  頭像(用 --format 1:1 算)
//   @banner  橫幅(16:9,用 --res 1440 算成 2560×1440)
//   @thumb   L003 縮圖(16:9,1080p 算完再縮成 1280×720)
// 實際的算圖與縮放指令在 build.sh。
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const FPS = 30;
  const FORMAT = U.pickFormat('16:9');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const DURATION = 3;
  const PIECES = { avatar: [0, 1], banner: [1, 2], thumb: [2, 3] };
  const markers = { avatar: 0.5, banner: 1.5, thumb: 2.5 };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, PIECES, markers };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
