// 工程現場故事 第 7 集:這個你處理一下
(function () {
  const LINES = [
    { text: '阿樹當課長後,最常講的一句話是:這個你處理一下。' },
    { text: '三天後,部屬交出來的東西,完全不是他要的。' },
    { text: '他忍不住唸了兩句:怎麼會做成這樣?' },
    { text: '部屬小聲說:課長,你沒有說要做成怎樣。', who: 'staff' },
    { text: '阿樹愣住了。他回想自己當時講的話,只有七個字。' },
    { text: '師傅在旁邊泡茶,頭也沒抬。' },
    { text: '「你要的東西只在你腦袋裡,他怎麼看得到?」', who: 'master' },
    { text: '從此阿樹交辦事情,固定講五件事。' },
    { text: '為什麼要做、做到什麼程度、什麼時候要、可以用什麼資源、什麼時候回報。' },
    { text: '交辦不清楚,做錯的責任在交辦的人。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
