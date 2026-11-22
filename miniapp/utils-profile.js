const DEFAULT_LOGO='/assets/default-logo.jpg';
const saved=new Map();
function profileLogo(value,site,app){
 const raw=typeof value==='string'?value.trim():'';if(!raw)return Promise.resolve(DEFAULT_LOGO);
 if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(raw)&&raw.length<2800000){if(saved.has(raw))return Promise.resolve(saved.get(raw));const parts=raw.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/),file=wx.env.USER_DATA_PATH+'/activity-logo-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+(parts[1]==='jpeg'?'jpg':parts[1]);return new Promise(resolve=>wx.getFileSystemManager().writeFile({filePath:file,data:parts[2],encoding:'base64',success:()=>{saved.set(raw,file);if(saved.size>12){const [key,path]=saved.entries().next().value;saved.delete(key);wx.getFileSystemManager().unlink({filePath:path,fail:()=>{}})}resolve(file)},fail:()=>resolve(DEFAULT_LOGO)}))}
 if(raw.startsWith('/')&&!raw.startsWith('//'))return Promise.resolve(app.apiUrl(site,raw));
 if(/^https:\/\/[^\s@]+$/i.test(raw))return Promise.resolve(raw);
 return Promise.resolve(DEFAULT_LOGO);
}
function privacyConsent(){return new Promise((resolve,reject)=>{if(!wx.requirePrivacyAuthorize){resolve();return}wx.requirePrivacyAuthorize({success:resolve,fail:()=>reject(new Error('请阅读并同意隐私保护指引后再选择头像昵称'))})})}
module.exports={DEFAULT_LOGO,profileLogo,privacyConsent};
