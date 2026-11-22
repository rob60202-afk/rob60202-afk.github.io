// 工程現場故事 第 4 集:少了一個簽名
(function () {
  const LINES = [
    { text: '施工到一半,業主的窗口走過來說:這裡幫我多拉一條。' },
    { text: '阿樹想都沒想:「好,沒問題!」', who: 'shu' },
    { text: '多用了材料,多做了兩天。他覺得這是服務。' },
    { text: '請款那天,追加的費用被整筆劃掉。' },
    { text: '「誰同意的?有文件嗎?」', who: 'officer' },
    { text: '當初開口的那位窗口,已經調走了。' },
    { text: '阿樹什麼都拿不出來。沒有信,沒有簽名,連一張照片都沒有。' },
    { text: '師傅拍拍他:「人會調走,話會忘記,只有紙會留下來。」', who: 'master' },
    { text: '從此阿樹口袋裡多了一本小本子。講好的事,當場寫,當場簽。' },
    { text: '現場講好的事,沒有留紀錄,就等於沒發生過。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
