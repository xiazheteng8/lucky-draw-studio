const preparedImages=new Map();
function warmImage(src){
 if(!preparedImages.has(src)){
  const image=new Image();
  image.src=src;
  const ready=image.decode().catch(error=>{preparedImages.delete(src);throw error});
  preparedImages.set(src,ready);
 }
 return preparedImages.get(src);
}
function animationFor(id){
 const root=document.documentElement;
 return normalizeThemeAnimation(id,root.dataset.theme===id?root.dataset.themeAnimation:'');
}
function prepare(id){
 const prefix='/themes/';
 const assets=id==='festival'
  ? ['spring-banner-r7.png','spring-panel.png','spring-sidebar.png','spring-stat.png','theme-art-festival-snow.png']
  : ['frame-'+id+'.svg','ornaments-'+id+'-v2.png','stage-scene-'+id+'-v3.png'];
 if(id==='caishen')assets.push('character-caishen-v1.webp');
 let timer;return Promise.race([Promise.all(assets.map(asset=>warmImage(prefix+asset))),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('主题图片加载超时，请重试')),45000)})]).finally(()=>clearTimeout(timer));
}

import {themes,getTheme,themeById} from './themes.js';
import {normalizeThemeAnimation} from './theme-policy.js';
let revision=0,saved='deepsea',savedAnimation='';
function apply(id,animation){revision++;const t=getTheme(id),root=document.documentElement;const selected=normalizeThemeAnimation(t.id,animation||(root.dataset.theme===t.id?root.dataset.themeAnimation:''));root.dataset.theme=t.id;root.dataset.themeAnimation=selected;root.style.colorScheme=t.dark?'dark':'light';for(const [key,value]of Object.entries({bg:t.bg,panel:t.panel,ink:t.ink,muted:t.muted,cyan:t.accent,gold:t.gold,line:t.line,'theme-glow':t.glow,'theme-deep':t.deep,'theme-radius':t.radius,'theme-heading':t.heading,'on-accent':t.dark?'#10202a':'#ffffff'}))root.style.setProperty('--'+key,value);try{localStorage.setItem('lucky-theme',t.id);localStorage.setItem('lucky-theme-animation',selected)}catch{}dispatchEvent(new CustomEvent('lucky-theme-change',{detail:{id:t.id,animation:selected}}))}
try{const id=localStorage.getItem('lucky-theme');if(themeById[id])saved=id;savedAnimation=localStorage.getItem('lucky-theme-animation')||''}catch{}apply(saved,savedAnimation);
function personalTheme(){try{const value=JSON.parse(localStorage.getItem('lucky-personal-theme')||'null');return value&&themeById[value.id]?value:null}catch{return null}}
function prefersPersonal(){const dashboard=Boolean(document.getElementById('create'))||location.pathname==='/'||location.pathname.endsWith('/index.html');return (dashboard||Boolean(window.Account))&&window.Account?.state.user?.role!=='owner'}
async function refresh(){if(window.__themePreview||window.__themeFrozen)return;const localPage=String(new URLSearchParams(location.search).get('id')||'').startsWith('local-');if(localPage)return;const personal=personalTheme();if(prefersPersonal()&&personal){saved=personal.id;savedAnimation=normalizeThemeAnimation(saved,personal.animation);if(document.documentElement.dataset.theme!==saved||document.documentElement.dataset.themeAnimation!==savedAnimation)apply(saved,savedAnimation);return}if(window.Account&&!window.Account.state.user)return;const startedAt=revision;try{const response=await fetch('/api/theme',{cache:'no-store'});if(!response.ok)return;const data=await response.json();if(window.__themePreview||window.__themeFrozen||revision!==startedAt||prefersPersonal()&&personalTheme())return;saved=getTheme(data.id).id;savedAnimation=normalizeThemeAnimation(saved,data.animation);if(document.documentElement.dataset.theme!==saved||document.documentElement.dataset.themeAnimation!==savedAnimation)apply(saved,savedAnimation)}catch{}}

window.LuckyTheme={themes,apply,refresh,prepare,animationFor,get saved(){return saved},get animation(){return savedAnimation},commit(id,animation){saved=getTheme(id).id;savedAnimation=normalizeThemeAnimation(saved,animation);if(document.documentElement.dataset.theme!==saved||document.documentElement.dataset.themeAnimation!==savedAnimation)apply(saved,savedAnimation)}};addEventListener('storage',event=>{if(event.key==='lucky-personal-theme')void refresh()});refresh();setInterval(refresh,5000);

document.addEventListener('click',event=>{
 if(event.button===0)closeFromBackdrop(event);
},true);
document.addEventListener('contextmenu',closeFromBackdrop,true);
function closeFromBackdrop(event){
 const dialog=event.target;
 if(window.__themeSwitchBusy)return;
 if(!(dialog instanceof HTMLDialogElement)||!dialog.matches(':modal')||(dialog.id==='recordingNotice')||dialog.classList.contains('spring-unlock')&&dialog.dataset.premiumTheme==='festival')return;
 const rect=dialog.getBoundingClientRect();
 if(event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom)return;
 event.preventDefault();
 dialog.close();
}
const boardStyles='/lucky-settings.css?v=20261120-stage-finale';
if(!document.querySelector('link[href="'+boardStyles+'"]')){
 const style=document.createElement('link');
 style.rel='stylesheet';
 style.href=boardStyles;
 document.head.append(style);
}
