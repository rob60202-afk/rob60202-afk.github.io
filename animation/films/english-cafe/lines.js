// 一集的全部內容:換一份這個檔案就是新的一集。
// type: hook 開場提問 / say 角色對話 / key 重點句慢速複習(之後留時間讓觀眾跟唸) / outro 結尾
(function () {
  const MIA = 'en,pitch=1.06', LEO = 'en,pitch=0.86';
  const EP = {
    title: ['咖啡店點餐', '英文怎麼說?'],
    series: '每天一句 生活英文',
    lines: [
      { type: 'hook', zh: '在咖啡店點餐,英文怎麼說?', voice: 'zh-TW' },
      { type: 'say', who: 'mia', en: 'Hi! What can I get for you?', zh: '嗨!想喝點什麼?', voice: MIA },
      { type: 'say', who: 'leo', en: 'Can I get a latte, please?', zh: '我要一杯拿鐵,謝謝。', voice: LEO },
      { type: 'say', who: 'mia', en: 'For here or to go?', zh: '內用還是外帶?', voice: MIA },
      { type: 'say', who: 'leo', en: 'To go, please.', zh: '外帶,謝謝。', voice: LEO, gap: 0.7 },
      { type: 'hook', zh: '重點句,跟著唸一次。', voice: 'zh-TW' },
      { type: 'key', who: 'mia', en: 'For here or to go?', zh: '內用還是外帶?', notes: ['for here = 內用', 'to go = 外帶'], voice: 'en,pitch=1.06,slow', gap: 2.6 },
      { type: 'outro', zh: '學會了嗎?追蹤我,每天學一句。', voice: 'zh-TW' },
    ],
  };
  EP.lines.forEach((l) => { l.text = l.en || l.zh; });
  if (typeof module !== 'undefined') module.exports = EP; else globalThis.EP = EP;
})();
