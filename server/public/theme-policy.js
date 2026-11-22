export const PREMIUM_THEMES = Object.freeze(['festival','caishen']);
export const THEME_ANIMATIONS = Object.freeze({deepsea:[{id:'deepsea-orbit',name:'深海浮游 · 声呐汇聚'}],aurora:[{id:'aurora-stream',name:'极光流线 · 星河汇聚'}],gala:[{id:'gala-procession',name:'鎏金巡礼 · 荣耀揭晓'}],cyber:[{id:'cyber-grid',name:'霓虹电路 · 数据跃迁'}],sakura:[{id:'sakura-breeze',name:'樱风花舞 · 花间相遇'}],paper:[{id:'paper-flow',name:'水墨游迹 · 卷轴揭晓'}],festival:[{id:'festival-snow',name:'雪夜团圆'}],caishen:[{id:'caishen-packets',name:'抓红包 · 拆红包'}]});
export function animationsForTheme(theme){return THEME_ANIMATIONS[theme]||THEME_ANIMATIONS.deepsea}
export function normalizeThemeAnimation(theme,animation){const options=animationsForTheme(theme);return options.some(option=>option.id===animation)?animation:options[0].id}
export function requiresThemeUnlock(theme){return PREMIUM_THEMES.includes(theme)}
export function assertThemeAccess(theme,unlocked=[]){if(requiresThemeUnlock(theme)&&!unlocked.includes(theme))throw new Error('请先打赏解锁此主题');return true}
