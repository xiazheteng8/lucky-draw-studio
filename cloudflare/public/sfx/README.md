# 中奖人声音效来源记录

[Cloudflare Pages 示范站点](https://lucky-37k.pages.dev/) · [VPS 示范站点](https://lucky.xiazheteng.fun/) · [YouTube @xiazheteng8](https://www.youtube.com/@xiazheteng8) · [Telegram @xiazheteng8](https://t.me/xiazheteng8)

第一次部署？先按 [本地 / VPS 新手教程](../../../README.md) 或 [GitHub / Cloudflare Pages 新手教程](../../../README-PAGES.md) 操作。下面是本目录的功能和配置参考。

- 发布文件：`wow.wav`。
- 用户明确指定的来源文件：`C:/Users/xiazh/Downloads/Music/wow.wav`。
- 接入日期：2026-11-01。
- 本项目按用户指示原样复制；未修改来源文件，未裁剪、重采样或重新编码。
- 原作者、上游网页及许可未知，不能宣称此文件为 CC0 或已确认可自由再分发。此次接入依据用户对该文件的明确指定，不为其补造许可声明。
- SHA-256（来源文件与两版发布文件一致）：`5aca3d7d5688804a74dee8d362cf6822260f9b15357f774a2ee572c4d733b95c`。
- ffprobe 实测：WAV / PCM signed 16-bit little-endian，48,000 Hz，双声道，1.868688 秒，358,866 字节。

运行时从本站 `sfx/wow.wav` 加载，无需连接第三方网站。音频通过舞台原有共享 gain 节点输出，音量、静音、录制使用同一条链路。`playWinnerSound(context, output)` 仍同步返回取消函数；`prepareWinnerSound(context)` 在 StageMusic.enable 中于 AudioContext.resume 后等待预解码，避免首次中奖临时下载。首次模块加载会预取文件，解码缓存按 AudioContext 隔离。
