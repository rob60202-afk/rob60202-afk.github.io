// 工程現場故事 第 1 集:報價單上漏掉的那一行
(function () {
  const LINES = [
    { text: '阿樹第一次自己報價,只花了一個晚上。' },
    { text: '材料、工資、管理費,每一項他都算得清清楚楚。' },
    { text: '業主很快就簽了。阿樹覺得,自己出師了。' },
    { text: '進場第一天,師傅抬頭看了一眼天花板。' },
    { text: '這麼高,你的高空車,算在哪一行?', who: 'master' },
    { text: '阿樹翻遍了報價單。沒有那一行。' },
    { text: '那一趟高空車的租金,吃掉了整個案子的利潤。' },
    { text: '師傅沒有罵他,只給了他一張紙。' },
    { text: '我年輕的時候也漏過。漏一次,寫一條。', who: 'master' },
    { text: '報價漏掉一行,不是少一行字,是少一筆錢。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
