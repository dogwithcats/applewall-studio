import type { AppleDeviceSpec } from "./devices";
import { getEffectiveDimensions } from "./devices";
import {
  applyFilmGradeToCanvas,
  type FilmFineTune,
} from "./film-lut";
import type { LocalRecipe, StylePreset } from "./presets";

export interface WallpaperRenderOptions {
  preset: StylePreset;
  strength: number; // 0 ~ 1
  fineTune?: FilmFineTune;
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
 * 缓存确定性有机胶片颗粒贴图（256x256 居中 128 高斯感噪点）：
 * - 拖拽构图时绝不闪烁
 * - 支持 4K Mac / iPhone Pro Max 高清原图导出保留细腻颗粒
 */
let cachedGrainCanvas: HTMLCanvasElement | null = null;

function getOrganicGrainCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (cachedGrainCanvas) return cachedGrainCanvas;

  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const gctx = c.getContext("2d");
  if (!gctx) return null;

  const imgData = gctx.createImageData(size, size);
  const data = imgData.data;

  // Mulberry32 确定性随机数，生成自然胶片颗粒分布
  let seed = 0x5f3759df;
  const nextRand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 0; i < data.length; i += 4) {
    // 2-tap 三角近似高斯分布，比均匀白噪点更贴近真实富士银盐颗粒
    const g = (nextRand() + nextRand()) * 0.5;
    const val = Math.max(0, Math.min(255, Math.round(128 + (g - 0.5) * 210)));
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }

  gctx.putImageData(imgData, 0, 0);
  cachedGrainCanvas = c;
  return c;
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

  sctx.drawImage(
    img,
    0,
    0,
    img.naturalWidth,
    Math.max(1, img.naturalHeight * 0.14),
    0,
    0,
    24,
    12
  );
  const data = sctx.getImageData(0, 0, 24, 12).data;

  let r1 = 0,
    g1 = 0,
    b1 = 0,
    c1 = 0;
  let r2 = 0,
    g2 = 0,
    b2 = 0,
    c2 = 0;
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
 * 提取画面 4 个代表色，用于晒图海报色卡与氛围背光
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

function buildCssFilterString(recipe: LocalRecipe, intensity: number): string {
  const brightness = lerp(1, recipe.brightness, intensity);
  const contrast = lerp(1, recipe.contrast, intensity);
  const saturate = lerp(1, recipe.saturate, intensity);
  const sepia = lerp(0, recipe.sepia ?? 0, intensity);
  const hue = lerp(0, recipe.hueRotate ?? 0, intensity);

  if (
    Math.abs(brightness - 1) < 0.002 &&
    Math.abs(contrast - 1) < 0.002 &&
    Math.abs(saturate - 1) < 0.002 &&
    Math.abs(sepia) < 0.002 &&
    Math.abs(hue) < 0.1
  ) {
    return "none";
  }

  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturate.toFixed(3)}) sepia(${sepia.toFixed(3)}) hue-rotate(${hue.toFixed(1)}deg)`;
}

/**
 * 为滤镜面板批量生成当前照片的实时滤镜缩略图（毫秒级）
 */
export function renderFilterThumbnails(
  img: HTMLImageElement,
  presets: StylePreset[]
): Record<string, string> {
  const thumbW = 96;
  const thumbH = 66;
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = thumbW;
  baseCanvas.height = thumbH;
  const bctx = baseCanvas.getContext("2d");
  if (!bctx) return {};

  // 居中裁切原图到缩略图比例
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = thumbW / thumbH;
  let sx = 0,
    sy = 0,
    sw = img.naturalWidth,
    sh = img.naturalHeight;
  if (imgRatio > targetRatio) {
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  bctx.drawImage(img, sx, sy, sw, sh, 0, 0, thumbW, thumbH);

  const workCanvas = document.createElement("canvas");
  workCanvas.width = thumbW;
  workCanvas.height = thumbH;
  const wctx = workCanvas.getContext("2d", { willReadFrequently: true });
  if (!wctx) return {};

  const result: Record<string, string> = {};

  for (const preset of presets) {
    const recipe = preset.localRecipe;
    const intensity = preset.defaultStrength;

    wctx.clearRect(0, 0, thumbW, thumbH);
    const cssFilter = buildCssFilterString(recipe, intensity);
    wctx.save();
    wctx.filter = cssFilter;
    wctx.drawImage(baseCanvas, 0, 0);
    wctx.restore();

    if (recipe.filmGrade) {
      applyFilmGradeToCanvas(wctx, thumbW, thumbH, recipe.filmGrade, intensity);
    }

    if (recipe.overlayGradient) {
      wctx.save();
      wctx.globalCompositeOperation = recipe.overlayGradient.blendMode;
      wctx.globalAlpha = recipe.overlayGradient.opacity * intensity;
      const og = wctx.createLinearGradient(0, 0, thumbW, thumbH);
      og.addColorStop(0, recipe.overlayGradient.from);
      og.addColorStop(1, recipe.overlayGradient.to);
      wctx.fillStyle = og;
      wctx.fillRect(0, 0, thumbW, thumbH);
      wctx.restore();
    }

    if (recipe.vignette && recipe.vignette > 0) {
      const vg = wctx.createRadialGradient(
        thumbW / 2,
        thumbH / 2,
        thumbH * 0.25,
        thumbW / 2,
        thumbH / 2,
        thumbW * 0.72
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(0,0,0,${(recipe.vignette * intensity * 0.85).toFixed(3)})`);
      wctx.fillStyle = vg;
      wctx.fillRect(0, 0, thumbW, thumbH);
    }

    result[preset.id] = workCanvas.toDataURL("image/jpeg", 0.78);
  }

  return result;
}

/**
 * 核心渲染管线：把源图按指定 Apple 设备比例、安全区延展与富士胶片色彩科学渲染到目标 Canvas
 */
export function renderWallpaperToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  options: WallpaperRenderOptions
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
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

  const intensity = options.bypassStyle ? 0 : Math.max(0, Math.min(1, options.strength));
  const recipe = options.preset.localRecipe;
  const fineTune = options.bypassStyle ? undefined : options.fineTune;
  const baseCssFilter = buildCssFilterString(recipe, intensity);

  const needsTopOutpaint = breathingPx > 0 || dy > 0;
  const seamY = Math.max(0, dy);

  // 1. 顶部智能延展底色 + 垂直镜像柔化扩边（零断层、无暗带）
  if (needsTopOutpaint) {
    const [topColor, midColor] = sampleTopColors(img);
    const extGrad = ctx.createLinearGradient(0, 0, 0, Math.max(seamY + h * 0.25, h * 0.45));
    extGrad.addColorStop(0, topColor);
    extGrad.addColorStop(1, midColor);
    ctx.fillStyle = extGrad;
    ctx.fillRect(0, 0, w, h);

    // 垂直镜像并柔和模糊照片顶部边缘，像素色彩与原图顶部边界 100% 连续
    ctx.save();
    const blurAmt = Math.max(14, Math.round(w * 0.036));
    ctx.filter =
      baseCssFilter === "none" ? `blur(${blurAmt}px)` : `${baseCssFilter} blur(${blurAmt}px)`;
    const mirrorH = Math.max(seamY + Math.round(h * 0.16), Math.round(h * 0.26));
    ctx.translate(0, seamY + Math.round(h * 0.06));
    ctx.scale(1, -1);
    ctx.drawImage(
      img,
      0,
      0,
      img.naturalWidth,
      Math.max(4, img.naturalHeight * 0.3),
      dx - w * 0.06,
      0,
      drawW + w * 0.12,
      mirrorH
    );
    ctx.restore();
  }

  // 2. 主画面绘制（开启顶部留白时对上缘做自然透明羽化，无缝融入延展背景）
  if (needsTopOutpaint && !options.homeScreenBlur) {
    const mainLayer = document.createElement("canvas");
    mainLayer.width = w;
    mainLayer.height = h;
    const mctx = mainLayer.getContext("2d");
    if (mctx) {
      if (baseCssFilter !== "none") mctx.filter = baseCssFilter;
      mctx.drawImage(img, dx, dy, drawW, drawH);
      mctx.filter = "none";

      // 仅对顶部接缝处做平滑 Alpha 羽化，保留主体区域 100% 锐利
      const featherH = Math.max(Math.round(h * 0.14), Math.round(seamY * 0.7));
      mctx.globalCompositeOperation = "destination-in";
      const mask = mctx.createLinearGradient(0, seamY, 0, seamY + featherH);
      mask.addColorStop(0, "rgba(0,0,0,0)");
      mask.addColorStop(0.45, "rgba(0,0,0,0.68)");
      mask.addColorStop(1, "rgba(0,0,0,1)");
      mctx.fillStyle = mask;
      mctx.fillRect(0, 0, w, h);

      ctx.drawImage(mainLayer, 0, 0);
    }
  } else {
    ctx.save();
    if (options.homeScreenBlur) {
      const blurPx = Math.max(16, Math.round(w * 0.028));
      ctx.filter =
        baseCssFilter === "none" ? `blur(${blurPx}px)` : `${baseCssFilter} blur(${blurPx}px)`;
    } else if (baseCssFilter !== "none") {
      ctx.filter = baseCssFilter;
    }
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();
  }

  // 4. 像素级富士胶片色彩科学调色（在顶部延展融合之后执行，保证整张壁纸色相与曲线 100% 统一无缝！）
  if (!options.bypassStyle) {
    applyFilmGradeToCanvas(ctx, w, h, recipe.filmGrade, intensity, fineTune);
  }

  // 5. 光学美学层：氛围渐变 / 黑柔 Bloom / 胶片红橙光晕 Halation / 边缘散景 / 暗角 / 有机银盐颗粒
  if (!options.bypassStyle) {
    if (recipe.overlayGradient && intensity > 0.01) {
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

    const effectiveBloom =
      fineTune?.bloomOverride !== undefined
        ? fineTune.bloomOverride
        : (recipe.bloom ?? 0) * intensity;

    if (effectiveBloom > 0.01) {
      // 从当前已完成胶片调色的画面生成柔和黑柔高光光晕
      const bloomCanvas = document.createElement("canvas");
      const scaleDown = Math.max(1, Math.round(w / 320));
      bloomCanvas.width = Math.max(64, Math.round(w / scaleDown));
      bloomCanvas.height = Math.max(64, Math.round(h / scaleDown));
      const bctx = bloomCanvas.getContext("2d");
      if (bctx) {
        bctx.filter = `blur(${Math.max(6, Math.round(bloomCanvas.width * 0.032))}px) brightness(1.16) contrast(1.12)`;
        bctx.drawImage(canvas, 0, 0, bloomCanvas.width, bloomCanvas.height);

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = Math.min(0.65, effectiveBloom * 0.44);
        ctx.drawImage(bloomCanvas, 0, 0, w, h);
        ctx.restore();
      }
    }

    // 胶片高光红橙光晕溢色（Halation，如 CineStill 800T / Nostalgic Neg）
    if (recipe.halationColor && recipe.halationStrength && intensity > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = recipe.halationStrength * intensity * 0.55;
      const haloGrad = ctx.createRadialGradient(
        w * 0.5,
        h * 0.44,
        w * 0.08,
        w * 0.5,
        h * 0.44,
        Math.max(w, h) * 0.65
      );
      haloGrad.addColorStop(0, recipe.halationColor);
      haloGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (recipe.edgeBokeh && recipe.edgeBokeh > 0 && intensity > 0.01 && !options.homeScreenBlur) {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");
      if (octx) {
        octx.filter = `blur(${Math.max(10, Math.round(w * 0.018))}px)`;
        octx.drawImage(canvas, 0, 0);
        octx.globalCompositeOperation = "destination-out";
        const mask = octx.createRadialGradient(
          w * 0.5,
          h * 0.58,
          w * 0.14,
          w * 0.5,
          h * 0.58,
          Math.max(w, h) * 0.56
        );
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

    const effectiveVignette =
      fineTune?.vignetteOverride !== undefined
        ? fineTune.vignetteOverride
        : (recipe.vignette ?? 0) * intensity;

    if (effectiveVignette > 0.01) {
      const vg = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.25,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.72
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, effectiveVignette).toFixed(3)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }

    const effectiveGrain =
      fineTune?.grainOverride !== undefined
        ? fineTune.grainOverride
        : (recipe.grain ?? 0) * intensity;

    if (effectiveGrain > 0.01) {
      const grainCanvas = getOrganicGrainCanvas();
      if (grainCanvas) {
        const pattern = ctx.createPattern(grainCanvas, "repeat");
        if (pattern) {
          // 按输出分辨率轻度缩放颗粒尺度，确保 4K 导出和预览的颗粒观感一致细腻
          const grainScale = Math.max(1, w / 920);
          if (typeof DOMMatrix !== "undefined" && pattern.setTransform) {
            pattern.setTransform(new DOMMatrix().scale(grainScale, grainScale));
          }
          ctx.save();
          ctx.globalCompositeOperation = "soft-light";
          ctx.globalAlpha = Math.min(0.62, effectiveGrain * 0.58);
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
      }
    }
  }

  // 6. 主屏配对柔暗蒙层（让 App 图标文字清晰）
  if (options.homeScreenBlur) {
    ctx.fillStyle = "rgba(10, 12, 18, 0.22)";
    ctx.fillRect(0, 0, w, h);
  }

  // 7. 锁屏时间可读性顶部柔暗渐变
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
  link.download = `果壁Studio_${device.shortName.replace(/\s+/g, "")}_${options.preset.shortName}_${modeTag}${filenameSuffix}.png`;
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

  // 顶部标题与胶片代码标签
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "600 26px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(
    `APPLEWALL STUDIO  ·  FILM [${options.preset.filmCode}]  ·  ${options.preset.recipeTag}`,
    96,
    126
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 60px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillText(options.preset.name, 96, 210);

  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = "400 28px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
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
  ctx.fillText("果壁 Studio · 免费苹果生态胶片壁纸工作台", 96, 1685);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "400 24px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillText("内置富士胶片模拟 · 适配 iPhone / iPad / Mac 视网膜原图", 96, 1726);

  const link = document.createElement("a");
  link.download = `果壁Studio_晒图海报_${options.preset.shortName}.png`;
  link.href = canvas.toDataURL("image/png", 0.96);
  link.click();
}
