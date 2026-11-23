// L003〈報價單上漏掉的那一行〉第 1 單元:開場鉤子 + 第 1 章「一個晚上的報價單」
// 每一列 = 腳本裡的一列「旁白或台詞」,文字照抄(不含說話者標籤)。
//   who   :對嘴用的角色代號(narrator 旁白 · shu 阿樹 · master 陳師傅 · client 甲方承辦)
//   voice :piper 轉接程式的語音設定(語言[,pitch=音高倍率]),見 animation/lib/LONGFORM.md 的聲音表
//   display:字幕要顯示的寫法(只把金額與數量換成阿拉伯數字加千分位;念的還是 text)
(function () {
  const NARR = 'zh-TW', SHU = 'zh-TW,pitch=1.08', MASTER = 'zh-TW,pitch=0.86', WOMAN = 'zh-TW,pitch=1.15';
  const LINES = [
    // ---- 開場鉤子 ----
    { who: 'narrator', voice: NARR, text: '阿樹第一次自己報價，只花一個晚上，隔天就得標。' },
    { who: 'narrator', voice: NARR, text: '開工前去現場會勘，師傅抬頭看了一眼天花板，問了一句話，這個案子的利潤就不見了。' },
    { who: 'master', voice: MASTER, text: '這麼高，你的高空車算在哪一行？' },
    { who: 'narrator', voice: NARR, text: '今天十分鐘，我們把這張報價單重算一次。' },
    // ---- 第 1 章 一個晚上的報價單 ----
    { who: 'narrator', voice: NARR, text: '阿樹在一家小配管工程行上班，今年第二年。老闆丟給他一張圖：客戶的廠房要拉一條兩吋的不鏽鋼管送壓縮空氣，全部用焊的。' },
    { who: 'shu', voice: SHU, text: '報價喔？我來！一個晚上就好。' },
    { who: 'narrator', voice: NARR, text: '管子，圖上量起來九十米，一米一千，九萬。彎頭、三通、閥件，三萬。材料十二萬。',
      display: '管子，圖上量起來 90 米，一米 1,000，90,000。彎頭、三通、閥件，30,000。材料 120,000。' },
    { who: 'narrator', voice: NARR, text: '工資，他問了配合的工班班長。兩個人做十天，一人一天四千，八萬。',
      display: '工資，他問了配合的工班班長。兩個人做 10 天，一人一天 4,000，80,000。' },
    { who: 'narrator', voice: NARR, text: '加起來二十萬。再加一成的管理費跟利潤，兩萬。未稅二十二萬，含稅二十三萬一千。',
      display: '加起來 200,000。再加一成的管理費跟利潤，20,000。未稅 220,000，含稅 231,000。' },
    { who: 'narrator', voice: NARR, text: '先講清楚，這一集的數字都是為了好算才編的整數，不是行情，請不要拿去報價。' },
    { who: 'shu', voice: SHU, text: '材料、工資、利潤、稅，都有了。完美。' },
    { who: 'client', voice: WOMAN, text: '三家裡面你們回最快，價錢也最漂亮。就給你們做。' },
    { who: 'narrator', voice: NARR, text: '價錢最漂亮。這句話，阿樹當時聽起來是稱讚。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
