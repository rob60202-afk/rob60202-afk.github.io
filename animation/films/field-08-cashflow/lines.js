// 工程現場故事 第 8 集:帳上賺錢,戶頭沒錢
// 腳本:series/field-stories-batch2.md「第 8 集」。row = 腳本第幾句;文字照抄(標點也是)。
// 有引號的句子拆成兩段:「他開心地跟老闆報告:」由旁白念,「這個案子有賺!」由阿樹自己講(只有講的人對嘴)。
//   who    :對嘴用的角色代號(沒寫 = 旁白)· voice:配音設定(手冊第三節的聲音表)
//   display:字幕要怎麼切;「|」= 在這裡換下一段字幕(字幕上不會出現)
(function () {
  const NARR = 'zh-TW', SHU = 'zh-TW,pitch=1.08', MASTER = 'zh-TW,pitch=0.86', BOSS = 'zh-TW,pitch=0.94';
  const LINES = [
    { row: 1, voice: NARR, text: '阿樹接到一個大案子,算起來穩賺。' },
    { row: 2, voice: NARR, text: '他開心地跟老闆報告:' },
    { row: 2, voice: SHU, who: 'shu', text: '這個案子有賺!' },
    { row: 3, voice: NARR, text: '老闆只問了一句:' },
    { row: 3, voice: BOSS, who: 'boss', text: '錢什麼時候進來?' },
    { row: 4, voice: NARR, text: '阿樹翻開合約。完工驗收之後才請款,請款之後還要等票期。' },
    { row: 5, voice: NARR, text: '可是材料下個月就要付錢,工班每個月都要領錢。', display: '可是材料下個月|就要付錢,工班每個月都要領錢。' },
    { row: 6, voice: NARR, text: '錢出去的時間,比錢進來的時間,早了好幾個月。' },
    { row: 7, voice: NARR, text: '這一段空白,公司要自己先墊。墊不出來,案子做一半就停了。' },
    { row: 8, voice: NARR, text: '師傅說:' },
    { row: 8, voice: MASTER, who: 'master', text: '很多公司不是賠錢倒的,是賺錢的時候周轉不過來倒的。', display: '很多公司|不是賠錢倒的,是賺錢的時候|周轉不過來倒的。' },
    { row: 9, voice: NARR, text: '之後阿樹報價,多做一張表:哪個月要付多少,哪個月能收多少。' },
    { row: 10, voice: NARR, text: '賺不賺錢看利潤,活不活得下去看現金。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
