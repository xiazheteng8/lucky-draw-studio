let csrf='',activeImport=null,awardData='',logoData='';const $=s=>document.querySelector(s),el=(t,v)=>{const x=document.createElement(t);if(v!==undefined)x.textContent=v;return x};
async function api(url,opt={}){const headers={...(opt.headers||{})};if(opt.body)headers['content-type']='application/json';if(csrf)headers['x-csrf-token']=csrf;const r=await fetch(url,{...opt,headers}),t=await r.text();let d;try{d=t?JSON.parse(t):{}}catch{throw Error(`服务器响应无效 (${r.status})`)}if(!r.ok)throw Object.assign(Error(d.error||'请求失败'),{status:r.status});return d}
let noticeTimer;function notice(v){$('#notice').textContent=v;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').textContent='',10000)}
function conf(){return {blacklist:$('#blacklist').value.split(/[\s,]+/).filter(Boolean),requiredAuthors:$('#authors').value.split(/[\s,]+/).filter(Boolean),startAt:$('#startAt').value||null,endAt:$('#endAt').value||null,scheduleAt:$('#scheduleAt').value||null,scheduleEnabled:$('#scheduleEnabled').checked,finalAnnouncement:$('#finalAnnouncement').value.trim(),excludeVideoAuthor:$('#excludeVideoAuthor').checked,dedupeAuthors:$('#dedupeAuthors').checked,winnerCount:+$('#winnerCount').value||1}}
function visual(){const base=$('#interactionBaseUrl').value.trim();if(base){let u;try{u=new URL(base)}catch{throw Error('请填写完整的手机访问地址，例如 http://192.168.1.8:3000')}if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('手机访问地址只需域名或 IP 及端口，不包含页面路径')}return {theme:document.documentElement.dataset.theme,maxFeints:Number($('#maxFeints').value),signinProvider:$('#signinProvider').value,drawMode:$('#drawMode').value,logoImage:logoData,interactionEnabled:$('#interactionEnabled').checked,interactionBaseUrl:$('#interactionBaseUrl').value.trim(),rankStyle:$('#rankStyle').value,awardNames:$('#rankStyle').value==='custom'?$('#awardNames').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean):[],animation:$('#animation').value,award:$('#award').value,awardImage:awardData,prize:$('#prize').value,prizeName:$('#prizeName')?.value.trim()||'',prizeImage:$('#prizeImage')?.value.trim()||''}}
function action(label,fn,cls=''){const b=el('button',label);b.type='button';b.className=cls;b.onclick=async()=>{if(!Account.requireLogin())return;b.disabled=true;try{await fn();await load()}catch(e){notice(e.message)}finally{b.disabled=false}};return b}
function link(label,href){const a=el('a',label);a.href=href;a.target='_blank';a.rel='noreferrer';return a}
function card(g){const box=el('article');box.className='giveaway';const heading=el('div');heading.className='activity-title';heading.append(el('h2',g.title||g.video_title||'未命名活动'));const status=el('span',({drawn:'已开奖',ready:'准备就绪',scheduled:'定时待开奖'})[g.status]||g.status);status.className='status-pill';heading.append(status);box.append(heading);const modes={youtube:'从视频导入',comments:'从 blog 导入',custom:'自定义名单',wechat:'扫码抽奖'},meta=el('p',`${modes[g.source_mode]||'从视频导入'} · ${JSON.parse(g.presentation_json||'{}').drawMode==='manual'?'手动逐位':'自动连续'} · ${g.comments} 位参与 · ${g.winners}/${g.winner_count} 位中奖${g.last_error?' · '+g.last_error:''}`);meta.className='activity-meta';box.append(meta);const a=el('div');a.className='actions';if(g.status!=='drawn'){if(['youtube','comments'].includes(g.source_mode))a.append(action('↓ 抓取评论',async()=>{const d=await api(`/api/giveaways/${g.id}/import`,{method:'POST'});notice(`导入 ${d.imported} 条评论`)}));a.append(action('导入名单文件夹',()=>{activeImport=g.id;folderRoster=null;folderAvatars=[];$('#rosterFile').value='';$('#avatarFolder').value='';$('#importStatus').textContent='';$('#importDialog').showModal()}));if(g.source_mode==='wechat'||g.source_mode==='custom')a.append(action(g.source_mode==='wechat'?'扫码抽奖码':'报名二维码',async()=>{const d=await api(`/api/giveaways/${g.id}/interaction`);$('#qrImage').src=d.qr;$('#qrLink').href=d.url;$('#qrStatus').textContent=g.source_mode==='wechat'?'请使用手机微信/钉钉/TG扫码完成签到，并可发送现场弹幕。':'扫描二维码填写姓名与工号报名，并可发送互动弹幕。';$('#qrDialog').showModal()}));a.append(action(`✦ 开始抽奖 · ${g.winner_count} 位`,async()=>{if(!confirm(`确认抽取 ${g.winner_count} 位中奖者？开奖后名单不可修改。`))return;await api(`/api/giveaways/${g.id}/draw`,{method:'POST',body:JSON.stringify({count:g.winner_count})});notice('开奖成功，打开直播大屏查看揭晓。')},'draw-action'));a.append(action('应用当前舞台设置',()=>api(`/api/giveaways/${g.id}/presentation`,{method:'POST',body:JSON.stringify(visual())})));a.append(action('奖品设置',()=>editActivityPrizes(g)));a.append(action('编辑活动',async()=>{const d=await api(`/api/giveaways/${g.id}`),title=prompt('活动名称',d.title);if(title===null)return;const keyword=prompt('参与关键词',d.keyword);if(keyword===null)return;await api(`/api/giveaways/${g.id}`,{method:'PATCH',body:JSON.stringify({title,keyword,config:d.config})})}));}a.append(action('查看参与名单',async()=>{const d=await api(`/api/giveaways/${g.id}/comments?eligible=true`);notice(`合格名单 ${d.total} 条\n${d.items.slice(0,20).map(v=>`${['custom','wechat'].includes(g.source_mode)?v.author_name:(v.handle||(v.author_name.startsWith('@')?v.author_name:'@账号未提供'))}：${v.text}`).join('\n')}`)}));a.append(link('↗ 直播大屏',`/live.html?id=${g.id}&token=${encodeURIComponent(g.overlay_token)}${g.status==='drawn'?'&replay=1':''}`));if(g.status==='drawn'){if(JSON.parse(g.presentation_json||'{}').drawMode==='manual'&&(Number(g.reveal_round)||0)<g.winners-1)a.append(action('✦ 立即抽取下一位',()=>api(`/api/giveaways/${g.id}/next`,{method:'POST',body:JSON.stringify({expectedRound:Number(g.reveal_round)||0})}),'draw-action'));a.append(link('↓ 完整中奖 Excel',`/api/giveaways/${g.id}/export.xlsx`),link('↓ CSV',`/api/giveaways/${g.id}/export.csv`),link('图片 / 4K 视频导出',`/export.html?id=${g.id}&token=${encodeURIComponent(g.overlay_token)}`));}a.append(action('删除',async()=>{if(confirm('确定删除这个活动及其记录？此操作无法撤销。'))await api(`/api/giveaways/${g.id}`,{method:'DELETE'})}));box.append(a);return box}
async function load(){await Account.refresh();if(!Account.state.user){for(const id of ['#metricTotal','#metricPeople','#metricWinners'])$(id).textContent='—';const empty=el('div','登录后查看我的活动。');empty.className='empty';const a=el('a','登录 / 注册 ↗');a.href='/account?next=%2F%23activities';empty.append(a);$('#list').replaceChildren(empty);await refreshSigninAvailability();return}const rows=await api('/api/giveaways');let settings=null;if(Account.state.user.role==='owner'){settings=await api('/api/admin/settings');$('#apiKeyStatus').textContent=`YouTube API 密钥：${settings.youtubeApiConfigured?'已配置':'未配置'}`};const ytBtn=document.querySelector('[data-mode="youtube"]');if(ytBtn){ytBtn.hidden=false;ytBtn.title=settings&&!settings.youtubeApiConfigured?'视频评论抽奖需要配置 YouTube API，可在 API 设置中填写':'';}$('#metricTotal').textContent=String(rows.length).padStart(2,'0');$('#metricPeople').textContent=rows.reduce((n,g)=>n+g.comments,0).toLocaleString();$('#metricWinners').textContent=String(rows.reduce((n,g)=>n+g.winners,0)).padStart(2,'0');$('#list').replaceChildren(...(rows.length?rows.map(card):[Object.assign(el('div','还没有活动，创建一场新的幸运时刻。'),{className:'empty'})]));await refreshSigninAvailability();if(Account.state.user.role==='owner'&&hiddenSigninProvider()&&!$('#signinDialog').open)await openSigninSettings()}
async function startConsole(){try{csrf=(await api('/api/csrf')).token;await load()}catch(e){notice('控制台连接失败：'+e.message)}}startConsole();
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();for(const id of ['#apiButton','#openApi'])$(id).onclick=()=>$('#apiDialog').showModal();$('#openAward').onclick=()=>$('#awardDialog').showModal();
$('#award').onchange=()=>$('#awardSummary').textContent=$('#award').selectedOptions[0].textContent;
const dataUrl=f=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('文件读取失败'));r.readAsDataURL(f)});
$('#awardImage').onchange=async()=>{const f=$('#awardImage').files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>1000000){notice('请上传 1MB 以内 PNG / JPG / WebP 图片');return}awardData=await dataUrl(f);$('#awardPreview').src=awardData;$('#awardPreview').hidden=false;$('#award').value='custom';$('#award').onchange()};
$('#modeButtons').onclick=e=>{const b=e.target.closest('[data-mode]');if(!b)return;$('#sourceMode').value=b.dataset.mode;$('#wechatSigninHelp').hidden=b.dataset.mode!=='wechat';$('#keyword').closest('.field').hidden=b.dataset.mode==='wechat';$('#keyword').disabled=b.dataset.mode==='wechat';$('#interactionEnabled').disabled=b.dataset.mode==='wechat';if(b.dataset.mode==='wechat')$('#interactionEnabled').checked=true;$('#customFolderSection').hidden=b.dataset.mode!=='custom';document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x===b));$('#videoField').hidden=!['youtube','comments'].includes(b.dataset.mode);$('#videoUrl').required=['youtube','comments'].includes(b.dataset.mode);$('#sourceUrlLabel').textContent=b.dataset.mode==='comments'?'请导入文章链接':'请导入视频链接';$('#videoUrl').placeholder=b.dataset.mode==='comments'?'粘贴文章链接':'粘贴视频链接';$('#platformSupport').textContent=b.dataset.mode==='comments'?'从文章链接抓取评论（如果支持）':'YouTube / 其他平台请自行尝试是否支持'};
$('#apiKeyForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/youtube-key',{method:'POST',body:JSON.stringify({apiKey:$('#apiKeyInput').value})});$('#apiKeyInput').value='';notice('YouTube API 密钥已保存');await load();$('#apiDialog').close()}catch(x){notice(x.message)}};
$('#clearApiKey').onclick=async()=>{try{await api('/api/admin/youtube-key',{method:'DELETE'});await load();notice('密钥已清除')}catch(e){notice(e.message)}};
$('#create').onsubmit=async e=>{e.preventDefault();if(!Account.requireLogin())return;const b=e.target.querySelector('.create-submit');b.disabled=true;try{if($('#award').value==='custom'&&!awardData)throw Error('请上传自定义奖章图片');const c=conf();await Account.loadPolicy();if(c.scheduleEnabled&&!c.scheduleAt)throw Error('请设置自动开奖时间');if(c.scheduleEnabled&&new Date(c.scheduleAt).getTime()<=Date.now())throw Error('自动开奖时间必须晚于当前时间');if(!Account.state.user.verified&&Account.state.user.role!=='owner'){const deadline=Date.now()+Account.policy.activityHours*60*60*1000;for(const key of ['startAt','endAt','scheduleAt'])if(c[key]&&new Date(c[key]).getTime()>deadline)throw Error(`未验证用户仅可创建 ${Account.policy.activityHours} 小时内开奖的活动`);}const mode=$('#sourceMode').value;if(mode==='wechat')await refreshSigninAvailability();if(mode==='wechat'&&!signinReady($('#signinProvider').value))throw Error('当前扫码平台尚未配置，请选择其他参与方式');if(mode==='custom'&&!folderRoster)throw Error('请拖入包含名单的文件夹');const created=await api('/api/giveaways',{method:'POST',body:JSON.stringify({...Object.fromEntries(new FormData(e.target)),config:c,presentation:visual()})});if(['youtube','comments'].includes(mode)){notice('活动已创建，正在读取评论，请稍候…');try{const result=await api(`/api/giveaways/${created.id}/import`,{method:'POST'});notice(`活动已创建，读取到 ${result.imported} 条评论。`)}catch(error){notice('活动已创建，评论读取未完成：'+error.message)}}else if(mode==='custom'){activeImport=created.id;await $('#importRoster').onclick();notice($('#importStatus').textContent)}else notice('活动已创建，请在等待大屏或活动管理中打开签到二维码。');sessionStorage.removeItem('giveaway-create-draft');await load();$('#activities').scrollIntoView({behavior:'smooth'})}catch(x){notice(x.message)}finally{b.disabled=false}};
function download(blob,name){const u=URL.createObjectURL(blob),a=el('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$('#downloadTemplate').onclick=()=>{const a=el('a');a.href='/名单导入模板.zip';a.download='名单导入模板.zip';a.click()};

function parseCSV(text,sep=','){const rows=[];let row=[],v='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){v+='"';i++}else quoted=!quoted}else if(c===sep&&!quoted){row.push(v);v=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(v);if(row.some(x=>x.trim()))rows.push(row);row=[];v=''}else v+=c}if(quoted)throw Error('CSV 引号未闭合');row.push(v);if(row.some(x=>x.trim()))rows.push(row);const keys=rows.shift()?.map(x=>x.replace(/^\uFEFF/,'').trim());if(!keys?.length)throw Error('文件没有表头');return rows.map(r=>Object.fromEntries(keys.map((k,i)=>[k,r[i]||''])))}
$('#importRoster').onclick=async()=>{const b=$('#importRoster');b.disabled=true;try{const f=folderRoster||$('#rosterFile').files[0];if(!f)throw Error('请先选择名单文件');if(f.size>8000000)throw Error('名单文件需小于 8MB');$('#importStatus').textContent='正在读取与验证…';let payload;if(/\.xlsx$/i.test(f.name)){const avatars={};let total=0;for(const a of folderAvatars){if(avatars[a.name])throw Error('头像文件夹有重名文件');if(a.size>300000||!['image/png','image/jpeg','image/webp'].includes(a.type))throw Error('头像需为 300KB 以内 PNG/JPG/WebP');total+=a.size;if(total>10000000)throw Error('头像总量超出 10MB，请分批导入');avatars[a.name]=await dataUrl(a)}payload={xlsx:(await dataUrl(f)).split(',')[1],avatars}}else{const rows=parseCSV(await f.text(),/\.tsv$/i.test(f.name)?'\t':',');const files=new Map();for(const a of folderAvatars){if(files.has(a.name))throw Error('头像文件夹有重名文件，请使用唯一文件名');files.set(a.name,a)}let bytes=0;for(const row of rows){const name=row['头像文件']||row['头像']||row.avatar;if(files.has(name)){const a=files.get(name);if(a.size>300000||!['image/png','image/jpeg','image/webp'].includes(a.type))throw Error(`头像 ${name} 需为 300KB 以内 PNG/JPG/WebP`);bytes+=a.size;if(bytes>10000000)throw Error('头像总量超出 10MB，请分批导入');row.avatar=await dataUrl(a)}}payload={rows}}const d=await api(`/api/giveaways/${activeImport}/spreadsheet`,{method:'POST',body:JSON.stringify(payload)});$('#importStatus').textContent=`已处理 ${d.imported} 行，活动名单共 ${d.total} 人（重复编号自动去重）。`;await load()}catch(e){$('#importStatus').textContent=e.message}finally{b.disabled=false}};
let musicLibrary=[],libraryBindId=null;
const musicPhaseNames={waiting:'候场',drawing:'摇奖',winner:'颁奖'};
function renderMusicLibrary(){const query=$('#musicSearch').value.trim().toLowerCase(),filter=$('#libraryFilter').value,visible=musicLibrary.filter(t=>(filter==='all'||(filter==='ready'?t.ready:!t.ready))&&[t.name,t.artist,...t.aliases].join(' ').toLowerCase().includes(query));$('#libraryCount').textContent=`· ${musicLibrary.filter(t=>t.ready).length} 首可选音乐`;const rows=visible.map(t=>{const row=el('div');row.className='music-library-row';const info=el('div');info.className='music-library-info';info.append(el('strong',t.name),el('small',`${t.artist?t.artist+' · ':''}建议${t.phases.map(p=>musicPhaseNames[p]).join(' / ')}`));const status=el('small',t.ready?'可播放 · 支持抽奖与视频导出':'试听推荐 · 上传音频后可用于抽奖');status.className=t.ready?'music-ready':'music-pending';info.append(status);const actions=el('div');actions.className='music-library-actions';if(t.ready){const preview=el('button','试听');preview.type='button';preview.onclick=()=>{const audio=$('#musicPreview');audio.src='/api/music/'+encodeURIComponent(t.trackId);audio.volume=$('#musicVolume').value/100;audio.hidden=false;audio.play().catch(e=>{$('#musicBinding').textContent='播放失败：'+e.message})};actions.append(preview);const use=el('button','用于'+musicPhaseNames[t.phases[0]]);use.type='button';use.onclick=()=>{$(`#${t.phases[0]}Music`).value=t.trackId;$('#musicBinding').textContent=`已选择「${t.name}」用于${musicPhaseNames[t.phases[0]]}，点击“保存音乐设置”生效。`};actions.append(use)}else if(t.previewUrl)actions.append(link(t.previewType==='search'?'搜索试听 ↗':'在线试听 ↗',t.previewUrl));if(!t.providedExtra){const bind=el('button',t.ready?'更换音频':'上传音频');bind.type='button';bind.onclick=()=>{libraryBindId=t.id;$('#musicUpload').value='';$('#musicBinding').textContent=`请为「${t.name}」选择音频文件，再点击“上传音乐”。`;$('#musicUpload').click()};actions.append(bind)}row.append(info,actions);return row});$('#musicLibraryList').replaceChildren(...(rows.length?rows:[el('p','没有匹配的曲目。')]))}
$('#libraryFilter').onchange=renderMusicLibrary;
$('#musicSearch').oninput=renderMusicLibrary;
async function loadMusic(){const d=await api('/api/music');const supplied=d.tracks.filter(t=>t.userProvided),readyById=new Map(supplied.map(t=>[t.id,t]));musicLibrary=(d.library||[]).map(t=>{const actual=readyById.get(t.trackId);return actual?{...t,name:actual.name,artist:actual.artist||t.artist,phases:actual.phases||t.phases}:t});const represented=new Set(musicLibrary.map(t=>t.trackId).filter(Boolean));for(const t of supplied)if(!represented.has(t.id))musicLibrary.push({id:t.id,name:t.name,artist:t.artist||'',aliases:[],phases:t.phases||['waiting'],ready:true,trackId:t.id,providedExtra:true});for(const phase of ['waiting','drawing','winner']){const select=$(`#${phase}Music`);select.replaceChildren(new Option('静音','off'));for(const [label,tracks] of [['内置音乐',d.tracks.filter(t=>t.userProvided)],['我的音乐',d.tracks.filter(t=>!t.builtin&&!t.userProvided)],['轻音乐与氛围配乐',d.tracks.filter(t=>t.builtin&&!t.userProvided)]]){if(!tracks.length)continue;const group=el('optgroup');group.label=label;group.append(...tracks.map(t=>new Option(`${t.name}${t.artist?' / '+t.artist:''}`,t.id)));select.append(group)}select.value=d.settings[phase]}$('#musicVolume').value=d.settings.volume*100;renderMusicLibrary()}
$('#openMusic').onclick=async()=>{try{libraryBindId=null;$('#libraryFilter').value='ready';$('#musicUpload').value='';$('#musicBinding').textContent='可一次选择多首音乐，上传后选择播放阶段并保存。';await loadMusic();$('#musicDialog').showModal()}catch(e){notice(e.message)}};
$('#previewMusic').onclick=()=>{const id=$('#drawingMusic').value;if(id==='off')return;const a=$('#musicPreview');a.src=`/api/music/${id}`;a.volume=$('#musicVolume').value/100;a.hidden=false;a.play().catch(e=>notice(e.message))};$('#musicDialog').addEventListener('close',()=>$('#musicPreview').pause());
$('#uploadMusic').onclick=async()=>{const b=$('#uploadMusic');b.disabled=true;const previous=Object.fromEntries(['waiting','drawing','winner'].map(p=>[p,$(`#${p}Music`).value]));let imported=0;try{const files=[...$('#musicUpload').files];if(!files.length)throw Error('请先选择音频文件');if(libraryBindId&&files.length!==1)throw Error('为指定曲目上传时请选择一个文件；如需上传多首，请先切换至批量上传。');for(const f of files){if(f.size>12000000)throw Error(`${f.name} 超过 12MB`);$('#musicBinding').textContent=`正在处理 ${imported+1}/${files.length}：${f.name}`;const url=URL.createObjectURL(f),a=new Audio(url);try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('音频读取超时')),15000);a.onloadedmetadata=()=>{clearTimeout(timer);resolve()};a.onerror=()=>{clearTimeout(timer);reject(Error('无法播放此音频，请更换文件：'+f.name))}})}finally{a.removeAttribute('src');a.load();URL.revokeObjectURL(url)}await api('/api/admin/music/upload',{method:'POST',body:JSON.stringify({name:f.name,data:await dataUrl(f),libraryId:libraryBindId})});imported++}libraryBindId=null;$('#musicUpload').value='';await loadMusic();for(const phase of ['waiting','drawing','winner'])if([...$(`#${phase}Music`).options].some(o=>o.value===previous[phase]))$(`#${phase}Music`).value=previous[phase];$('#musicBinding').textContent=`${imported} 首音乐上传成功。请选择播放阶段，再保存音乐设置。`}catch(e){if(imported)await loadMusic();$('#musicBinding').textContent=`已处理 ${imported} 首。${e.message}`}finally{b.disabled=false}};
const cancelBind=el('button','切换至批量上传');cancelBind.type='button';cancelBind.onclick=()=>{libraryBindId=null;$('#musicUpload').value='';$('#musicBinding').textContent='请选择要上传的音乐，可一次选择多个文件。'};$('#uploadMusic').after(cancelBind);
$('#saveMusic').onclick=async()=>{try{await api('/api/admin/music/settings',{method:'POST',body:JSON.stringify({waiting:$('#waitingMusic').value,drawing:$('#drawingMusic').value,winner:$('#winnerMusic').value,volume:$('#musicVolume').value/100})});notice('音乐设置已保存');$('#musicDialog').close()}catch(e){notice(e.message)}};
$('#openDonation').onclick=()=>{$('#donationImage').onerror=()=>{$('#donationImage').src='/donation.png'};$('#donationImage').src='/api/donation';$('#donationDialog').showModal()};

let folderRoster=null,folderAvatars=[];
function acceptFolder(files){const rosters=files.filter(f=>/\.(xlsx|csv|tsv)$/i.test(f.name));if(rosters.length!==1)throw Error('文件夹内请保留一份名单表格');folderRoster=rosters[0];folderAvatars=files.filter(f=>/\.(png|jpe?g|webp)$/i.test(f.name));$('#importStatus').textContent=`已选择 ${folderRoster.name}，${folderAvatars.length} 张头像。点击“验证并导入”完成导入。`;$('#createFolderStatus').textContent=`${folderRoster.name} · ${folderAvatars.length} 张头像，创建活动时自动导入。`}
$('#avatarFolder').onchange=()=>{try{acceptFolder([...$('#avatarFolder').files])}catch(e){notice(e.message)}};$('#folderDrop').onclick=()=>$('#avatarFolder').click();$('#folderDrop').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#avatarFolder').click()}};$('#folderTemplate').onclick=()=>$('#downloadTemplate').click();$('#folderDrop').ondragover=e=>e.preventDefault();$('#folderDrop').ondrop=async e=>{e.preventDefault();try{const files=[];async function read(entry){if(entry.isFile){files.push(await new Promise((resolve,reject)=>entry.file(resolve,reject)))}else if(entry.isDirectory){const reader=entry.createReader();while(true){const children=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));if(!children.length)break;for(const child of children)await read(child)}}}const entries=[...e.dataTransfer.items].map(i=>i.webkitGetAsEntry?.()).filter(Boolean);if(!entries.length||entries.some(e=>!e.isDirectory))throw Error('请拖入一个完整文件夹');for(const entry of entries)await read(entry);acceptFolder(files)}catch(error){notice(error.message)}};

$('#createFolderDrop').onclick=()=>$('#avatarFolder').click();$('#createFolderDrop').onkeydown=$('#folderDrop').onkeydown;$('#createFolderDrop').ondragover=$('#folderDrop').ondragover;$('#createFolderDrop').ondrop=$('#folderDrop').ondrop;$('#createTemplate').onclick=()=>$('#downloadTemplate').click();

function updateRankPreview(){const names={rank:['第一名','第二名','第三名'],prize:['一等奖','二等奖','三等奖'],grand:['特等奖','一等奖','二等奖'],medal:['金奖','银奖','铜奖'],podium:['冠军','亚军','季军'],lucky:['天选之星','锦鲤之星','幸运之星']},custom=$('#rankStyle').value==='custom';$('#awardNames').hidden=!custom;$('#awardNamesLabel').hidden=!custom;const list=custom?$('#awardNames').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean):names[$('#rankStyle').value];$('#rankPreview').textContent='倒序揭晓示例：'+(list?.length?[...list].reverse().join(' → '):'请从最高名次开始填写名称')+'。表格中的“获奖名称”列可覆盖此设置，按填写顺序对应名次，不指定该行参与者中奖。'}
$('#rankStyle').onchange=updateRankPreview;$('#awardNames').oninput=updateRankPreview;updateRankPreview();

$('#logoUpload').onchange=async()=>{const f=$('#logoUpload').files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>500000){notice('请选择 500KB 以内的 PNG / JPG / WebP 图片');return}logoData=await dataUrl(f);$('#logoPreview').src=logoData};$('#resetLogo').onclick=()=>{logoData='';$('#logoUpload').value='';$('#logoPreview').src='/default-logo.jpg'};

let selectedTheme='deepsea',committedTheme='deepsea',committedAnimation='';$('#openThemes').onclick=async()=>{if(!Account.state.user){notice('请先登录注册账号后再设置主题外观');location.assign('/account?next='+encodeURIComponent(location.pathname+location.hash));return;}try{const {themes}=await import('/themes.js');const currentTheme=await api('/api/theme');committedTheme=currentTheme.id;committedAnimation=currentTheme.animation||'';selectedTheme=committedTheme;window.__themePreview=true;const cards=themes.map(t=>{const b=el('button');b.type='button';b.className='theme-card';b.dataset.themeId=t.id;b.setAttribute('aria-pressed',String(t.id===selectedTheme));const swatch=el('img');swatch.className='theme-mini';swatch.src='/themes/theme-art-'+(t.id==='festival'?'festival-snow':t.id)+'.png';swatch.alt=t.name+'主题封面';swatch.loading='lazy';swatch.style.background=`radial-gradient(ellipse,${t.glow},${t.deep})`;swatch.style.color=t.accent;const cover=el('span');cover.className='theme-illustration';cover.append(swatch);if(t.id==='caishen'){const figure=el('img');figure.className='theme-figure';figure.src='/themes/character-wealth.png';figure.alt='';cover.append(figure)}b.append(cover,el('strong',t.name),el('small',t.description));b.onclick=async()=>{if(['festival','caishen'].includes(t.id)&&!await unlockPremiumTheme(t.id))return;selectedTheme=t.id;window.LuckyTheme?.apply(t.id);for(const card of $('#themeCards').children)card.setAttribute('aria-pressed',String(card.dataset.themeId===t.id));$('#themeStatus').textContent='预览中 · '+t.name};return b});$('#themeCards').replaceChildren(...cards);$('#themeStatus').textContent='选择后可预览，关闭窗口将恢复当前主题。';$('#themeDialog').showModal()}catch(e){notice(e.message)}};$('#saveTheme').onclick=async()=>{const b=$('#saveTheme');b.disabled=true;try{await api('/api/admin/theme',{method:'POST',body:JSON.stringify({id:selectedTheme,animation:document.documentElement.dataset.themeAnimation})});committedTheme=selectedTheme;committedAnimation=document.documentElement.dataset.themeAnimation||'';window.LuckyTheme?.commit(selectedTheme,committedAnimation);$('#themeDialog').close();notice('主题已切换，现场页面会自动同步。')}catch(e){$('#themeStatus').textContent=e.message}finally{b.disabled=false}};$('#themeDialog').addEventListener('close',()=>{window.__themePreview=false;window.LuckyTheme?.commit(committedTheme,committedAnimation)});

function updateDrawModeHint(){$('#drawModeHint').textContent=$('#drawMode').value==='auto'?'自动模式：开始后连续完成全部名次的抽取和揭晓。':$('#scheduleEnabled').checked?'手动模式：到达倒计时时间后自动抽取第一位；每位揭晓完成后，点击“立即抽取下一位”继续。':'手动模式：点击开始抽奖，抽中一位后暂停；点击“立即抽取下一位”继续。'}$('#drawMode').onchange=updateDrawModeHint;$('#scheduleEnabled').addEventListener('change',()=>{if($('#scheduleEnabled').checked)$('#drawMode').value='auto';updateDrawModeHint()});updateDrawModeHint();

const signinGuides={wechat:'登录微信公众平台，确认账号有网页授权获取用户信息权限。复制 AppID 与 AppSecret，配置上方回调域名。平台要求域名校验时，可在这里上传 MP_verify_*.txt，再回公众号后台校验。无需小程序。',dingtalk:'在钉钉开放平台创建应用，填写 Client ID 和 Client Secret。按开放平台要求配置登录回调地址、个人资料读取权限和应用可使用范围，发布应用。企业内部应用请确认观众在可使用范围内。',telegram:'在 Telegram 的 @BotFather 创建机器人，取得 Bot Token。保存公开域名与 Token 后，点击“保存并启用 TG 接收”，系统识别机器人并设置回调。观众扫码打开机器人，点击开始签到，再从机器人回复返回活动页。需要观众能访问 Telegram。'};
let signinSettings=null;function signinConfigView(){const provider=$('#signinConfigProvider').value;if(!signinSettings)return;$('#wechatConfigFields').hidden=provider!=='wechat';$('#dingConfigFields').hidden=provider!=='dingtalk';$('#tgConfigFields').hidden=provider!=='telegram';$('#signinSetupGuide').textContent=signinGuides[provider];$('#signinBaseUrl').value=signinSettings.baseUrl||'';$('#wxAppId').value=signinSettings.wechat.appId||'';$('#dingClientId').value=signinSettings.dingtalk.clientId||'';$('#tgBotUsername').value=signinSettings.telegram.botUsername||'';for(const [selector,key] of [['#wxAppSecret','wechat'],['#dingClientSecret','dingtalk'],['#tgBotToken','telegram']]){$(selector).value='';$(selector).placeholder=signinSettings[key].secretConfigured?'已保存，留空保留':'尚未配置'}$('#wxVerifyFile').value='';$('#wxVerifyStatus').textContent=signinSettings.wechat.verificationFileName?'已保存校验文件：'+signinSettings.wechat.verificationFileName:'';$('#signinConfigStatus').textContent=provider==='telegram'&&signinSettings.telegram.webhookConfigured?'TG 接收已启用，仍请用实际账号扫码验收。':'保存凭证后，还需在对应平台完成权限和回调配置。';updateSigninCallback()}
function updateSigninCallback(){if(!signinSettings)return;const provider=$('#signinConfigProvider').value,base=$('#signinBaseUrl').value.trim()||location.origin;$('#signinCallback').textContent=(provider==='telegram'?'机器人接收地址：':'授权回调地址：')+base.replace(/\/$/,'')+signinSettings.callbacks[provider]}
async function openSigninSettings(){if(Account.state.user?.role!=='owner')return;try{signinSettings=await api('/api/admin/signin-config');$('#signinConfigProvider').value=hiddenSigninProvider()||$('#signinProvider').value;signinConfigView();if($('#apiDialog').open)$('#apiDialog').close();$('#signinDialog').showModal()}catch(e){notice(e.message)}}for(const id of ['#openSigninSettings','#configureSignin'])if($(id))$(id).onclick=openSigninSettings;$('#signinConfigProvider').onchange=signinConfigView;$('#signinBaseUrl').oninput=updateSigninCallback;
async function saveSigninSettings(){const provider=$('#signinConfigProvider').value,body={provider,baseUrl:$('#signinBaseUrl').value.trim()};if(provider==='wechat'){Object.assign(body,{appId:$('#wxAppId').value.trim(),appSecret:$('#wxAppSecret').value.trim()});const file=$('#wxVerifyFile').files[0];if(file){if(file.size>2048)throw Error('请选择微信提供的域名校验小文件');body.verificationFileName=file.name;body.verificationContent=await file.text()}}if(provider==='dingtalk')Object.assign(body,{clientId:$('#dingClientId').value.trim(),clientSecret:$('#dingClientSecret').value.trim()});if(provider==='telegram')Object.assign(body,{botToken:$('#tgBotToken').value.trim(),botUsername:$('#tgBotUsername').value.trim()});signinSettings=await api('/api/admin/signin-config',{method:'POST',body:JSON.stringify(body)});await refreshSigninAvailability();signinConfigView();$('#signinConfigStatus').textContent='配置已保存。密钥已隐藏，请完成平台设置后用实际账号扫码验证。'}$('#saveSigninConfig').onclick=async()=>{const b=$('#saveSigninConfig');b.disabled=true;try{await saveSigninSettings()}catch(e){$('#signinConfigStatus').textContent=e.message}finally{b.disabled=false}};$('#activateTelegram').onclick=async()=>{const b=$('#activateTelegram');b.disabled=true;try{await saveSigninSettings();signinSettings=await api('/api/admin/signin-config/telegram/activate',{method:'POST',body:'{}'});await refreshSigninAvailability();signinConfigView();$('#signinConfigStatus').textContent='TG 机器人接收已启用。请扫描等待页二维码，打开机器人并点击开始签到。'}catch(e){$('#signinConfigStatus').textContent=e.message}finally{b.disabled=false}};
function signinProviderHint(){$('#signinProviderHint').textContent={wechat:'微信授权成功后获取昵称与头像，按同一公众号的 OpenID 去重。',dingtalk:'需创建钉钉应用并配置登录权限及回调，按平台身份去重。',telegram:'扫描二维码打开 TG 机器人，确认开始后登记资格，机器人回复返回活动页链接。'}[$('#signinProvider').value]}$('#signinProvider').onchange=()=>{signinProviderHint();refreshSigninAvailability()};signinProviderHint();

function hiddenSigninProvider(){return /^\/settings\/(wechat|dingtalk|telegram)\/?$/.exec(location.pathname)?.[1]||''}
let signinCapabilities={providers:[]};
const signinReady=id=>signinCapabilities.providers.some(provider=>provider.id===id&&provider.available===true);
async function refreshSigninAvailability(){const owner=Account.state.user?.role==='owner';let failed=false;try{signinCapabilities=await api('/api/signin-capabilities',{cache:'no-store'});if(!Array.isArray(signinCapabilities.providers))throw Error('签到配置响应无效')}catch{signinCapabilities={providers:[]};failed=true}let visibleCount=0;for(const option of $('#signinProvider').options){const ready=signinReady(option.value);option.hidden=!ready;option.disabled=!ready;const names={wechat:'微信 · 扫码签到抽奖',dingtalk:'钉钉 · 扫码签到抽奖',telegram:'Telegram · 扫码签到抽奖'};option.textContent=(names[option.value]||option.value)+(ready?' · 已配置':' · 尚未配置');if(ready)visibleCount++;}const selected=$('#signinProvider').selectedOptions[0];if(!selected||selected.disabled||selected.hidden){const firstReady=[...$('#signinProvider').options].find(o=>!o.disabled&&!o.hidden);if(firstReady)$('#signinProvider').value=firstReady.value;}signinProviderHint();if(failed){$('#signinAvailabilityHint').textContent='扫码平台配置加载失败，请稍后重试。';}else if(visibleCount===0){$('#signinAvailabilityHint').innerHTML='<span style="color:#f39c12">⚠️ 尚未配置扫码平台。未配置平台已自动隐藏，请点击下方【配置扫码抽奖平台】添加。</span>';}else{$('#signinAvailabilityHint').textContent='当前扫码平台已就绪，观众扫码即可进入签到参与抽奖。';}$('#configureSignin').hidden=!owner;$('#kvConfigStatus').hidden=true}


$('#signinDialog').addEventListener('close',()=>{if(hiddenSigninProvider())location.assign('/admin')});

// Keep non-file form fields locally when login is needed. Browser file access must be reselected.
window.saveGiveawayDraft=()=>{try{const fields={};for(const input of document.querySelectorAll('#create input,#create select,#create textarea,.visual-settings input,.visual-settings select,.visual-settings textarea,#award'))if(input.id&&input.type!=='file')fields[input.id]=input.type==='checkbox'?input.checked:input.value;sessionStorage.setItem('giveaway-create-draft',JSON.stringify(fields))}catch{notice('草稿无法保存，请检查浏览器存储设置')}};
try{const draft=JSON.parse(sessionStorage.getItem('giveaway-create-draft')||'null');if(draft){for(const [id,value]of Object.entries(draft)){const input=document.getElementById(id);if(input&&input.type!=='file'){if(input.type==='checkbox')input.checked=value;else input.value=id==='animation'?(value==='float'?'float':'radar'):value}}document.querySelector(`[data-mode="${$('#sourceMode').value}"]`)?.click();updateRankPreview();updateDrawModeHint();notice('已恢复创建草稿；上传图片和名单文件夹请重新选择。')}}catch{sessionStorage.removeItem('giveaway-create-draft')}
for(const id of ['#openApi','#apiButton','#openThemes','#openMusic','#openSigninSettings','#configureSignin']){const button=$(id),handler=button?.onclick;if(button&&handler)button.onclick=e=>{if(Account.state.user?.role!=='owner'){notice('此设置仅限站长访问');return}return handler.call(button,e)}}


function initStagePreview(){
  const canvas=document.getElementById('previewCanvas');
  const badge=document.getElementById('previewBadge');
  const btn=document.getElementById('btnSimulateDraw');
  const animSelect=document.getElementById('animation');
  if(!canvas||!canvas.getContext)return;
  const ctx=canvas.getContext('2d');
  let t=0;
  let simState={active:false,start:0,phase:'idle',candidate:'天选之星'};
  const sampleNames=['李*明 (008)','张*伟 (012)','王*芳 (023)','陈*强 (045)','赵*洋 (056)','孙*涵 (089)','周*楠 (108)','天选之星'];

  if(btn){
    btn.onclick=(e)=>{
      e.preventDefault();
      simState={active:true,start:performance.now(),phase:'roll',candidate:sampleNames[Math.floor(Math.random()*(sampleNames.length-1))]};
      if(badge){badge.textContent='开奖中 · 高速锁定';badge.style.color='#ffd700';}
    };
  }

  if(animSelect){
    animSelect.addEventListener('change',()=>{
      const mode=animSelect.value==='float'?'随机上浮':'聚焦锁定';
      if(!simState.active&&badge){
        badge.textContent=`${mode} · 待机`;
        badge.style.color='#64ffda';
      }
    });
  }

  let seasonalStage=null,seasonalData=null;
  import('/stage.js').then(async({LuckyStage})=>{seasonalStage=new LuckyStage(canvas);const people=sampleNames.map((name,i)=>({id:String(i),name,text:'新春快乐，万事顺意'}));seasonalData={title:'瞎折腾摇奖吧 · 模拟开奖',sourceMode:'custom',status:'ready',presentation:{maxFeints:1,drawMode:'auto'},stats:{eligible:people.length,comments:people.length},plannedWinnerCount:1,winners:people.slice(-1),eligibleComments:people};await seasonalStage.setData(seasonalData)}).catch(error=>console.warn('模拟舞台加载失败',error));
  function render(now){
    if(seasonalStage&&seasonalData){
      seasonalData.status=simState.active?'drawn':'ready';seasonalData.presentation.animation=document.documentElement.dataset.themeAnimation||animSelect.value;seasonalData.presentation.prizeName=($('#prizeName')?.value||'').trim();
      const result=seasonalStage.render(simState.active?now-simState.start:now);if(badge)badge.textContent=result?.final?'模拟开奖完成':simState.active?'模拟开奖中':'主题专属舞台预览';requestAnimationFrame(render);return;
    }
    t+=0.025;
    const w=canvas.width,h=canvas.height;
    const cx=w/2,cy=h/2;
    const animMode=animSelect?animSelect.value:'radar';
    ctx.clearRect(0,0,w,h);
    // Realtime Prize Module on Stage Preview Canvas
    const pName = ($('#prizeName')?.value || '').trim();
    const pImgSrc = ($('#prizeImage')?.value || '').trim();
    if (pName || pImgSrc) {
      ctx.save();
      const badgeW = Math.min(w - 40, Math.max(160, pName.length * 12 + 60));
      const badgeH = 26;
      const bx = cx - badgeW / 2;
      const by = 18;
      ctx.fillStyle = 'rgba(10, 28, 44, 0.88)';
      ctx.strokeStyle = '#64ffda';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 13);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      const pText = pName ? ('🎁 本次奖品：' + pName) : '🎁 本次奖品 [已上传图片]';
      ctx.fillText(pText, cx, by + 17, badgeW - 12);
      ctx.restore();
    }


    let speedMult=1;
    if(simState.active){
      const elapsed=(now-simState.start)/1000;
      if(elapsed<1.4){
        simState.phase='roll';
        speedMult=3.5;
        if(Math.random()<0.3){
          simState.candidate=sampleNames[Math.floor(Math.random()*sampleNames.length)];
        }
      }else if(elapsed<2.1){
        simState.phase='feint';
        speedMult=0.7;
        if(badge)badge.textContent='虚晃减速 · 即将揭晓';
      }else if(elapsed<3.3){
        simState.phase='lock';
        speedMult=0.08;
        if(badge){badge.textContent='✦ 模拟中奖 · 领奖台锁定';badge.style.color='#ffd700';}
      }else{
        simState.active=false;
        if(badge){
          badge.textContent=`${animMode==='float'?'随机上浮':'聚焦锁定'} · 待机`;
          badge.style.color='#64ffda';
        }
      }
    }

    if(animMode==='float'){
      ctx.save();
      for(let j=0;j<3;j++){
        ctx.beginPath();
        ctx.ellipse(cx,cy,70+j*20,(70+j*20)*0.6,Math.sin(t*0.5+j)*0.4,0,Math.PI*2);
        ctx.strokeStyle=j===0?'rgba(100, 255, 218, 0.7)':'rgba(100, 255, 218, 0.25)';
        ctx.lineWidth=1.5;
        ctx.stroke();
      }
      for(let i=0;i<7;i++){
        const px=(cx-160+i*52+Math.sin(t*0.8+i)*15)%(w-40)+20;
        const py=(h-((t*40*speedMult+i*45)%(h+30)));
        ctx.beginPath();
        ctx.arc(px,py,14,0,Math.PI*2);
        ctx.fillStyle='rgba(23, 62, 85, 0.85)';
        ctx.fill();
        ctx.strokeStyle='#64ffda';
        ctx.lineWidth=1.5;
        ctx.stroke();
        ctx.fillStyle='#ffffff';
        ctx.font='10px sans-serif';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(String.fromCharCode(65+i),px,py);
      }
      ctx.restore();
    }else{
      ctx.save();
      ctx.translate(cx,cy);
      for(let j=0;j<3;j++){
        ctx.beginPath();
        const r=40+j*25;
        const dir=j%2===0?1:-1;
        const angle=(t*speedMult*0.8*dir)+j;
        ctx.arc(0,0,r,angle,angle+4.5);
        ctx.strokeStyle=j===0?'#64ffda':'rgba(100, 255, 218, 0.4)';
        ctx.lineWidth=2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-15,0);ctx.lineTo(15,0);
      ctx.moveTo(0,-15);ctx.lineTo(0,15);
      ctx.strokeStyle='#64ffda';
      ctx.lineWidth=1.5;
      ctx.stroke();

      for(let i=0;i<6;i++){
        const orbitR=85+(i%2)*18;
        const ang=t*speedMult*0.6+(i*Math.PI/3);
        const ox=Math.cos(ang)*orbitR;
        const oy=Math.sin(ang)*orbitR;
        ctx.beginPath();
        ctx.arc(ox,oy,13,0,Math.PI*2);
        ctx.fillStyle='rgba(20, 50, 75, 0.9)';
        ctx.fill();
        ctx.strokeStyle='#a2f3ed';
        ctx.lineWidth=1.5;
        ctx.stroke();
        ctx.fillStyle='#fff';
        ctx.font='9px sans-serif';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(String.fromCharCode(75+i),ox,oy);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx,cy);
    if(simState.phase==='lock'){
      const grad=ctx.createRadialGradient(0,0,5,0,0,70);
      grad.addColorStop(0,'rgba(255, 215, 0, 0.85)');
      grad.addColorStop(1,'rgba(255, 215, 0, 0)');
      ctx.fillStyle=grad;
      ctx.beginPath();
      ctx.arc(0,0,70,0,Math.PI*2);
      ctx.fill();

      ctx.fillStyle='#ffd700';
      ctx.font='bold 16px sans-serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText('★ '+simState.candidate+' ★',0,0);

      ctx.fillStyle='#fff';
      ctx.font='11px sans-serif';
      ctx.fillText('中奖确认',0,22);
    }else if(simState.phase==='roll'||simState.phase==='feint'){
      ctx.fillStyle='#ffd700';
      ctx.font='bold 15px sans-serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(simState.candidate,0,0);
    }else{
      ctx.fillStyle='#a2f3ed';
      ctx.font='24px sans-serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText('✦',0,0);
    }
    ctx.restore();

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

initStagePreview();

// --- Preserved Functions: Stepper & Prize Upload & Metric Navigation ---
$('#btnDecWinners')?.addEventListener('click', () => {
  const w = $('#winnerCount');
  if (w) w.value = Math.max(1, (parseInt(w.value) || 1) - 1);
});
$('#btnIncWinners')?.addEventListener('click', () => {
  const w = $('#winnerCount');
  if (w) w.value = Math.min(100, (parseInt(w.value) || 1) + 1);
});

const pFile = $('#prizeImageFile');
const pInput = $('#prizeImage');
const pPrev = $('#prizeImagePreview');
const pClear = $('#prizeImageClear');
if (pFile && pInput) {
  pFile.onchange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      pInput.value = ev.target.result;
      if (pPrev) { pPrev.src = ev.target.result; pPrev.style.display = 'inline-block'; }
      if (pClear) pClear.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  };
  pInput.oninput = () => {
    if (pInput.value.trim()) {
      if (pPrev) { pPrev.src = pInput.value.trim(); pPrev.style.display = 'inline-block'; }
      if (pClear) pClear.style.display = 'inline-block';
    } else {
      if (pPrev) pPrev.style.display = 'none';
      if (pClear) pClear.style.display = 'none';
    }
  };
  if (pClear) {
    pClear.onclick = () => {
      pInput.value = '';
      pFile.value = '';
      if (pPrev) pPrev.style.display = 'none';
      pClear.style.display = 'none';
    };
  }
}

$('#metricCardTotal')?.addEventListener('click', () => {
  location.hash = '#activities';
  document.getElementById('activities')?.scrollIntoView({ behavior: 'smooth' });
});

async function unlockPremiumTheme(themeId){
 try{
 const state=await api('/api/account/unlocked-themes');if(state.unlockedThemes?.includes(themeId))return true;
 return await new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.className='spring-unlock';
 dialog.innerHTML='<div class="newyear-greeting"><img src="/themes/character-boy.png" alt="童男拜年"><img src="/themes/character-girl.png" alt="童女拜年"></div><h2>恭贺新春</h2><p>瞎折腾祝您新春快乐、阖家幸福、万事顺意！</p><p>送一份压岁钱，解锁'+(themeId==='festival'?'春节贺岁':'财神送福')+'主题。</p><div class="gift-amounts"><button type="button" data-amount="5">￥5</button><button type="button" data-amount="10">￥10</button><button type="button" data-amount="20">￥20</button></div><label>自定义金额<input type="number" min="0.01" step="0.01" value="5"></label><div class="gift-wallet"><strong>福 · 新春红包</strong><p class="gift-total">￥5</p><img src="/api/donation" alt="打赏收款二维码" style="max-width:240px;width:100%"></div><p role="status">付款后点击下方按钮。此处为自行确认付款，暂不核验到账。</p><button type="button" class="primary" data-paid>压岁钱已到位</button><button type="button" data-cancel>你已经长大了</button>';
 document.body.append(dialog);let amount=5,settled=false;const finish=value=>{if(settled)return;settled=true;dialog.close();dialog.remove();resolve(value)};
 const input=dialog.querySelector('input');const total=dialog.querySelector('.gift-total');const wallet=dialog.querySelector('.gift-wallet');const money=el('span','￥');money.className='gift-money';wallet.append(money);const seal=()=>{wallet.hidden=false;wallet.classList.remove('gift-sealed');void wallet.offsetWidth;wallet.classList.add('gift-sealed')};wallet.hidden=true;const paid=dialog.querySelector('[data-paid]');paid.disabled=true;input.value='';input.placeholder='请输入金额';input.oninput=()=>{amount=Number(input.value);paid.disabled=!(amount>0);wallet.hidden=!(amount>0);total.textContent='￥'+(Number.isFinite(amount)?amount:0);money.textContent='￥'+(Number.isFinite(amount)?amount:0);if(amount>0)seal()};
 dialog.querySelectorAll('[data-amount]').forEach(button=>button.onclick=()=>{input.value=button.dataset.amount;input.oninput();seal()});
 dialog.querySelector('[data-cancel]').onclick=()=>{notice('其他主题也不错噢');finish(false)};dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false)});
 dialog.querySelector('[data-paid]').onclick=async event=>{if(!(amount>0)){total.textContent='请选择有效金额';return}event.target.disabled=true;try{await api('/api/account/unlock-theme',{method:'POST',body:JSON.stringify({themeId,amount})});finish(true)}catch(error){dialog.querySelector('[role=status]').textContent=error.message;event.target.disabled=false}};
 dialog.showModal();
 });
 }catch(error){notice(error.message);return false}
}
(async()=>{const {animationsForTheme,normalizeThemeAnimation}=await import('/theme-policy.js');const select=document.getElementById('animation');if(!select)return;function update(){const theme=document.documentElement.dataset.theme,old=select.value;select.replaceChildren(...animationsForTheme(theme).map(item=>new Option(item.name,item.id)));select.value=normalizeThemeAnimation(theme,document.documentElement.dataset.themeAnimation||old);const label=document.querySelector('label[for="animation"]');if(label)label.textContent=['festival','caishen'].includes(theme)?'主题风格':'抽奖动画'}window.addEventListener('lucky-theme-change',update);update()})();

async function editActivityPrizes(g){
 const details=await api(`/api/giveaways/${g.id}`),presentation=details.presentation||JSON.parse(g.presentation_json||'{}');
 const dialog=document.createElement('dialog');dialog.className='activity-prizes';const heading=el('h2','活动奖品设置');dialog.append(heading,el('p','按中奖名次设置，可填写图片和文字、仅图片、仅文字，或留空。'));
 const entries=[];for(let i=0;i<Math.min(100,Math.max(1,g.winner_count));i++){const existing=presentation.prizes?.[i]||(i===0?{name:presentation.prizeName,image:presentation.prizeImage}:{}),row=el('fieldset'),legend=el('legend','第 '+(i+1)+' 名'),name=el('input'),file=el('input'),preview=el('img');name.placeholder='奖品文字（可留空）';name.value=existing.name||'';file.type='file';file.accept='image/png,image/jpeg,image/webp';preview.alt='奖品预览';preview.style.cssText='max-width:120px;max-height:100px';let image=existing.image||'';preview.hidden=!image;if(image)preview.src=image;
 const clear=el('button','清除图片');clear.type='button';clear.onclick=()=>{image='';file.value='';preview.hidden=true};file.onchange=async()=>{const value=file.files[0];if(!value)return;if(value.size>1000000){notice('奖品图片请控制在 1MB 以内');file.value='';return}image=await dataUrl(value);preview.src=image;preview.hidden=false};row.append(legend,name,file,preview,clear);dialog.append(row);entries.push(()=>({name:name.value.trim(),image}))}
 const status=el('p'),save=el('button','保存奖品'),cancel=el('button','关闭');save.type=cancel.type='button';save.className='primary';cancel.onclick=()=>{dialog.close();dialog.remove()};save.onclick=async()=>{save.disabled=true;try{const prizes=entries.map(read=>read());await api(`/api/giveaways/${g.id}/presentation`,{method:'POST',body:JSON.stringify({...presentation,prizes,prizeName:prizes[0]?.name||'',prizeImage:prizes[0]?.image||''})});dialog.close();dialog.remove();notice('奖品已保存')}catch(error){status.textContent=error.message;save.disabled=false}};dialog.append(status,save,cancel);document.body.append(dialog);dialog.showModal();
}

(()=>{const oldPrize=document.getElementById('prizeName')?.closest('.stage-section');if(oldPrize){oldPrize.hidden=true;const hint=el('p','奖品图片与文字请在活动管理 → 奖品设置中，按中奖名次分别配置。');hint.className='muted';oldPrize.before(hint)}})();

(()=>{const preview=document.getElementById('stagePreview'),panel=preview?.parentElement;if(panel){const more=el('details'),summary=el('summary','更多舞台设置 · LOGO、二维码与颁奖样式');more.append(summary);const keep=new Set([preview,panel.querySelector('.section-head'),document.getElementById('animation'),panel.querySelector('label[for="animation"]')]);for(const child of [...panel.children])if(!keep.has(child))more.append(child);panel.append(more)}const form=document.getElementById('create'),more=form?.querySelector('details');if(more){more.querySelector('summary').textContent='更多设置 · 筛选条件、虚晃与定时开奖';for(const id of ['maxFeints','finalAnnouncement']){const input=document.getElementById(id),label=form.querySelector('label[for="'+id+'"]'),next=input?.nextElementSibling;if(label)more.append(label);if(input)more.append(input);if(id==='maxFeints'&&next?.tagName==='P')more.append(next)}}})();

(()=>{const select=document.getElementById('animation'),label=document.querySelector('label[for="animation"]');if(select)select.hidden=true;if(label)label.hidden=true;let choices;function update(){if(!choices){choices=document.createElement('div');choices.className='seasonal-style-options';document.getElementById('themeCards')?.after(choices)}choices.replaceChildren();if(document.documentElement.dataset.theme!=='festival')return;for(const [id,title]of [['festival-snow','雪夜团圆'],['festival-gala','新春庆典']]){const button=el('button');button.type='button';const image=el('img');image.src='/themes/theme-art-'+id+'.png';image.alt=title;button.append(image,el('strong',title));button.setAttribute('aria-pressed',String(document.documentElement.dataset.themeAnimation===id));button.onclick=()=>window.LuckyTheme?.apply('festival',id);choices.append(button)}}window.addEventListener('lucky-theme-change',update);update()})();
