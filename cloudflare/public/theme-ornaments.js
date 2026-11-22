// Independent illustrations are packed into one transparent atlas per theme.
// Each UI position has its own subject and aspect ratio; no whole-sheet repetition.
import {ornamentRegion} from './ornament-regions.js?v=20261120-stage3';
const nodes=[];let theme='';
function resize(item){
 const box=item.parent.getBoundingClientRect(),role=item.role,region=ornamentRegion(theme,role);let maxWidth,maxHeight,bottom,right;
 if(role==='hero'){maxWidth=box.width*.48;maxHeight=Math.max(0,box.height-34);bottom=17;right=18}
 else if(role==='sidebar'){maxWidth=Math.max(0,box.width-28);maxHeight=box.height*.38;bottom=155;right=14}
 else if(role==='form'){maxWidth=Math.min(box.width*.62,520);maxHeight=Math.min(box.height*.28,230);bottom=110;right=18}
 else{maxWidth=box.width*.38;maxHeight=Math.max(0,box.height-22);bottom=11;right=12}
 const scale=Math.max(0,Math.min(maxWidth/region[2],maxHeight/region[3]));
 Object.assign(item.node.style,{width:region[2]*scale+'px',height:region[3]*scale+'px',bottom:bottom+'px',right:right+'px'});
 Object.assign(item.image.style,{width:1536*scale+'px',height:1024*scale+'px',left:-region[0]*scale+'px',top:-region[1]*scale+'px'});
}
function refresh(){theme=document.documentElement.dataset.theme||'deepsea';for(const item of nodes){const hidden=theme==='festival';item.node.hidden=hidden;if(!hidden){const src='/themes/ornaments-'+theme+'-v2.png';if(item.image.getAttribute('src')!==src)item.image.src=src;resize(item)}}}
function init(){if(!document.getElementById('dash')&&!document.body.classList.contains('export-page'))return;const observer=new ResizeObserver(entries=>{for(const entry of entries)for(const item of nodes)if(item.parent===entry.target)resize(item)});
 const targets=[['.page-heading','hero'],['.metrics article:nth-child(1)','stat1'],['.metrics article:nth-child(2)','stat2'],['.metrics article:nth-child(3)','stat3'],['.sidebar','sidebar'],['#create','form']];
 for(const [selector,role] of targets){const parent=document.querySelector(selector);if(!parent)continue;const node=document.createElement('span'),image=document.createElement('img');node.className='theme-decor theme-decor-'+role;node.dataset.ornamentRole=role;node.setAttribute('aria-hidden','true');image.alt='';image.decoding='async';image.draggable=false;node.append(image);parent.append(node);const item={parent,node,image,role};nodes.push(item);observer.observe(parent)}refresh();addEventListener('lucky-theme-change',refresh);addEventListener('resize',()=>nodes.forEach(resize));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
