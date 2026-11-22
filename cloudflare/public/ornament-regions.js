// Individually inspected bounds: generated subjects need not align to a grid.
const common={hero:[0,0,1150,400],stat1:[0,400,390,300],stat2:[400,400,360,310],stat3:[780,400,360,320],form:[0,730,1150,294],sidebar:[1180,0,356,1024]};
const overrides={
 caishen:{form:[0,700,1150,324]},
 deepsea:{hero:[0,0,1150,400],stat1:[0,410,350,270],stat2:[350,410,390,270],stat3:[750,410,390,270],form:[0,680,1150,344],sidebar:[1190,0,346,1024]},
 gala:{hero:[0,0,1140,420],stat1:[0,470,400,220],stat2:[480,420,220,300],stat3:[800,420,320,300],form:[0,750,1140,274],sidebar:[1200,0,336,1024]},
 sakura:{hero:[0,0,1110,450],stat1:[0,470,380,270],stat2:[400,470,360,250],stat3:[780,470,340,270],form:[0,760,1110,264]},
 paper:{hero:[0,0,1120,400],stat1:[0,430,370,275],stat2:[410,420,320,285],stat3:[760,480,350,220],form:[0,720,1120,304],sidebar:[1140,0,396,1024]},
 aurora:{hero:[0,0,1150,390],stat1:[0,390,395,320],stat2:[420,410,340,300],stat3:[780,400,360,310],form:[0,710,1150,314]},
 cyber:{hero:[0,0,1160,395],stat1:[0,410,370,300],stat2:[420,410,350,300],stat3:[840,405,290,300],form:[0,740,1160,284]}
};
export function ornamentRegion(theme,role){return overrides[theme]?.[role]||common[role]}
