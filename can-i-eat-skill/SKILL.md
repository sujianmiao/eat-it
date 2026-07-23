# 可以吃吗？ - 饮食健康分析 Skill

> 输入食物名称 + 用户身份信息 → 输出完整的饮食健康分析结果

## 技能名称与一句话描述

**技能名称**：can-i-eat-skill（饮食健康分析）

**一句话描述**：基于本地营养数据库和禁忌知识库，快速分析任意食物的营养价值、过敏原、饮食禁忌，并针对不同用户身份生成个性化饮食建议。

---

## 核心功能清单

### 1. 营养解析
- 从本地营养数据库查询食物的热量、蛋白质、碳水化合物、脂肪、膳食纤维、钠等 6 项核心营养指标
- 支持精确匹配和模糊匹配两种查询方式
- 数据库覆盖 100+ 种常见食物（主食、肉类、蔬菜、水果、零食、饮料、中餐等）
- 每100g可食部计量，数据来源参考《中国食物成分表》

### 2. 过敏原标注
- 自动识别 8 大类常见过敏原：小麦、花生、坚果、鸡蛋、海鲜、牛奶、大豆、芝麻
- 从食物配料表中智能检测过敏原成分
- 支持多种表述方式的别名映射（如"面粉"→"小麦"、"芝士"→"牛奶"等）

### 3. 禁忌匹配
- 内置 30+ 条高频禁忌知识库，覆盖：
  - **药物禁忌**（7条）：头孢+酒精、降压药+高钠、他汀+西柚等
  - **食物相克**（5条）：菠菜+豆腐、海鲜+酒、柿子+螃蟹等
  - **疾病禁忌**（8条）：糖尿病+高糖、高血压+高盐、痛风+高嘌呤等
  - **特殊人群**（4条）：孕妇、婴幼儿、哺乳期等
  - **过敏禁忌**（2条）：花生过敏、乳糖不耐受等
  - **年龄相关禁忌**：未成年人禁酒、老年人低盐低糖等
- 根据用户疾病史、年龄、身份等进行精准匹配

### 4. 个性化建议
- 支持 7 种用户身份，每种身份有独立的分析策略：

  | 身份 | 分析侧重点 |
  |------|-----------|
  | 健身达人 | 蛋白质含量、肌肉合成、运动恢复、热量换算 |
  | 减肥人士 | 热量控制、膳食纤维、饱腹感、替代方案 |
  | 病后康复 | 免疫力、易消化、营养密度、饮食禁忌 |
  | 宝妈/孕妇 | 胎儿发育、营养全面性、食品安全、过敏原 |
  | 养生爱好者 | 性味平衡、药食同源、养生调理、搭配建议 |
  | 选择纠结症 | 健康评分、对比分析、明确决策建议 |
  | 通用 | 均衡饮食、营养合理、普适性建议 |

- 输出包含：一句话总结、饮食建议列表、替代方案列表

---

## 输入/输出格式说明

### 输入参数

```javascript
analyzeFood(foodName, userProfile)
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `foodName` | string | 是 | 食物名称（中文） |
| `userProfile` | object | 否 | 用户档案 |
| `userProfile.gender` | string | 否 | 性别：`male` / `female`，默认 `male` |
| `userProfile.age` | number | 否 | 年龄，默认 `30` |
| `userProfile.role` | string | 否 | 身份：`general` / `fitness` / `weightLoss` / `recovery` / `mom` / `health` / `indecisive`，默认 `general` |
| `userProfile.disease` | string | 否 | 疾病史（如"糖尿病"、"高血压"），默认空 |

### 输出格式

```json
{
  "foodName": "辣条",
  "conclusion": "需注意",
  "nutrition": {
    "calories": 520,
    "protein": 8,
    "carbs": 55,
    "fat": 28,
    "fiber": 2,
    "sodium": 2500
  },
  "warnings": {
    "allergens": ["小麦", "大豆"],
    "contraindications": [
      "高血压患者血压升高，增加心脑血管事件风险",
      "胃病患者刺激胃黏膜，加重炎症和疼痛",
      "肾病患者加重肾脏负担，加速肾功能恶化"
    ]
  },
  "customAdvice": {
    "summary": "辣条养生需适量，饮食贵在均衡适度",
    "dietTips": [
      "性偏燥热，易生痰湿，养生应少食",
      "钠含量较高，养生宜清淡，建议控制盐量",
      "脂肪含量较高，过食肥甘厚味易生痰湿，适量即可"
    ],
    "replaceSuggestions": [
      "可选用天然香料（姜、蒜、葱、香菜）替代部分盐调味"
    ]
  },
  "meta": {
    "status": "success",
    "matchType": "exact",
    "category": "零食",
    "ingredients": ["小麦粉", "食用油", "辣椒", "香料", "食品添加剂"]
  }
}
```

### 输出字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `foodName` | string | 匹配到的食物名称 |
| `conclusion` | string | 结论：`可以吃` / `不建议吃` / `需注意` |
| `nutrition.calories` | number | 每100g热量（kcal） |
| `nutrition.protein` | number | 每100g蛋白质（g） |
| `nutrition.carbs` | number | 每100g碳水化合物（g） |
| `nutrition.fat` | number | 每100g脂肪（g） |
| `nutrition.fiber` | number | 每100g膳食纤维（g） |
| `nutrition.sodium` | number | 每100g钠（mg） |
| `warnings.allergens` | string[] | 过敏原列表 |
| `warnings.contraindications` | string[] | 禁忌/注意事项列表 |
| `customAdvice.summary` | string | 一句话总结建议 |
| `customAdvice.dietTips` | string[] | 饮食建议列表 |
| `customAdvice.replaceSuggestions` | string[] | 替代方案列表 |
| `meta.status` | string | 状态：`success` / `pending` |
| `meta.matchType` | string | 匹配方式：`exact`（精确）/ `fuzzy`（模糊） |
| `meta.category` | string | 食物分类 |
| `meta.ingredients` | string[] | 配料列表 |

### 兜底逻辑

当数据库中没有找到该食物时，返回 `meta.status: "pending"`，结论为"需注意"，并提示数据待补充。

---

## 使用示例

### Node.js 环境

```javascript
const { analyzeFood } = require('can-i-eat-skill/core/analyzer');

// 基本用法
async function basicUsage() {
  const result = await analyzeFood('红烧肉');
  console.log(JSON.stringify(result, null, 2));
}

// 带用户身份
async function withProfile() {
  const result = await analyzeFood('辣条', {
    gender: 'female',
    age: 28,
    role: 'weightLoss',
    disease: ''
  });
  console.log('结论:', result.conclusion);
  console.log('热量:', result.nutrition.calories, 'kcal/100g');
  console.log('建议:', result.customAdvice.summary);
}

// 健身达人分析
async function fitnessAnalysis() {
  const result = await analyzeFood('鸡胸肉', {
    gender: 'male',
    age: 25,
    role: 'fitness'
  });
  console.log('蛋白质:', result.nutrition.protein, 'g/100g');
  console.log('建议:', result.customAdvice.dietTips);
}

basicUsage();
```

### 浏览器环境

直接打开 `examples/demo.html` 即可体验可视化的分析界面。

> 注意：浏览器环境需要通过 HTTP 服务器访问（如 Live Server），才能正常加载 JSON 数据库文件。

---

## 数据来源说明

### 营养数据
- 主要参考《中国食物成分表（标准版第6版）》
- 部分加工食品数据参考国家食品安全风险评估中心数据库
- 混合菜品按常见食谱配方推算
- 数据为每100克可食部含量，仅供参考

### 禁忌数据
- 药物相互作用参考《临床药物治疗学》
- 食物相克参考《中国居民膳食指南》及营养学研究
- 疾病禁忌参考各疾病临床营养治疗指南
- 特殊人群参考孕产期/婴幼儿膳食指南

> **免责声明**：本技能提供的信息仅供参考，不能替代专业医疗建议。如有具体健康问题，请咨询医生或注册营养师。

---

## 文件结构

```
can-i-eat-skill/
├── SKILL.md                 # 本说明文件
├── package.json             # 模块配置
├── core/
│   └── analyzer.js          # 核心分析逻辑（主入口）
├── data/
│   ├── nutrition.db.json    # 营养数据库（100+ 食物）
│   └── warnings.db.json     # 禁忌知识库（30+ 条）
└── examples/
    └── demo.html            # 可视化演示页面
```

---

## 版本信息

| 项目 | 内容 |
|------|------|
| **版本号** | v1.0.0 |
| **发布日期** | 2026-07-23 |
| **适用平台** | Node.js ≥ 14 / 现代浏览器 |
| **依赖** | 零外部依赖 |
| **数据更新** | 静态 JSON 数据库，可手动扩展 |
| **许可协议** | MIT |

---

## 扩展指南

### 新增食物数据

在 `data/nutrition.db.json` 中添加：

```json
"新食物名": {
  "category": "分类",
  "nutrition": {
    "calories": 100,
    "protein": 5.0,
    "carbs": 10.0,
    "fat": 3.0,
    "fiber": 2.0,
    "sodium": 100
  },
  "allergens": ["过敏原1"],
  "ingredients": ["配料1", "配料2"]
}
```

### 新增禁忌条目

在 `data/warnings.db.json` 数组中添加：

```json
{
  "id": "w031",
  "type": "disease",
  "item": "疾病名",
  "conflict": "冲突食物/成分",
  "effect": "具体影响描述",
  "level": "致命/严重/中等/轻微/注意"
}
```

### 新增用户身份

在 `core/analyzer.js` 的 `USER_ROLES` 对象中添加配置，并在 `generateCustomAdvice` 的 switch 中实现对应的建议生成逻辑。
