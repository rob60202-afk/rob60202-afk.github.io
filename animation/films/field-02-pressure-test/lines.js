// 工程現場故事 第 2 集:他只是想省一個晚上
(function () {
  const LINES = [
    { text: '明天就要交件了,管子終於全部接完。' },
    { text: '照規矩,還要做一整晚的保壓測試。' },
    { text: '阿樹看看時間。「都鎖得這麼緊了,應該不會漏吧。」', who: 'shu' },
    { text: '他收了工具,回家睡覺。' },
    { text: '隔天業主來驗收,壓力錶的指針,慢慢往下掉。' },
    { text: '漏點,在最裡面的那一個接頭。' },
    { text: '要修它,前面三天裝好的東西,全部要拆。' },
    { text: '師傅陪他拆到半夜,只說了一句話。' },
    { text: '「測試不是做給業主看的,是做給你自己睡得著的。」', who: 'master' },
    { text: '省下來的那一個晚上,最後用三天還。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
