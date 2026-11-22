import type { ScenarioType } from "./presets";

export interface SamplePhotoMeta {
  id: string;
  title: string;
  tag: string;
  scenario: ScenarioType;
  recommendedPresetId: string;
  accent: string;
}

export const SAMPLE_PHOTOS: SamplePhotoMeta[] = [
  {
    id: "sample-cat-window",
    title: "午后橘猫窗台",
    tag: "宠物保真演示",
    scenario: "portrait_pet",
    recommendedPresetId: "portrait-studio-light",
    accent: "#f59e0b",
  },
  {
    id: "sample-alpine-glow",
    title: "日照金山湖畔",
    tag: "风景二创演示",
    scenario: "scenery_art",
    recommendedPresetId: "art-shinkai-anime",
    accent: "#38bdf8",
  },
  {
    id: "sample-seaside-portrait",
    title: "海边黄昏剪影",
    tag: "锁屏留白演示",
    scenario: "portrait_pet",
    recommendedPresetId: "portrait-top-breathing",
    accent: "#f472b6",
  },
];

/**
 * 在浏览器端离线绘制高质感内置演示原图，确保零外链依赖、无 CORS 问题，
 * 用户打开即可直接体验 AI 美化与三端苹果设备适配。
 */
export function generateSampleDataUrl(sampleId: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  if (sampleId === "sample-cat-window") {
    // 暖阳窗台与橘猫剪影插画风摄影模拟
    const bg = ctx.createLinearGradient(0, 0, 1600, 1200);
    bg.addColorStop(0, "#3b4d6b");
    bg.addColorStop(0.45, "#6b5f7a");
    bg.addColorStop(0.75, "#c58f65");
    bg.addColorStop(1, "#e7b98a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1600, 1200);

    // 窗外暖阳散景
    const sun = ctx.createRadialGradient(1180, 320, 40, 1180, 320, 560);
    sun.addColorStop(0, "rgba(255, 245, 214, 0.92)");
    sun.addColorStop(0.35, "rgba(255, 206, 140, 0.48)");
    sun.addColorStop(1, "rgba(255, 190, 120, 0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, 1600, 1200);

    // 柔和窗框投影
    ctx.fillStyle = "rgba(28, 30, 42, 0.25)";
    ctx.fillRect(0, 0, 130, 1200);
    ctx.fillRect(1470, 0, 130, 1200);
    ctx.fillRect(0, 880, 1600, 320);

    // 阳光光斑
    ctx.save();
    ctx.fillStyle = "rgba(255, 236, 198, 0.18)";
    ctx.beginPath();
    ctx.moveTo(920, 0);
    ctx.lineTo(1480, 0);
    ctx.lineTo(1160, 920);
    ctx.lineTo(540, 920);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 柔和飘浮光点 bokeh
    const bokehs = [
      [340, 260, 48, 0.16],
      [520, 410, 26, 0.22],
      [1120, 540, 62, 0.2],
      [1290, 280, 34, 0.25],
      [890, 210, 42, 0.18],
    ];
    for (const [x, y, r, a] of bokehs) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 243, 214, ${a})`;
      ctx.fill();
    }

    // 窗台桌面
    const sill = ctx.createLinearGradient(0, 870, 0, 1200);
    sill.addColorStop(0, "#6d4c3d");
    sill.addColorStop(0.2, "#46312a");
    sill.addColorStop(1, "#221818");
    ctx.fillStyle = sill;
    ctx.fillRect(0, 880, 1600, 320);

    // 温暖小橘猫主体 (位于中下部黄金位置)
    ctx.save();
    ctx.translate(800, 885);

    // 尾巴
    ctx.strokeStyle = "#d9823b";
    ctx.lineWidth = 34;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(105, -20);
    ctx.bezierCurveTo(220, -10, 240, -120, 170, -155);
    ctx.stroke();

    // 身体
    const fur = ctx.createRadialGradient(-20, -170, 30, 0, -140, 210);
    fur.addColorStop(0, "#f6b26b");
    fur.addColorStop(0.65, "#d87f35");
    fur.addColorStop(1, "#9b4d1d");
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, -135, 132, 165, 0, 0, Math.PI * 2);
    ctx.fill();

    // 胸口奶白毛
    ctx.fillStyle = "#fce7cf";
    ctx.beginPath();
    ctx.ellipse(0, -105, 68, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // 头部
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(0, -320, 102, 0, Math.PI * 2);
    ctx.fill();

    // 双耳
    const drawEar = (sign: number) => {
      ctx.fillStyle = "#cc6f29";
      ctx.beginPath();
      ctx.moveTo(sign * 34, -400);
      ctx.lineTo(sign * 96, -478);
      ctx.lineTo(sign * 98, -358);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#f7bfa0";
      ctx.beginPath();
      ctx.moveTo(sign * 48, -396);
      ctx.lineTo(sign * 86, -448);
      ctx.lineTo(sign * 86, -372);
      ctx.closePath();
      ctx.fill();
    };
    drawEar(-1);
    drawEar(1);

    // 琥珀大眼睛
    for (const sign of [-1, 1]) {
      ctx.fillStyle = "#261710";
      ctx.beginPath();
      ctx.ellipse(sign * 36, -324, 15, 19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sign * 36 + 5, -331, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 小鼻子 & 微笑
    ctx.fillStyle = "#e87a82";
    ctx.beginPath();
    ctx.moveTo(-10, -296);
    ctx.lineTo(10, -296);
    ctx.lineTo(0, -284);
    ctx.closePath();
    ctx.fill();

    // 逆光金边轮廓
    ctx.strokeStyle = "rgba(255, 232, 180, 0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -320, 102, -Math.PI * 0.45, Math.PI * 0.15);
    ctx.stroke();

    ctx.restore();

    // 前景绿植剪影点缀
    ctx.fillStyle = "rgba(24, 48, 36, 0.55)";
    ctx.beginPath();
    ctx.ellipse(190, 860, 110, 32, -0.45, 0, Math.PI * 2);
    ctx.ellipse(270, 820, 95, 26, -0.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (sampleId === "sample-alpine-glow") {
    // 日照金山与星空湖泊
    const sky = ctx.createLinearGradient(0, 0, 0, 760);
    sky.addColorStop(0, "#0b1533");
    sky.addColorStop(0.38, "#1e3a6d");
    sky.addColorStop(0.72, "#7c4b75");
    sky.addColorStop(1, "#f29d63");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1600, 1200);

    // 细腻星点
    for (let i = 0; i < 85; i++) {
      const x = ((i * 197) % 1560) + 20;
      const y = ((i * 89) % 420) + 20;
      const r = i % 7 === 0 ? 2.4 : 1.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + (i % 5) * 0.13})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 晚霞流云
    const drawCloud = (cx: number, cy: number, rx: number, ry: number, color: string) => {
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "rgba(255, 200, 160, 0)");
      ctx.fillStyle = grad;
      ctx.save();
      ctx.scale(1, ry / rx);
      ctx.beginPath();
      ctx.arc(cx, cy * (rx / ry), rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawCloud(420, 420, 340, 58, "rgba(255, 196, 152, 0.32)");
    drawCloud(1180, 360, 400, 66, "rgba(255, 178, 138, 0.28)");

    // 远山
    ctx.fillStyle = "#2b375c";
    ctx.beginPath();
    ctx.moveTo(0, 740);
    ctx.lineTo(260, 560);
    ctx.lineTo(540, 650);
    ctx.lineTo(860, 450);
    ctx.lineTo(1220, 620);
    ctx.lineTo(1480, 510);
    ctx.lineTo(1600, 590);
    ctx.lineTo(1600, 820);
    ctx.lineTo(0, 820);
    ctx.closePath();
    ctx.fill();

    // 主峰（日照金山金红亮面 + 蓝紫暗面）
    ctx.beginPath();
    ctx.moveTo(300, 810);
    ctx.lineTo(800, 390);
    ctx.lineTo(1310, 810);
    ctx.closePath();
    const darkSlope = ctx.createLinearGradient(300, 390, 900, 810);
    darkSlope.addColorStop(0, "#3b4875");
    darkSlope.addColorStop(1, "#18223d");
    ctx.fillStyle = darkSlope;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(800, 390);
    ctx.lineTo(855, 560);
    ctx.lineTo(945, 620);
    ctx.lineTo(1060, 760);
    ctx.lineTo(1310, 810);
    ctx.closePath();
    const goldSlope = ctx.createLinearGradient(800, 390, 1220, 810);
    goldSlope.addColorStop(0, "#ffd49c");
    goldSlope.addColorStop(0.45, "#f08358");
    goldSlope.addColorStop(1, "#6f3c5c");
    ctx.fillStyle = goldSlope;
    ctx.fill();

    // 镜面湖泊倒影
    const lake = ctx.createLinearGradient(0, 800, 0, 1200);
    lake.addColorStop(0, "#242c4c");
    lake.addColorStop(0.45, "#423a63");
    lake.addColorStop(1, "#141c33");
    ctx.fillStyle = lake;
    ctx.fillRect(0, 800, 1600, 400);

    // 湖面金色倒影微光
    const refl = ctx.createLinearGradient(800, 800, 1080, 1180);
    refl.addColorStop(0, "rgba(246, 160, 104, 0.45)");
    refl.addColorStop(1, "rgba(246, 160, 104, 0)");
    ctx.fillStyle = refl;
    ctx.beginPath();
    ctx.moveTo(640, 800);
    ctx.lineTo(1180, 800);
    ctx.lineTo(940, 1140);
    ctx.closePath();
    ctx.fill();

    // 水波纹理
    ctx.strokeStyle = "rgba(255, 224, 192, 0.14)";
    ctx.lineWidth = 2;
    for (let y = 825; y < 1180; y += 22) {
      ctx.beginPath();
      ctx.moveTo(520 + (y % 40), y);
      ctx.lineTo(1140 - (y % 55), y);
      ctx.stroke();
    }
  } else {
    // 海边黄昏剪影（演示锁屏留白与人像氛围）
    const sky = ctx.createLinearGradient(0, 0, 0, 820);
    sky.addColorStop(0, "#1d2b53");
    sky.addColorStop(0.32, "#4e4376");
    sky.addColorStop(0.68, "#d96b7c");
    sky.addColorStop(1, "#ffbe7b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1600, 1200);

    // 柔和落日
    const sunGlow = ctx.createRadialGradient(800, 740, 20, 800, 740, 420);
    sunGlow.addColorStop(0, "rgba(255, 246, 214, 0.96)");
    sunGlow.addColorStop(0.25, "rgba(255, 186, 122, 0.65)");
    sunGlow.addColorStop(1, "rgba(255, 130, 120, 0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, 1600, 1200);

    ctx.fillStyle = "#fff5d6";
    ctx.beginPath();
    ctx.arc(800, 750, 84, 0, Math.PI * 2);
    ctx.fill();

    // 海平面
    const sea = ctx.createLinearGradient(0, 770, 0, 1200);
    sea.addColorStop(0, "#4f3a65");
    sea.addColorStop(0.5, "#2b2448");
    sea.addColorStop(1, "#121327");
    ctx.fillStyle = sea;
    ctx.fillRect(0, 770, 1600, 430);

    // 粼粼金色海面反光
    for (let i = 0; i < 24; i++) {
      const y = 785 + i * 16;
      const w = 240 - i * 6;
      ctx.fillStyle = `rgba(255, 216, 152, ${0.42 - i * 0.014})`;
      ctx.fillRect(800 - w / 2 + Math.sin(i) * 14, y, w, 5);
    }

    // 沙滩前景与人物背影剪影
    ctx.fillStyle = "#161529";
    ctx.beginPath();
    ctx.moveTo(0, 1020);
    ctx.quadraticCurveTo(800, 940, 1600, 1050);
    ctx.lineTo(1600, 1200);
    ctx.lineTo(0, 1200);
    ctx.closePath();
    ctx.fill();

    // 人物剪影 (黄金偏右位置，适合景深和时钟留白)
    ctx.save();
    ctx.translate(800, 980);
    ctx.fillStyle = "#121022";
    // 头部
    ctx.beginPath();
    ctx.arc(0, -255, 36, 0, Math.PI * 2);
    ctx.fill();
    // 飘逸发丝
    ctx.beginPath();
    ctx.ellipse(-22, -242, 34, 42, 0.35, 0, Math.PI * 2);
    ctx.fill();
    // 身形与风衣裙摆
    ctx.beginPath();
    ctx.moveTo(-26, -214);
    ctx.quadraticCurveTo(-55, -120, -82, 30);
    ctx.lineTo(74, 30);
    ctx.quadraticCurveTo(52, -120, 26, -214);
    ctx.closePath();
    ctx.fill();
    // 暖金轮廓高光
    ctx.strokeStyle = "rgba(255, 210, 155, 0.65)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -255, 36, -Math.PI * 0.6, Math.PI * 0.35);
    ctx.stroke();
    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}
