import fs from 'node:fs';




const target=new URL('../.env',import.meta.url);
if(fs.existsSync(target)){console.log('已有配置，保持原配置。运行 npm start 即可启动。');process.exit(0)}
fs.copyFileSync(new URL('../.env.example',import.meta.url),target,fs.constants.COPYFILE_EXCL);











console.log('配置已保存。运行 npm start，公开创建页 http://localhost:3000/；首次打开 /setup，使用启动终端显示的一次性 setupKey 设置站长账号密码；之后通过 /owner 管理站点，/account 登录注册。');
