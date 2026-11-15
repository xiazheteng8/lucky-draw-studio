export const scanningQuips=["让我瞅瞅谁在偷笑", "雷达闻到欧气了", "这头像有点中奖相", "别躲，镜头看见你了", "先抓一位显眼包", "好运正在查户口", "锦鲤探头，先别激动", "这位朋友，欧气借点", "系统正在憋大招", "离富贵就差一个点头", "财神正在看你的简历", "这气质，像来领奖的", "别眨眼，运气在拐弯", "看着像有福的样子", "先把期待值拉满", "运气差了一点？再瞅瞅", "这位的欧气有点烫", "雷达都想加你好友", "命运正在搓小手", "好像就是你，容我确认"];
export const winnerQuips=["这是出门踩了狗屎吗", "算你小子走运", "财神点名，别装没听见", "锦鲤本鲤终于露脸了", "这泼天的富贵砸中了", "运气好到系统想报警", "行，你今天赢麻了", "欧皇藏不住了吧", "快接住，奖品烫手", "祖坟的青烟拐到这了", "这回真让你捡着了", "这运气，建议今天买彩票", "恭喜这位显眼包", "好家伙，欧气超标了", "幸运敲门，你直接拆墙", "被财神加入特别关注", "别谦虚，今天你最欧", "你这锦鲤是批发的吧", "奖品：我跟你走", "嘴角先别咧到后脑勺"];
export const rejectionQuips=["差一点点也不行呀", "未中奖，运气差了一点", "未中奖，财神刚好下班了", "未中奖，锦鲤打了个滑", "未中奖，奖品与你擦肩了", "未中奖，欧气还在堵车", "未中奖，富贵临时拐弯了", "未中奖，差点就能笑出声", "未中奖，好运还没挂上挡", "未中奖，雷达先放你一马", "未中奖，幸运今天有点皮", "未中奖，这波先攒点人品", "未中奖，奖品突然害羞了", "未中奖，就差财神点头了", "未中奖，欧气余额待充值", "未中奖，这回是心跳体验卡"];
function hash(seed){let n=2166136261;for(const ch of String(seed))n=Math.imul(n^ch.codePointAt(0),16777619)>>>0;return n}
// Stable within a tracking segment, shared by live playback and exported video.
export function pickQuip(locked,seed,segment=0){const words=locked?winnerQuips:scanningQuips;return words[(hash(seed)+Math.max(0,Math.floor(segment))*17)%words.length]}
// A separate, disjoint pool guarantees that dismissal never repeats the lock quip.
export function pickRejectionQuip(seed,segment=0){return rejectionQuips[(hash(seed)+Math.max(0,Math.floor(segment)))%rejectionQuips.length]}
