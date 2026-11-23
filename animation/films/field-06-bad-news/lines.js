// 工程現場故事 第 6 集:壞消息怎麼報
(function () {
  const LINES = [
    { text: '材料晚到,工期確定會落後。阿樹決定,先不要講。' },
    { text: '他想,趕一趕,說不定追得回來。' },
    { text: '一個禮拜後,業主自己在現場發現了。' },
    { text: '「落後多久了?你打算什麼時候才告訴我?」', who: 'client' },
    { text: '那天之後,業主每天都來現場盯。' },
    { text: '師傅說:壞消息不會因為你不講就變好。', who: 'master' },
    { text: '下一次,阿樹發現問題的當天就去報告。' },
    { text: '他只講四件事:發生什麼、影響多大、有哪些做法、需要您決定什麼。' },
    { text: '業主聽完,只回了一句:好,用第二個方案。' },
    { text: '壞消息要自己先報,而且要帶著選項去。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
