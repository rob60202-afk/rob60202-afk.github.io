// L003〈報價單上漏掉的那一行〉第 3 單元:第 3 章「成本是一棟六層樓」
// 每一列 = 腳本裡的一列「旁白或台詞」,文字照抄(不含說話者標籤)。
//   who   :對嘴用的角色代號(narrator 旁白 · shu 阿樹 · master 陳師傅)
//   voice :piper 轉接程式的語音設定(語言[,pitch=音高倍率]),見 animation/lib/LONGFORM.md 的聲音表
//   display:字幕要顯示的寫法(只把金額換成阿拉伯數字加千分位;念的還是 text)。「|」= 太長的句子從這裡換下一行字幕
(function () {
  const NARR = 'zh-TW', SHU = 'zh-TW,pitch=1.08', MASTER = 'zh-TW,pitch=0.86';
  const LINES = [
    { who: 'narrator', voice: NARR, text: '回到公司，師傅沒有罵他，只在白板上畫了一棟六層樓的房子。' },
    { who: 'master', voice: MASTER, text: '成本是一層一層蓋上去的。你蓋了幾層？' },
    { who: 'shu', voice: SHU, text: '材料、工資……利潤、稅。四層。' },
    { who: 'master', voice: MASTER, text: '中間空兩層，房子當然會塌。' },
    { who: 'narrator', voice: NARR, text: '第一層，材料。管子、管件、閥，還有吊架。第二層，工資。誰來做，做幾天。' },
    { who: 'narrator', voice: NARR, text: '第三層，機具與耗材。高空車、焊機、氬氣。' },
    { who: 'narrator', voice: NARR, text: '第四層，間接費用。搬運、保護、測試、文件、現場管理、保險。這些東西不會留在客戶的廠裡，可是每一樣都要花錢。',
      display: '第四層，間接費用。搬運、保護、測試、|文件、現場管理、保險。這些東西不會留在客戶的廠裡，可是每一樣都要花錢。' },
    { who: 'narrator', voice: NARR, text: '第五層，管理費與利潤。第六層，稅。新手最容易整層不見的，是第四層。' },
    { who: 'narrator', voice: NARR, text: '要注意，這六層是你自己算成本用的。給客戶的那一張，照客戶的格式寫，行數可以少。但是裡面這六層，一定要算過。' },
    { who: 'narrator', voice: NARR, text: '公共工程的標單，常把安全衛生、品管各自拉成一行。民間的報價單常常沒有。沒有那一行，不代表不用花那個錢。',
      display: '公共工程的標單，|常把安全衛生、品管各自拉成一行。民間的報價單常常沒有。沒有那一行，不代表不用花那個錢。' },
    { who: 'master', voice: MASTER, text: '還有，管理費跟利潤是兩件事。管理費是公司開門的成本，利潤才是賺的。寫成同一行，你就會以為那兩萬全部是你的。',
      display: '還有，管理費跟利潤是兩件事。管理費是公司開門的成本，利潤才是賺的。寫成同一行，你就會以為那 20,000 全部是你的。' },
    { who: 'shu', voice: SHU, text: '可是師傅，那一成我有算啊。' },
    { who: 'master', voice: MASTER, text: '一成是乘在誰上面？底下少算，上面那一成也跟著變少。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
