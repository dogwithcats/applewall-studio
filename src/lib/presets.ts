export type ScenarioType = "portrait_pet" | "scenery_art";

export interface LocalRecipe {
  brightness: number; // 1 = normal
  contrast: number; // 1 = normal
  saturate: number; // 1 = normal
  sepia?: number;
  hueRotate?: number;
  overlayGradient?: {
    from: string;
    to: string;
    blendMode: GlobalCompositeOperation;
    opacity: number;
  };
  bloom?: number; // 0~1 soft dreamy glow
  vignette?: number; // 0~1 edge darkening
  grain?: number; // 0~1 film grain
  edgeBokeh?: number; // 0~1 radial soft blur around edges
  recommendedTopBreathing?: number; // 0~0.35
}

export interface StylePreset {
  id: string;
  name: string;
  subtitle: string;
  scenario: ScenarioType;
  badge?: string;
  swatch: [string, string];
  defaultStrength: number; // 0.2~0.45 保真; 0.55~0.85 艺术二创
  promptTemplate: string;
  negativePrompt: string;
  localRecipe: LocalRecipe;
}

export const STYLE_PRESETS: StylePreset[] = [
  // === 场景 1：真人 / 宠物保真美化 ===
  {
    id: "portrait-studio-light",
    name: "影棚通透光影",
    subtitle: "严格保留五官与毛发，重塑 Apple ProRAW 级立体自然光感",
    scenario: "portrait_pet",
    badge: "保真推荐",
    swatch: ["#f59e0b", "#3b82f6"],
    defaultStrength: 0.28,
    promptTemplate:
      "保持原图人物五官或宠物形态100%一致，不改变面部特征与表情；优化自然柔和的影棚主光与轮廓光，提升画质清晰度、通透感与皮肤/毛发细腻质感，清理杂乱背景元素，高端苹果壁纸美学，超清 8K 摄影。",
    negativePrompt: "换脸, 五官变形, 过度磨皮, 塑料感, 畸形手指, 模糊, 水印, 文字",
    localRecipe: {
      brightness: 1.05,
      contrast: 1.09,
      saturate: 1.12,
      overlayGradient: {
        from: "rgba(255, 224, 178, 0.24)",
        to: "rgba(56, 108, 226, 0.18)",
        blendMode: "soft-light",
        opacity: 0.75,
      },
      bloom: 0.18,
      vignette: 0.22,
      grain: 0.04,
      recommendedTopBreathing: 0.16,
    },
  },
  {
    id: "portrait-fuji-film",
    name: "富士清透胶片",
    subtitle: "Classic Chrome 经典清冷胶片感，温柔治愈高级耐看",
    scenario: "portrait_pet",
    badge: "小红书热门",
    swatch: ["#14b8a6", "#f4b982"],
    defaultStrength: 0.32,
    promptTemplate:
      "严格保持主体人物/宠物外形一致，转为富士 Classic Chrome 胶片摄影色调，微暖高光与柔和青绿暗部，自然细腻胶片颗粒，空气感与呼吸感极强，适合作为 iPhone 每日锁屏壁纸。",
    negativePrompt: "五官失真, 过度饱和, 廉价滤镜, 模糊噪点, 水印",
    localRecipe: {
      brightness: 1.04,
      contrast: 1.04,
      saturate: 0.94,
      sepia: 0.1,
      overlayGradient: {
        from: "rgba(255, 232, 198, 0.28)",
        to: "rgba(18, 92, 98, 0.25)",
        blendMode: "soft-light",
        opacity: 0.85,
      },
      bloom: 0.14,
      vignette: 0.26,
      grain: 0.14,
      recommendedTopBreathing: 0.18,
    },
  },
  {
    id: "portrait-top-breathing",
    name: "锁屏留白扩图",
    subtitle: "主体自动下移，顶部智能延展纯净背景，彻底避开时钟与灵动岛",
    scenario: "portrait_pet",
    badge: "锁屏刚需",
    swatch: ["#60a5fa", "#cbd5e1"],
    defaultStrength: 0.3,
    promptTemplate:
      "保持原图主体完整一致，将画面顶部向上无缝智能扩图延展干净的渐变天空或柔和纯色氛围背景，为 iPhone 锁屏时钟留出顶部 30% 极简留白空间，整体清爽干净，构图适合触发 iOS 景深效果。",
    negativePrompt: "顶部杂乱, 主体裁切, 变形, 拼接痕, 水印",
    localRecipe: {
      brightness: 1.03,
      contrast: 1.06,
      saturate: 1.06,
      overlayGradient: {
        from: "rgba(147, 197, 253, 0.2)",
        to: "rgba(15, 23, 42, 0.12)",
        blendMode: "soft-light",
        opacity: 0.7,
      },
      bloom: 0.12,
      vignette: 0.14,
      grain: 0.03,
      recommendedTopBreathing: 0.28,
    },
  },
  {
    id: "portrait-soft-bokeh",
    name: "微距浅景深虚化",
    subtitle: "奶油般柔焦边缘散景，突出萌宠与人像主体，景深层次拉满",
    scenario: "portrait_pet",
    badge: "景深友好",
    swatch: ["#ec4899", "#8b5cf6"],
    defaultStrength: 0.35,
    promptTemplate:
      "保持前景人物或宠物完全清晰且忠实于原图，使用 85mm f/1.2 电影镜头风格柔和虚化背景，产生细腻奶油散景光斑，主体边缘干净锐利，非常适合苹果锁屏景深壁纸。",
    negativePrompt: "主体模糊, 抠图白边, 五官改变, 畸变, 水印",
    localRecipe: {
      brightness: 1.04,
      contrast: 1.11,
      saturate: 1.1,
      overlayGradient: {
        from: "rgba(244, 114, 182, 0.14)",
        to: "rgba(79, 70, 229, 0.22)",
        blendMode: "soft-light",
        opacity: 0.8,
      },
      bloom: 0.24,
      vignette: 0.3,
      edgeBokeh: 0.55,
      grain: 0.05,
      recommendedTopBreathing: 0.15,
    },
  },

  // === 场景 2：风景 / 艺术壁纸二次创作 ===
  {
    id: "art-shinkai-anime",
    name: "新海诚治愈动漫",
    subtitle: "清澈积云、丁达尔光线与靛蓝高光，随手拍变身剧场版动画",
    scenario: "scenery_art",
    badge: "人气 TOP1",
    swatch: ["#0ea5e9", "#f97316"],
    defaultStrength: 0.68,
    promptTemplate:
      "保留原图核心构图与景物布局，二次创作为新海诚动画电影风格高清壁纸，通透层叠的夏日积云、绚丽丁达尔光芒、高动态蓝青天空与温暖晚霞反光，画面纯净极致治愈，4K 视网膜级细节。",
    negativePrompt: "写实脏乱, 灰暗模糊, 杂乱文字, 低分辨率, 水印",
    localRecipe: {
      brightness: 1.08,
      contrast: 1.16,
      saturate: 1.38,
      hueRotate: -4,
      overlayGradient: {
        from: "rgba(14, 165, 233, 0.34)",
        to: "rgba(251, 146, 60, 0.34)",
        blendMode: "overlay",
        opacity: 0.72,
      },
      bloom: 0.38,
      vignette: 0.18,
      grain: 0.03,
      recommendedTopBreathing: 0.12,
    },
  },
  {
    id: "art-apple-minimal",
    name: "Apple 极简流体",
    subtitle: "提炼原图色彩与线条，重塑为苹果发布会级丝绒光影抽象壁纸",
    scenario: "scenery_art",
    badge: "果味十足",
    swatch: ["#6366f1", "#22d3ee"],
    defaultStrength: 0.74,
    promptTemplate:
      "提取原图的色彩基因与空间韵律，二次创作为 Apple 官方发布会风格极简抽象壁纸，丝滑磨砂玻璃与流动光影曲面，柔和高级渐变，无杂乱细节，完美适配 iPhone/iPad/Mac 桌面图标。",
    negativePrompt: "写实杂物, 噪点, 廉价荧光, 锯齿, 文字水印",
    localRecipe: {
      brightness: 1.02,
      contrast: 1.18,
      saturate: 1.28,
      overlayGradient: {
        from: "rgba(99, 102, 241, 0.38)",
        to: "rgba(34, 211, 238, 0.28)",
        blendMode: "hard-light",
        opacity: 0.52,
      },
      bloom: 0.45,
      edgeBokeh: 0.35,
      vignette: 0.24,
      grain: 0.02,
      recommendedTopBreathing: 0.1,
    },
  },
  {
    id: "art-oled-midnight",
    name: "OLED 深邃星夜",
    subtitle: "极致深黑与璀璨微光高光，夜间解锁柔和护眼且省电",
    scenario: "scenery_art",
    badge: "OLED 省电",
    swatch: ["#1e1b4b", "#38bdf8"],
    defaultStrength: 0.62,
    promptTemplate:
      "保留原图轮廓构图，转化为深邃静谧的暗黑 OLED 夜景艺术壁纸，压低暗部至纯粹深黑，强化月光、星芒或霓虹边缘轮廓光，极简高级克制，护眼省电。",
    negativePrompt: "过曝发灰, 惨白背景, 杂乱元素, 糊成一片, 水印",
    localRecipe: {
      brightness: 0.76,
      contrast: 1.32,
      saturate: 1.18,
      overlayGradient: {
        from: "rgba(15, 23, 42, 0.58)",
        to: "rgba(56, 189, 248, 0.24)",
        blendMode: "multiply",
        opacity: 0.85,
      },
      bloom: 0.26,
      vignette: 0.56,
      grain: 0.06,
      recommendedTopBreathing: 0.15,
    },
  },
  {
    id: "art-golden-cinema",
    name: "日落暖金电影",
    subtitle: "黄金时刻暖橙与青蓝阴影分离，宛如宽银幕电影剧照",
    scenario: "scenery_art",
    badge: "Mac 绝配",
    swatch: ["#ea580c", "#0f766e"],
    defaultStrength: 0.58,
    promptTemplate:
      "保留原图风景结构，重塑为黄金时刻日落电影质感壁纸，经典青橙电影调色（Teal & Orange），温暖逆光耶稣光与细腻胶片颗粒，恢弘大气，特别适合 Mac 16:10 宽屏。",
    negativePrompt: "死黑, 过饱和失真, 畸形建筑, 水印文字",
    localRecipe: {
      brightness: 1.02,
      contrast: 1.16,
      saturate: 1.2,
      sepia: 0.16,
      overlayGradient: {
        from: "rgba(251, 146, 60, 0.36)",
        to: "rgba(15, 118, 110, 0.34)",
        blendMode: "soft-light",
        opacity: 0.92,
      },
      bloom: 0.3,
      vignette: 0.36,
      grain: 0.12,
      recommendedTopBreathing: 0.12,
    },
  },
  {
    id: "art-watercolor-pastel",
    name: "温柔水彩插画",
    subtitle: "低饱和奶油莫兰迪色调与柔美纸纹，桌面清爽治愈",
    scenario: "scenery_art",
    badge: "iPad 推荐",
    swatch: ["#f9a8d4", "#93c5fd"],
    defaultStrength: 0.7,
    promptTemplate:
      "将原图二次创作为温柔清新的现代水彩插画壁纸，柔和莫兰迪奶油配色，细腻水彩晕染边缘与轻盈留白，画面干净治愈，极适合作为 iPad 与 iPhone 清爽桌面。",
    negativePrompt: "暗沉脏乱, 尖锐生硬线条, 恐怖写实, 水印",
    localRecipe: {
      brightness: 1.1,
      contrast: 0.95,
      saturate: 1.05,
      sepia: 0.08,
      overlayGradient: {
        from: "rgba(249, 168, 212, 0.28)",
        to: "rgba(147, 197, 253, 0.28)",
        blendMode: "screen",
        opacity: 0.45,
      },
      bloom: 0.34,
      edgeBokeh: 0.2,
      vignette: 0.1,
      grain: 0.09,
      recommendedTopBreathing: 0.2,
    },
  },
];

export function getPresetById(id: string): StylePreset {
  return STYLE_PRESETS.find((p) => p.id === id) ?? STYLE_PRESETS[0];
}
