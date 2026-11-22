import type { AppleDeviceSpec } from "./devices";
import { getEffectiveDimensions } from "./devices";
import type { LocalRecipe, StylePreset } from "./presets";

export interface WallpaperRenderOptions {
  preset: StylePreset;
  strength: number; // 0 ~ 1
  zoom: number; // 1 ~ 2.2
  offsetX: number; // -50 ~ 50 (%)
  offsetY: number; // -50 ~ 50 (%)
  topBreathingRoom: number; // 0 ~ 0.35 (智能顶部留白扩图比例)
  clockScrim: number; // 0 ~ 0.6 (锁屏时钟可读性顶部柔暗)
  homeScreenBlur?: boolean; // 主屏配对柔焦模式
  bypassStyle?: boolean; // 用于原图对比
  ipadLandscape?: boolean;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 采样图片顶部区域主色调，用于无缝顶部智能延展（Smart Outpaint Fill）
 */
function sampleTopColors(img: HTMLImageElement): [string, string] {
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = 24;
  sampleCanvas.height = 12;
  const sctx = sampleCanvas.getContext("2d");
  if (!sctx) return ["#1e293b", "#0f172a"];

  sctx.drawImage(img, 0, 0, img.naturalWidth, Math.max(1, img.naturalHeight * 0.14), 0, 0, 24, 12);
  const data = sctx.getImageData(0, 0, 24, 12).data;

  let r1 = 0, g1 = 0, b1 = 0, c1 = 0;
  let r2 = 0, g2 = 0, b2 = 0, c2 = 0;
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 24; x++) {
      const idx = (y * 24 + x) * 4;
      if (y < 6) {
        r1 += data[idx];
        g1 += data[idx + 1];
        b1 += data[idx + 2];
        c1++;
      } else {
        r2 += data[idx];
        g2 += data[idx + 1];
        b2 += data[idx + 2];
        c2++;
      }
    }
  }
  const topHex = `rgb(${Math.round(r1 / c1)}, ${Math.round(g1 / c1)}, ${Math.round(b1 / c1)})`;
  const midHex = `rgb(${Math.round(r2 / c2)}, ${Math.round(g2 / c2)}, ${Math.round(b2 / c2)})`;
  return [topHex, midHex];
}

/**
 * 提取画面 4 个代表色，用于晒图海报色卡
 */
export function extractPalette(img: HTMLImageElement): string[] {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext("2d");
  if (!ctx) return ["#0f172a", "#3b82f6", "#f59e0b", "#e2e8f0"];
  ctx.drawImage(img, 0, 0, 16, 16);
  const coords = [
    [3, 3],
    [12, 4],
    [8, 9],
    [11, 13],
  ];
  return coords.map(([x, y]) => {
    const p = ctx.getImageData(x, y, 1, 1).data;
    return `#${[p[0], p[1], p[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  });
}

function buildFilterString(recipe: LocalRecipe, intensity: number): string {
  const brightness = lerp(1, recipe.brightness, intensity);
  const contrast = lerp(1, recipe.contrast, intensity);
  const saturate = lerp(1, recipe.saturate, intensity);
  const sepia = lerp(0, recipe.sepia ?? 0, intensity);
  const hue = lerp(0, recipe.hueRotate ?? 0, intensity);
  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturate.toFixed(3)}) sepia(${sepia.toFixed(3)}) hue-rotate(${hue.toFixed(1)}deg)`;
}

/**
 * 核心渲染管线：把源图按指定 Apple 设备比例、安全区延展与美学风格渲染到目标 Canvas
 */
export function renderWallpaperToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  options: WallpaperRenderOptions
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const breathingPx = Math.round(h * Math.max(0, Math.min(0.38, options.topBreathingRoom)));
  const activeHeight = h - breathingPx;
  const targetRatio = w / activeHeight;

  let drawW: number;
  let drawH: number;
  if (imgRatio > targetRatio) {
    drawH = activeHeight * options.zoom;
    drawW = drawH * imgRatio;
  } else {
    drawW = w * options.zoom;
    drawH = drawW / imgRatio;
  }

  const maxPanX = Math.max(0, (drawW - w) / 2);
  const maxPanY = Math.max(0, (drawH - activeHeight) / 2);
  const dx = (w - drawW) / 2 + (options.offsetX / 50) * maxPanX;
  const dy = breathingPx + (activeHeight - drawH) / 2 + (options.offsetY / 50) * maxPanY;

  const intensity = options.bypassStyle ? 0 : Math.max(0.15, Math.min(1, options.strength * 1.35));
  const recipe = options.preset.localRecipe;

  // 1. 顶部智能延展底色 + 柔化镜像扩边（彻底避免生硬黑边或断层）
  if (breathingPx > 0 || dy > 0) {
    const [topColor, midColor] = sampleTopColors(img);
    const extGrad = ctx.createLinearGradient(0, 0, 0, Math.max(breathingPx * 1.4, h * 0.45));
    extGrad.addColorStop(0, topColor);
    extGrad.addColorStop(1, midColor);
    ctx.fillStyle = extGrad;
    ctx.fillRect(0, 0, w, h);

    // 柔和模糊拉升顶部纹理融入渐变
    ctx.save();
    ctx.filter = `${buildFilterString(recipe, intensity)} blur(${Math.max(18, Math.round(w * 0.045))}px)`;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(
      img,
      0,
      0,
      img.naturalWidth,
      Math.max(2, img.naturalHeight * 0.25),
      -w * 0.1,
      -h * 0.05,
      w * 1.2,
      Math.max(breathingPx + h * 0.22, h * 0.35)
    );
    ctx.restore();
  }

  // 2. 主画面绘制（含基础色彩滤镜）
  ctx.save();
  if (options.homeScreenBlur) {
    const blurPx = Math.max(16, Math.round(w * 0.028));
    ctx.filter = `${buildFilterString(recipe, intensity)} blur(${blurPx}px)`;
  } else {
    ctx.filter = buildFilterString(recipe, intensity);
  }
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();

  // 3. 若开启顶部智能留白，绘制平滑过渡羽化带让延展与原图自然衔接
  if (breathingPx > 0) {
    const [topColor, midColor] = sampleTopColors(img);
    const blendH = Math.round(h * 0.2);
    const feather = ctx.createLinearGradient(0, Math.max(0, breathingPx - blendH * 0.2), 0, breathingPx + blendH);
    feather.addColorStop(0, topColor);
    feather.addColorStop(0.45, midColor.replace("rgb(", "rgba(").replace(")", ", 0.72)"));
    feather.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = feather;
    ctx.fillRect(0, 0, w, breathingPx + blendH);
  }

  // 4. 美学光影叠加 / 柔光 Bloom / 浅景深边缘虚化 / 暗角 / 胶片颗粒
  if (!options.bypassStyle) {
    if (recipe.overlayGradient) {
      ctx.save();
      ctx.globalCompositeOperation = recipe.overlayGradient.blendMode;
      ctx.globalAlpha = recipe.overlayGradient.opacity * intensity;
      const og = ctx.createLinearGradient(0, 0, w, h);
      og.addColorStop(0, recipe.overlayGradient.from);
      og.addColorStop(1, recipe.overlayGradient.to);
      ctx.fillStyle = og;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (recipe.bloom && recipe.bloom > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = recipe.bloom * intensity * 0.45;
      ctx.filter = `blur(${Math.max(10, Math.round(w * 0.022))}px) brightness(1.15)`;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();
    }

    if (recipe.edgeBokeh && recipe.edgeBokeh > 0 && !options.homeScreenBlur) {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");
      if (octx) {
        octx.filter = `${buildFilterString(recipe, intensity)} blur(${Math.max(10, Math.round(w * 0.018))}px)`;
        octx.drawImage(img, dx, dy, drawW, drawH);
        octx.globalCompositeOperation = "destination-out";
        const mask = octx.createRadialGradient(w * 0.5, h * 0.58, w * 0.14, w * 0.5, h * 0.58, Math.max(w, h) * 0.56);
        mask.addColorStop(0, "rgba(0,0,0,1)");
        mask.addColorStop(0.6, "rgba(0,0,0,0.6)");
        mask.addColorStop(1, "rgba(0,0,0,0)");
        octx.fillStyle = mask;
        octx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.globalAlpha = recipe.edgeBokeh * intensity;
        ctx.drawImage(off, 0, 0);
        ctx.restore();
      }
    }

    if (recipe.vignette && recipe.vignette > 0) {
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(0,0,0,${(recipe.vignette * intensity).toFixed(3)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }

    if (recipe.grain && recipe.grain > 0 && w <= 2200) {
      // 细腻胶片颗粒（大图导出按步长轻量绘制确保流畅）
      const grainCanvas = document.createElement("canvas");
      grainCanvas.width = 160;
      grainCanvas.height = 160;
      const gctx = grainCanvas.getContext("2d");
      if (gctx) {
        const gData = gctx.createImageData(160, 160);
        for (let i = 0; i < gData.data.length; i += 4) {
          const val = Math.random() * 255;
          gData.data[i] = val;
          gData.data[i + 1] = val;
          gData.data[i + 2] = val;
          gData.data[i + 3] = Math.round(255 * recipe.grain * intensity * 0.45);
        }
        gctx.putImageData(gData, 0, 0);
        const pattern = ctx.createPattern(grainCanvas, "repeat");
        if (pattern) {
          ctx.save();
          ctx.globalCompositeOperation = "overlay";
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
      }
    }
  }

  // 5. 主屏配对柔暗蒙层（让 App 图标文字清晰）
  if (options.homeScreenBlur) {
    ctx.fillStyle = "rgba(10, 12, 18, 0.22)";
    ctx.fillRect(0, 0, w, h);
  }

  // 6. 锁屏时间可读性顶部柔暗渐变
  if (options.clockScrim > 0 && !options.bypassStyle) {
    const scrim = ctx.createLinearGradient(0, 0, 0, h * 0.34);
    scrim.addColorStop(0, `rgba(0, 0, 0, ${(options.clockScrim * 0.85).toFixed(3)})`);
    scrim.addColorStop(0.55, `rgba(0, 0, 0, ${(options.clockScrim * 0.32).toFixed(3)})`);
    scrim.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h * 0.34);
  }
}

/**
 * 导出精确设备原生 Retina 分辨率 PNG 壁纸
 */
export function exportDeviceWallpaper(
  img: HTMLImageElement,
  device: AppleDeviceSpec,
  options: WallpaperRenderOptions,
  filenameSuffix = ""
): void {
  const { width, height } = getEffectiveDimensions(device, Boolean(options.ipadLandscape));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  renderWallpaperToCanvas(canvas, img, options);

  const link = document.createElement("a");
  const modeTag = options.homeScreenBlur ? "主屏配对" : "壁纸";
  link.download = `果壁Studio_${device.shortName.replace(/\s+/g, "")}_${options.preset.name}_${modeTag}${filenameSuffix}.png`;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();
}

/**
 * 一键生成小红书 / 朋友圈高颜值晒图展示海报（含 Mac + iPhone 组合样机与色卡）
 */
export function exportShowcasePoster(
  img: HTMLImageElement,
  options: WallpaperRenderOptions
): void {
  const canvas = document.createElement("canvas");
  canvas.width = 1440;
  canvas.height = 1800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const palette = extractPalette(img);

  // 背景高级氛围渐变
  const bg = ctx.createLinearGradient(0, 0, 1440, 1800);
  bg.addColorStop(0, "#0b0d14");
  bg.addColorStop(0.5, "#151926");
  bg.addColorStop(1, "#090a0f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1440, 1800);

  // 柔和氛围光晕
  const glow = ctx.createRadialGradient(720, 760, 80, 720, 760, 760);
  glow.addColorStop(0, `${palette[1]}44`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1440, 1800);

  // 顶部标题
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 28px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillText("APPLEWALL STUDIO · 苹果生态壁纸套图", 96, 128);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 62px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillText(options.preset.name, 96, 210);

  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = "400 30px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillText(options.preset.subtitle, 96, 266);

  // 渲染 Mac 壁纸样机
  const macCanvas = document.createElement("canvas");
  macCanvas.width = 1040;
  macCanvas.height = 672;
  renderWallpaperToCanvas(macCanvas, img, {
    ...options,
    topBreathingRoom: Math.min(options.topBreathingRoom, 0.08),
    homeScreenBlur: false,
  });

  // 绘制 MacBook 外框
  const drawRoundedRect = (x: number, y: number, rw: number, rh: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, rw, rh, r);
    ctx.closePath();
  };

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 30;
  ctx.fillStyle = "#1c1f26";
  drawRoundedRect(100, 360, 1080, 712, 34);
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRect(120, 380, 1040, 672, 20);
  ctx.clip();
  ctx.drawImage(macCanvas, 120, 380);
  // 简易 macOS 菜单栏与 Dock
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(120, 380, 1040, 28);
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  drawRoundedRect(410, 998, 460, 38, 16);
  ctx.fill();
  ctx.restore();

  // 渲染 iPhone 壁纸样机（叠加在右下角）
  const phoneCanvas = document.createElement("canvas");
  phoneCanvas.width = 396;
  phoneCanvas.height = 860;
  renderWallpaperToCanvas(phoneCanvas, img, { ...options, homeScreenBlur: false });

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = 80;
  ctx.shadowOffsetY = 32;
  ctx.fillStyle = "#14161c";
  drawRoundedRect(928, 610, 424, 888, 62);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawRoundedRect(942, 624, 396, 860, 50);
  ctx.clip();
  ctx.drawImage(phoneCanvas, 942, 624);
  // 灵动岛与锁屏时间
  ctx.fillStyle = "#000000";
  drawRoundedRect(1082, 646, 116, 32, 16);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.font = "500 22px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("11月22日 星期日", 1140, 728);
  ctx.font = "700 96px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("09:41", 1140, 822);
  ctx.restore();

  // 底部色卡与品牌标签
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("画面色板 PALETTE", 96, 1265);

  palette.forEach((hex, idx) => {
    const bx = 96 + idx * 145;
    ctx.fillStyle = hex;
    drawRoundedRect(bx, 1295, 118, 64, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "500 20px ui-monospace, SFMono-Regular, monospace";
    ctx.fillText(hex.toUpperCase(), bx, 1392);
  });

  // 底部信息条
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 1615);
  ctx.lineTo(1344, 1615);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 32px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillText("果壁 Studio · 免费苹果生态 AI 壁纸工作台", 96, 1685);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "400 24px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillText("适配 iPhone · iPad · Mac 视网膜高清原图", 96, 1726);

  const link = document.createElement("a");
  link.download = `果壁Studio_晒图海报_${options.preset.name}.png`;
  link.href = canvas.toDataURL("image/png", 0.96);
  link.click();
}
