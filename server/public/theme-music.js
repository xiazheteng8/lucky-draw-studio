export const THEME_MUSIC=Object.freeze({
 deepsea:{waiting:'orbit',drawing:'provided-pirate-remix',winner:'selected-star-sky'},
 aurora:{waiting:'selected-moonlit-clouds',drawing:'selected-go-time',winner:'selected-monody'},
 gala:{waiting:'selected-magnificent-seven',drawing:'selected-for-the-win',winner:'selected-tsfh-victory'},
 cyber:{waiting:'neon',drawing:'selected-monody',winner:'selected-for-the-win'},
 sakura:{waiting:'selected-flower-dance',drawing:'selected-kyara',winner:'provided-bunny-hop'},
 paper:{waiting:'selected-wind-street',drawing:'selected-seven-swords',winner:'provided-hua-hao-yue-yuan'},
 festival:{waiting:'provided-spring-overture',drawing:'selected-chototsu',winner:'provided-xiyangyang'},
 caishen:{waiting:'provided-bu-bu-gao',drawing:'provided-saima-suona',winner:'provided-hua-hao-yue-yuan'}
});
export function themeMusicSettings(settings={},theme='deepsea',tracks=[],overrides={}){const result={...settings},preset={...(THEME_MUSIC[theme]||THEME_MUSIC.deepsea),...(overrides[theme]||{})};for(const phase of ['waiting','drawing','winner'])if(preset[phase]==='off'||tracks.some(t=>t.id===preset[phase]))result[phase]=preset[phase];return result}
export function validateThemeMusic(value,tracks){const allowed=new Set(['off',...tracks.map(t=>t.id)]),result={};for(const theme of Object.keys(THEME_MUSIC)){result[theme]={};for(const phase of ['waiting','drawing','winner']){const id=value?.[theme]?.[phase];if(!allowed.has(id))throw Error('主题默认音乐无效，请为每个阶段选择有效曲目');result[theme][phase]=id}}return result}
