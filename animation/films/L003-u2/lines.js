// L003〈報價單上漏掉的那一行〉第 2 單元:第 2 章「天花板上的那一行」
// 每一列 = 腳本裡的一列「旁白或台詞」,文字照抄(不含說話者標籤)。
//   who   :對嘴用的角色代號(narrator 旁白 · shu 阿樹 · master 陳師傅)
//   voice :piper 轉接程式的語音設定(語言[,pitch=音高倍率]),見 animation/lib/LONGFORM.md 的聲音表
//   display:字幕要顯示的寫法(只把金額與數量換成阿拉伯數字加千分位;念的還是 text)。「|」= 太長的句子從這裡換下一行字幕
//   gain  :這一句的音量倍率(只有阿樹「小小聲」那一句用)
(function () {
  const NARR = 'zh-TW', SHU = 'zh-TW,pitch=1.08', MASTER = 'zh-TW,pitch=0.86';
  const LINES = [
    { who: 'narrator', voice: NARR, text: '開工前會勘那天，陳師傅走進廠房，沒有看圖，先抬頭。' },
    { who: 'master', voice: MASTER, text: '管子走哪裡？' },
    { who: 'shu', voice: SHU, text: '上面啊，貼著天花板走。' },
    { who: 'master', voice: MASTER, text: '多高？' },
    { who: 'shu', voice: SHU, text: '……六米。', display: '……6 米。' },
    { who: 'master', voice: MASTER, text: '六米。那你的高空車，算在報價單的哪一行？', display: '6 米。那你的高空車，算在報價單的哪一行？' },
    { who: 'narrator', voice: NARR, text: '阿樹把報價單翻過來，又翻過去。沒有那一行。' },
    { who: 'shu', voice: SHU, text: '我想說……跟廠裡借一把梯子就好。', gain: 0.75 },
    { who: 'master', voice: MASTER, text: '六米的梯子。你爬，我不爬。', display: '6 米的梯子。你爬，我不爬。' },
    { who: 'narrator', voice: NARR, text: '這種高度，不是扛一把梯子就能上去的，要用施工架或高空作業車。一台車租十天，一天兩千五，兩萬五。',
      display: '這種高度，不是扛一把梯子就能上去的，要用施工架或高空作業車。一台車租 10 天，一天 2,500，25,000。' },
    { who: 'narrator', voice: NARR, text: '他以為會賺的那兩萬，當場變成負五千。', display: '他以為會賺的那 20,000，當場變成 −5,000。' },
    { who: 'narrator', voice: NARR, text: '車也不會自己走過來。板車進場、退場各一趟，一趟四千五，比租一天還貴。車停在現場沒在用的那幾天，租金照算。',
      display: '車也不會自己走過來。板車進場、退場各一趟，一趟 4,500，比租一天還貴。車停在現場沒在用的那幾天，租金照算。' },
    { who: 'master', voice: MASTER, text: '不要急著哭。這還只是第一行。' },
    { who: 'narrator', voice: NARR, text: '師傅沒有說錯。那天一路走下去，後面又排了好幾行。材料只能卸在大門口。新管要接上舊的主管，得先停氣。工人進廠之前，要先上一整天的課。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
