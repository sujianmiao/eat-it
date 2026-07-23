/**
 * 可以吃吗？ - 饮食健康分析核心模块
 * 
 * 功能：输入食物名称 + 用户身份信息，输出完整的饮食分析结果
 * 
 * 核心流程：
 * 1. 营养解析：从本地数据库查询热量、蛋白质、碳水、脂肪、纤维、钠等数据
 * 2. 过敏原标注：识别食物中是否含 8 类常见过敏原
 * 3. 禁忌匹配：匹配食物相克和药物禁忌
 * 4. 个性化建议：根据用户身份生成定制化建议
 */

const fs = require('fs');
const path = require('path');

// 加载本地数据库
const nutritionDbPath = path.join(__dirname, '..', 'data', 'nutrition.db.json');
const warningsDbPath = path.join(__dirname, '..', 'data', 'warnings.db.json');

let nutritionDB = {};
let warningsDB = [];

try {
  nutritionDB = JSON.parse(fs.readFileSync(nutritionDbPath, 'utf-8'));
  warningsDB = JSON.parse(fs.readFileSync(warningsDbPath, 'utf-8'));
} catch (e) {
  console.warn('数据库加载失败，使用空数据:', e.message);
}

/**
 * 八大类常见过敏原
 * 用于标准化过敏原输出和匹配
 */
const COMMON_ALLERGENS = [
  '小麦', '花生', '坚果', '鸡蛋', 
  '海鲜', '鱼类', '牛奶', '大豆', '芝麻'
];

/**
 * 用户身份配置
 * 每种身份对应不同的分析侧重点和建议策略
 */
const USER_ROLES = {
  fitness: {
    name: '健身达人',
    focus: ['蛋白质', '肌肉合成', '运动恢复'],
    calorieAdjust: 1.2,
    proteinWeight: 2.0
  },
  weightLoss: {
    name: '减肥人士',
    focus: ['热量控制', '膳食纤维', '饱腹感'],
    calorieAdjust: 0.7,
    proteinWeight: 1.6
  },
  recovery: {
    name: '病后康复',
    focus: ['免疫力', '易消化', '营养密度'],
    calorieAdjust: 1.0,
    proteinWeight: 1.5
  },
  mom: {
    name: '宝妈/孕妇',
    focus: ['胎儿发育', '营养全面', '食品安全'],
    calorieAdjust: 1.1,
    proteinWeight: 1.8
  },
  health: {
    name: '养生爱好者',
    focus: ['性味平衡', '药食同源', '养生调理'],
    calorieAdjust: 1.0,
    proteinWeight: 1.2
  },
  indecisive: {
    name: '选择纠结症',
    focus: ['对比分析', '权衡利弊'],
    calorieAdjust: 1.0,
    proteinWeight: 1.2
  },
  general: {
    name: '通用',
    focus: ['均衡饮食', '营养合理'],
    calorieAdjust: 1.0,
    proteinWeight: 1.0
  }
};

/**
 * 步骤 1：营养解析
 * 根据食物名称从本地数据库查询营养数据
 * 
 * @param {string} foodName - 食物名称
 * @returns {object|null} 营养数据对象，找不到返回 null
 */
function getNutritionData(foodName) {
  if (!foodName || typeof foodName !== 'string') {
    return null;
  }

  const trimmedName = foodName.trim();

  // 精确匹配
  if (nutritionDB[trimmedName]) {
    return {
      ...nutritionDB[trimmedName],
      matchType: 'exact',
      matchName: trimmedName
    };
  }

  // 模糊匹配（包含关系）
  const keys = Object.keys(nutritionDB);
  for (const key of keys) {
    if (key.includes(trimmedName) || trimmedName.includes(key)) {
      return {
        ...nutritionDB[key],
        matchType: 'fuzzy',
        matchName: key
      };
    }
  }

  return null;
}

/**
 * 步骤 2：过敏原标注
 * 识别食物中是否含有八大类常见过敏原
 * 
 * @param {object} foodData - 食物数据对象
 * @returns {string[]} 过敏原列表
 */
function detectAllergens(foodData) {
  if (!foodData) return [];

  const allergens = new Set();
  const foodAllergens = foodData.allergens || [];
  const ingredients = foodData.ingredients || [];

  // 直接从 foodData.allergens 添加
  foodAllergens.forEach(a => allergens.add(a));

  // 从配料表中检测过敏原
  const ingredientText = ingredients.join('、');
  COMMON_ALLERGENS.forEach(allergen => {
    if (ingredientText.includes(allergen)) {
      allergens.add(allergen);
    }
  });

  // 特殊过敏原映射
  if (ingredientText.includes('面粉') || ingredientText.includes('小麦粉') || ingredientText.includes('麸质')) {
    allergens.add('小麦');
  }
  if (ingredientText.includes('鸡蛋') || ingredientText.includes('蛋黄') || ingredientText.includes('蛋白')) {
    allergens.add('鸡蛋');
  }
  if (ingredientText.includes('牛奶') || ingredientText.includes('奶粉') || ingredientText.includes('奶酪') || ingredientText.includes('芝士')) {
    allergens.add('牛奶');
  }
  if (ingredientText.includes('大豆') || ingredientText.includes('黄豆') || ingredientText.includes('酱油') || ingredientText.includes('豆腐')) {
    allergens.add('大豆');
  }
  if (ingredientText.includes('花生') || ingredientText.includes('花生酱')) {
    allergens.add('花生');
  }
  if (ingredientText.includes('坚果') || ingredientText.includes('核桃') || ingredientText.includes('杏仁') || ingredientText.includes('腰果')) {
    allergens.add('坚果');
  }
  if (ingredientText.includes('鱼') || ingredientText.includes('虾') || ingredientText.includes('蟹') || ingredientText.includes('贝') || ingredientText.includes('海鲜')) {
    allergens.add('海鲜');
  }
  if (ingredientText.includes('芝麻')) {
    allergens.add('芝麻');
  }

  return Array.from(allergens);
}

/**
 * 步骤 3：禁忌匹配
 * 匹配食物相克、药物禁忌、疾病禁忌等
 * 
 * @param {object} foodData - 食物数据对象
 * @param {object} userProfile - 用户档案 { gender, age, role, disease? }
 * @returns {string[]} 禁忌列表
 */
function matchContraindications(foodData, userProfile) {
  if (!foodData) return [];

  const contraindications = new Set();
  const ingredients = foodData.ingredients || [];
  const foodAllergens = foodData.allergens || [];
  const foodTags = foodData.tags || [];
  const foodName = foodData.matchName || '';

  const disease = userProfile?.disease || '';
  const role = userProfile?.role || 'general';
  const age = userProfile?.age || 30;

  // 遍历禁忌数据库进行匹配
  warningsDB.forEach(warning => {
    const conflict = warning.conflict || '';
    const item = warning.item || '';

    // 检查食物是否包含冲突成分
    const hasConflict = ingredients.some(ing => 
      conflict.includes(ing) || ing.includes(conflict) ||
      foodTags.some(tag => tag.includes(conflict) || conflict.includes(tag)) ||
      foodName.includes(conflict) || conflict.includes(foodName)
    ) || foodAllergens.some(a => conflict.includes(a) || a.includes(conflict));

    if (hasConflict) {
      // 疾病相关禁忌
      if (warning.type === 'disease' && disease && item.includes(disease)) {
        contraindications.add(`${item}患者${warning.effect}`);
      }
      // 食物相克
      if (warning.type === 'food') {
        contraindications.add(`与${item}同食：${warning.effect}`);
      }
      // 特殊人群
      if (warning.type === 'special') {
        if (role === 'mom' && (item.includes('孕妇') || item.includes('哺乳期'))) {
          contraindications.add(`${item}注意：${warning.effect}`);
        }
        if (age <= 1 && item.includes('婴幼儿')) {
          contraindications.add(`${item}注意：${warning.effect}`);
        }
      }
    }
  });

  // 年龄相关禁忌
  if (age < 18) {
    if (ingredients.some(i => i.includes('酒') || i.includes('酒精'))) {
      contraindications.add('未成年人禁止饮酒');
    }
    if (foodTags.includes('辛辣') || foodName.includes('辣')) {
      contraindications.add('青少年脾胃娇嫩，辛辣刺激食物需适量');
    }
  }

  if (age >= 65) {
    if (foodTags.includes('高糖')) {
      contraindications.add('老年人代谢减慢，高糖食物需严格控制');
    }
    if (foodTags.includes('高盐')) {
      contraindications.add('老年人血压调节能力下降，高盐食物需避免');
    }
  }

  // 性别相关禁忌（孕妇等特殊情况已在上面处理）

  return Array.from(contraindications);
}

/**
 * 步骤 4：个性化建议生成
 * 根据用户身份生成定制化的饮食建议
 * 
 * @param {object} foodData - 食物数据对象
 * @param {string[]} allergens - 过敏原列表
 * @param {string[]} contraindications - 禁忌列表
 * @param {object} userProfile - 用户档案
 * @returns {object} 个性化建议 { summary, dietTips, replaceSuggestions }
 */
function generateCustomAdvice(foodData, allergens, contraindications, userProfile) {
  const role = userProfile?.role || 'general';
  const age = userProfile?.age || 30;
  const gender = userProfile?.gender || 'male';
  const disease = userProfile?.disease || '';

  const roleConfig = USER_ROLES[role] || USER_ROLES.general;
  const nutrition = foodData?.nutrition || {};
  const foodName = foodData?.matchName || '该食物';
  const category = foodData?.category || '';

  const dietTips = [];
  const replaceSuggestions = [];
  let summary = '';

  // 基础判断：是否有严重禁忌
  const hasSevereWarning = contraindications.some(c => 
    c.includes('致命') || c.includes('严重') || c.includes('禁止')
  );
  const hasAllergen = allergens.length > 0;

  // 根据身份生成建议
  switch (role) {
    case 'fitness': // 健身达人
      summary = generateFitnessAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName);
      break;

    case 'weightLoss': // 减肥人士
      summary = generateWeightLossAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName);
      break;

    case 'recovery': // 病后康复
      summary = generateRecoveryAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName, disease);
      break;

    case 'mom': // 宝妈/孕妇
      summary = generateMomAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName, allergens);
      break;

    case 'health': // 养生爱好者
      summary = generateHealthAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName, category);
      break;

    case 'indecisive': // 选择纠结症
      summary = generateIndecisiveAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName);
      break;

    default: // 通用
      summary = generateGeneralAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName);
  }

  // 通用补充建议
  if (nutrition.sodium > 600) {
    dietTips.push('钠含量较高，建议搭配低钾高钾食物（如香蕉、土豆），每日钠摄入控制在2300mg以内');
  }
  if (nutrition.fat > 20) {
    dietTips.push('脂肪含量较高，建议减少烹饪用油，搭配富含膳食纤维的蔬菜');
  }
  if (nutrition.sugar > 15 || (nutrition.carbs && nutrition.carbs > 25)) {
    dietTips.push('碳水/糖分含量较高，注意控制食用量，搭配蛋白质延缓吸收');
  }

  // 有严重禁忌时调整结论
  if (hasSevereWarning || (hasAllergen && (role === 'mom' || age < 18))) {
    summary = `⚠️ ${summary}`;
  }

  return { summary, dietTips, replaceSuggestions };
}

/**
 * 健身达人专属建议
 */
function generateFitnessAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName) {
  const protein = nutrition.protein || 0;
  const calories = nutrition.calories || 0;
  const fat = nutrition.fat || 0;

  if (protein >= 15) {
    dietTips.push(`蛋白质丰富（${protein}g/100g），适合训练后补充，促进肌肉合成`);
    dietTips.push('建议训练后30-60分钟内食用，搭配碳水化合物效果更佳');
  } else {
    dietTips.push(`蛋白质含量一般（${protein}g/100g），建议额外补充优质蛋白质`);
    replaceSuggestions.push('可替换为鸡胸肉、鸡蛋、鱼虾等高蛋低脂食物');
  }

  if (fat > 15) {
    dietTips.push(`脂肪含量较高（${fat}g/100g），减脂期需控制摄入量`);
  } else {
    dietTips.push('脂肪含量适中，适合增肌期和减脂期食用');
  }

  if (calories > 300) {
    return `${foodName}热量较高（${calories}kcal/100g），增肌期可适量食用，减脂期需控制`;
  } else {
    return `${foodName}营养均衡，适合健身人群日常食用`;
  }
}

/**
 * 减肥人士专属建议
 */
function generateWeightLossAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName) {
  const calories = nutrition.calories || 0;
  const fiber = nutrition.fiber || 0;
  const fat = nutrition.fat || 0;
  const protein = nutrition.protein || 0;

  if (calories > 250) {
    dietTips.push(`热量偏高（${calories}kcal/100g），减肥期间建议少量食用`);
    replaceSuggestions.push('可用低热量高纤维蔬菜替代，如黄瓜、番茄、生菜');
  } else if (calories < 50) {
    dietTips.push(`低热量食物（${calories}kcal/100g），减肥期间可多吃增加饱腹感`);
  } else {
    dietTips.push(`热量适中（${calories}kcal/100g），注意控制食用量`);
  }

  if (fiber >= 3) {
    dietTips.push(`膳食纤维丰富（${fiber}g/100g），有助于增加饱腹感、促进肠道蠕动`);
  } else {
    dietTips.push('膳食纤维较少，建议搭配高纤维蔬菜一起食用');
  }

  if (fat > 15) {
    replaceSuggestions.push('脂肪含量高，建议选择清蒸、水煮、烤制等低油烹饪方式');
  }

  if (protein >= 10) {
    dietTips.push('蛋白质含量较高，有助于维持肌肉量，提高基础代谢');
  }

  return `减肥期间${calories > 200 ? '需谨慎食用' : '可以适量食用'} ${foodName}，关键是控制总热量摄入`;
}

/**
 * 病后康复专属建议
 */
function generateRecoveryAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName, disease) {
  const protein = nutrition.protein || 0;
  const sodium = nutrition.sodium || 0;
  const fat = nutrition.fat || 0;

  dietTips.push('病后康复期饮食宜清淡、易消化、营养均衡');

  if (protein >= 10) {
    dietTips.push(`蛋白质含量较高（${protein}g/100g），有助于组织修复和免疫力恢复`);
  } else {
    dietTips.push('蛋白质含量一般，建议搭配鸡蛋、牛奶、鱼肉等优质蛋白');
  }

  if (sodium > 500) {
    dietTips.push(`钠含量较高（${sodium}mg/100g），康复期建议清淡饮食，减少钠摄入`);
    replaceSuggestions.push('可用新鲜食材自行烹饪，避免加工食品和腌制食品');
  }

  if (fat > 20) {
    dietTips.push('脂肪含量较高，消化功能较弱时应减少食用');
    replaceSuggestions.push('建议选择清蒸、炖煮等易消化的烹饪方式');
  }

  if (disease) {
    dietTips.push(`针对${disease}的具体饮食方案请遵医嘱`);
  }

  return `${foodName}病后康复期${sodium > 500 || fat > 20 ? '需谨慎食用' : '可适量食用'}，注意营养均衡促进恢复`;
}

/**
 * 宝妈/孕妇专属建议
 */
function generateMomAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName, allergens) {
  const protein = nutrition.protein || 0;
  const sodium = nutrition.sodium || 0;

  dietTips.push('孕期/哺乳期饮食需注意营养全面、食品安全');

  if (protein >= 8) {
    dietTips.push(`蛋白质含量较好（${protein}g/100g），有助于胎儿发育和乳汁分泌`);
  } else {
    dietTips.push('蛋白质含量一般，建议搭配蛋奶、豆制品等优质蛋白');
  }

  if (allergens.length > 0) {
    dietTips.push(`含过敏原（${allergens.join('、')}），孕期可少量尝试，观察有无不适`);
  }

  if (sodium > 800) {
    dietTips.push('钠含量较高，孕期高盐饮食增加水肿和妊娠高血压风险，应控制');
    replaceSuggestions.push('建议选择新鲜食材，自行烹饪控制盐量');
  }

  dietTips.push('避免生食（生鱼片、生肉、生蛋），确保食物彻底煮熟');
  dietTips.push('适量补充叶酸、铁、钙等关键营养素');

  return `${foodName}宝妈/孕妇${sodium > 800 ? '需适量少吃' : '可以食用'}，注意饮食多样化确保营养全面`;
}

/**
 * 养生爱好者专属建议
 */
function generateHealthAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName, category) {
  const sodium = nutrition.sodium || 0;
  const fat = nutrition.fat || 0;
  const fiber = nutrition.fiber || 0;

  // 简单的性味判断（基于食材分类和属性）
  const tcmMap = {
    '水果': '性偏凉，生津止渴，脾胃虚寒者不宜过量',
    '蔬菜': '性平凉，清热通便，适合大多数人',
    '肉类': '性偏温，补虚益气，内热旺盛者适量',
    '主食': '性平，健脾养胃，为气血生化之源',
    '零食': '性偏燥热，易生痰湿，养生应少食',
    '饮料': '视成分而定，含糖饮料易生湿热',
    '豆制品': '性平，补气健脾，适合长期食用'
  };

  const tcmAdvice = tcmMap[category] || '性平味甘，适量食用有益健康';
  dietTips.push(tcmAdvice);

  if (fiber >= 3) {
    dietTips.push('膳食纤维丰富，有助于肠道通畅，符合"要想长生，肠中常清"的养生理念');
  }

  if (sodium > 500) {
    dietTips.push('钠含量较高，养生宜清淡，"咸多伤肾"，建议控制盐量');
    replaceSuggestions.push('可选用天然香料（姜、蒜、葱、香菜）替代部分盐调味');
  }

  if (fat > 20) {
    dietTips.push('脂肪含量较高，过食肥甘厚味易生痰湿，适量即可');
  }

  dietTips.push('饮食有节、起居有常、不妄作劳，乃养生之道');

  return `${foodName}${sodium > 500 || fat > 20 ? '养生需适量' : '适合养生食用'}，饮食贵在均衡适度`;
}

/**
 * 选择纠结症专属建议
 */
function generateIndecisiveAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName) {
  const calories = nutrition.calories || 0;
  const protein = nutrition.protein || 0;
  const fiber = nutrition.fiber || 0;
  const sodium = nutrition.sodium || 0;

  // 计算健康分数（0-100）
  let score = 70;
  if (protein >= 15) score += 10;
  if (fiber >= 3) score += 10;
  if (calories > 400) score -= 15;
  if (sodium > 1000) score -= 15;
  if (sodium > 500) score -= 5;
  score = Math.max(0, Math.min(100, score));

  dietTips.push(`综合健康评分：${score}/100`);
  dietTips.push(`每100g热量 ${calories}kcal，蛋白质 ${protein}g，膳食纤维 ${fiber}g，钠 ${sodium}mg`);

  // 给出明确的建议倾向
  if (score >= 80) {
    replaceSuggestions.push('👍 推荐食用，营养价值较高');
    replaceSuggestions.push('可以和颜色不同的蔬菜水果搭配，营养更全面');
  } else if (score >= 60) {
    replaceSuggestions.push('⚠️ 可以吃但需适量，注意营养均衡');
    replaceSuggestions.push('想吃就吃一小份，不必过于纠结');
  } else {
    replaceSuggestions.push('👎 不太推荐，营养价值偏低');
    replaceSuggestions.push('偶尔解馋可以，不建议常吃');
    replaceSuggestions.push('替代方案：选择新鲜水果、坚果等健康零食');
  }

  dietTips.push('选择没有绝对的对错，关键在于频率和量的平衡');

  return `${foodName} 健康评分 ${score}/100，${score >= 60 ? '可以吃' : '建议少吃'}，不必过于纠结`;
}

/**
 * 通用建议
 */
function generateGeneralAdvice(foodData, nutrition, dietTips, replaceSuggestions, foodName) {
  const calories = nutrition.calories || 0;
  const protein = nutrition.protein || 0;
  const fiber = nutrition.fiber || 0;
  const sodium = nutrition.sodium || 0;

  if (protein >= 10) {
    dietTips.push('蛋白质含量较高，有助于维持身体机能');
  }
  if (fiber >= 2) {
    dietTips.push('含有一定膳食纤维，促进肠道健康');
  }
  if (sodium > 600) {
    dietTips.push('钠含量较高，注意控制每日总摄入量');
  }

  dietTips.push('均衡饮食，食物多样化，适量运动');

  return `${foodName}可以适量食用，注意饮食均衡和多样化`;
}

/**
 * 结论判定
 * 根据过敏原、禁忌、营养数据等综合判断
 * 
 * @param {string[]} allergens - 过敏原列表
 * @param {string[]} contraindications - 禁忌列表
 * @param {object} nutrition - 营养数据
 * @param {object} userProfile - 用户档案
 * @returns {string} 结论：可以吃 / 不建议吃 / 需注意
 */
function determineConclusion(allergens, contraindications, nutrition, userProfile) {
  const hasFatal = contraindications.some(c => 
    c.includes('致命') || c.includes('禁止') || c.includes('休克')
  );
  const hasSevere = contraindications.some(c => 
    c.includes('严重') || c.includes('加重') || c.includes('风险')
  );

  // 有致命禁忌
  if (hasFatal) {
    return '不建议吃';
  }

  // 有严重禁忌或多种禁忌
  if (hasSevere || contraindications.length >= 3) {
    return '需注意';
  }

  // 高风险食物 + 特殊人群
  const role = userProfile?.role || 'general';
  if (role === 'mom' && (allergens.length > 0 || nutrition?.sodium > 1000)) {
    return '需注意';
  }
  if (role === 'recovery' && nutrition?.sodium > 800) {
    return '需注意';
  }

  // 常规情况
  return '可以吃';
}

/**
 * 主函数：完整的食物分析
 * 
 * @param {string} foodName - 食物名称
 * @param {object} userProfile - 用户档案 { gender, age, role, disease? }
 * @returns {Promise<object>} 分析结果
 */
async function analyzeFood(foodName, userProfile = {}) {
  // 默认用户档案
  const profile = {
    gender: userProfile.gender || 'male',
    age: userProfile.age || 30,
    role: userProfile.role || 'general',
    disease: userProfile.disease || ''
  };

  // 步骤 1：营养解析
  const foodData = getNutritionData(foodName);

  // 兜底逻辑：数据库中没有该食物
  if (!foodData) {
    return {
      foodName: foodName,
      conclusion: '需注意',
      nutrition: {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
        sodium: null
      },
      warnings: {
        allergens: [],
        contraindications: ['数据待补充：该食物暂未收录，建议咨询专业营养师']
      },
      customAdvice: {
        summary: `${foodName}暂无详细数据，建议适量食用`,
        dietTips: ['饮食多样化，均衡营养', '如有特殊需求请咨询专业营养师'],
        replaceSuggestions: ['可选择已收录的同类食物进行对比分析']
      },
      meta: {
        status: 'pending',
        message: '数据待补充',
        matchedName: null
      }
    };
  }

  // 步骤 2：过敏原检测
  const allergens = detectAllergens(foodData);

  // 步骤 3：禁忌匹配
  const contraindications = matchContraindications(foodData, profile);

  // 步骤 4：个性化建议
  const customAdvice = generateCustomAdvice(foodData, allergens, contraindications, profile);

  // 综合判定结论
  const conclusion = determineConclusion(allergens, contraindications, foodData.nutrition, profile);

  return {
    foodName: foodData.matchName || foodName,
    conclusion: conclusion,
    nutrition: {
      calories: foodData.nutrition.calories || 0,
      protein: foodData.nutrition.protein || 0,
      carbs: foodData.nutrition.carbs || 0,
      fat: foodData.nutrition.fat || 0,
      fiber: foodData.nutrition.fiber || 0,
      sodium: foodData.nutrition.sodium || 0
    },
    warnings: {
      allergens: allergens,
      contraindications: contraindications
    },
    customAdvice: customAdvice,
    meta: {
      status: 'success',
      matchType: foodData.matchType,
      category: foodData.category,
      ingredients: foodData.ingredients || []
    }
  };
}

// 导出模块
module.exports = {
  analyzeFood,
  getNutritionData,
  detectAllergens,
  matchContraindications,
  generateCustomAdvice,
  determineConclusion,
  USER_ROLES,
  COMMON_ALLERGENS
};
