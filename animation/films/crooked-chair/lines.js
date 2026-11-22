// 旁白台詞:score.js、song.js、film.js 共用這一份。who 代表畫面上對嘴的角色。
(function () {
  const LINES = [
    { text: '阿樹十六歲,做出人生第一張椅子。' },
    { text: '四隻腳,有一隻短了半公分。' },
    { text: '他想趁師傅沒看到,把它當柴燒掉。' },
    { text: '師傅卻把椅子放在店門口,坐了下來。' },
    { text: '這一坐,就是三十年。' },
    { text: '客人笑它歪,阿樹每看一次,就難受一次。' },
    { text: '於是他拼命練,做的椅子,整條街搶著訂。' },
    { text: '師傅退休那天,阿樹終於忍不住問。' },
    { text: '為什麼您偏偏要坐,我做得最差的那一張?', who: 'shu' },
    { text: '它歪,可是三十年,從來沒垮過。', who: 'master' },
    { text: '再厲害的師傅,都是從歪的那一張開始的。', who: 'master' },
    { text: '你現在做的東西還很歪嗎?別急著燒掉它。' },
  ];
  if (typeof module !== 'undefined') module.exports = LINES; else globalThis.LINES = LINES;
})();
