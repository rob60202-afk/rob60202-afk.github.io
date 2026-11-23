// 工程現場故事 第 9 集:那顆沒開回來的閥(腳本:series/field-stories-batch2.md 第 9 集)
// voice:旁白 zh-TW;陳師傅 zh-TW,pitch=0.86(手冊第三節的角色配音表)
(function () {
  const N = 'zh-TW', MASTER = 'zh-TW,pitch=0.86';
  const LINES = [
    { text: '阿樹要換一段管,先把上游的手閥關起來。', voice: N },
    { text: '工作很順利,不到一小時就做完了。', voice: N },
    { text: '他收好工具,簽了完工單,下班。', voice: N },
    { text: '半夜,整排設備的警報一台接一台響起來。', voice: N },
    { text: '值班的人找了兩個小時,才找到原因。', voice: N },
    { text: '那顆手閥,還關著。', voice: N },
    { text: '隔天師傅沒有罵人,只遞給他一張牌子。', voice: N },
    { text: '「你關的,寫你的名字。做完,你負責把它開回去,牌子你自己收。」', who: 'master', voice: MASTER },
    { text: '從此阿樹動過的每一顆閥,都有一張牌子,也都有一行紀錄。', voice: N },
    { text: '誰關的誰開。動了就掛牌,做完要復原。', voice: N },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
