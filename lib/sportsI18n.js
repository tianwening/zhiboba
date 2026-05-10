const LEAGUE_NAMES = new Map([
  ["2025-26-english-premier-league", "英超"],
  ["english premier league", "英超"],
  ["premier league", "英超"],
  ["eng.1", "英超"],
  ["uefa champions league", "欧冠"],
  ["champions league", "欧冠"],
  ["semifinals", "半决赛"],
  ["post-season", "美职篮季后赛"],
  ["nba 季后赛", "美职篮季后赛"],
  ["preseason", "美职篮季前赛"],
  ["nba 季前赛", "美职篮季前赛"],
  ["regular season", "美职篮常规赛"],
  ["nba 常规赛", "美职篮常规赛"],
  ["nba", "美职篮"],
]);

const TEAM_NAMES = new Map([
  ["AFC Bournemouth", "伯恩茅斯"],
  ["Arsenal", "阿森纳"],
  ["Aston Villa", "阿斯顿维拉"],
  ["Bayern Munich", "拜仁慕尼黑"],
  ["Brentford", "布伦特福德"],
  ["Brighton & Hove Albion", "布莱顿"],
  ["Brighton and Hove Albion", "布莱顿"],
  ["Burnley", "伯恩利"],
  ["Chelsea", "切尔西"],
  ["Crystal Palace", "水晶宫"],
  ["Everton", "埃弗顿"],
  ["Fulham", "富勒姆"],
  ["Leeds United", "利兹联"],
  ["Liverpool", "利物浦"],
  ["Manchester City", "曼城"],
  ["Manchester United", "曼联"],
  ["Newcastle United", "纽卡斯尔联"],
  ["Nottingham Forest", "诺丁汉森林"],
  ["Paris Saint-Germain", "巴黎圣日耳曼"],
  ["Sunderland", "桑德兰"],
  ["Tottenham Hotspur", "热刺"],
  ["West Ham United", "西汉姆联"],
  ["Wolverhampton Wanderers", "狼队"],

  ["Atlanta Hawks", "亚特兰大老鹰"],
  ["Boston Celtics", "波士顿凯尔特人"],
  ["Brooklyn Nets", "布鲁克林篮网"],
  ["Charlotte Hornets", "夏洛特黄蜂"],
  ["Chicago Bulls", "芝加哥公牛"],
  ["Cleveland Cavaliers", "克利夫兰骑士"],
  ["Dallas Mavericks", "达拉斯独行侠"],
  ["Denver Nuggets", "丹佛掘金"],
  ["Detroit Pistons", "底特律活塞"],
  ["Golden State Warriors", "金州勇士"],
  ["Houston Rockets", "休斯敦火箭"],
  ["Indiana Pacers", "印第安纳步行者"],
  ["LA Clippers", "洛杉矶快船"],
  ["Los Angeles Clippers", "洛杉矶快船"],
  ["Los Angeles Lakers", "洛杉矶湖人"],
  ["Memphis Grizzlies", "孟菲斯灰熊"],
  ["Miami Heat", "迈阿密热火"],
  ["Milwaukee Bucks", "密尔沃基雄鹿"],
  ["Minnesota Timberwolves", "明尼苏达森林狼"],
  ["New Orleans Pelicans", "新奥尔良鹈鹕"],
  ["New York Knicks", "纽约尼克斯"],
  ["Oklahoma City Thunder", "俄克拉荷马城雷霆"],
  ["Orlando Magic", "奥兰多魔术"],
  ["Philadelphia 76ers", "费城 76 人"],
  ["Phoenix Suns", "菲尼克斯太阳"],
  ["Portland Trail Blazers", "波特兰开拓者"],
  ["Sacramento Kings", "萨克拉门托国王"],
  ["San Antonio Spurs", "圣安东尼奥马刺"],
  ["Toronto Raptors", "多伦多猛龙"],
  ["Utah Jazz", "犹他爵士"],
  ["Washington Wizards", "华盛顿奇才"],
]);

function normalizeName(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return normalizeName(value).toLowerCase();
}

export function translateLeague(value) {
  const name = normalizeName(value);
  if (!name) {
    return name;
  }

  return LEAGUE_NAMES.get(normalizeKey(name)) ?? LEAGUE_NAMES.get(name) ?? name;
}

export function translateTeam(value) {
  const name = normalizeName(value);
  if (!name) {
    return name;
  }

  return TEAM_NAMES.get(name) ?? name;
}
