/**
 * 富士胶片色彩科学 & 像素级电影调色引擎（纯本地毫秒级运行，零 AI 依赖）
 *
 * 支持：
 * - 胶片 S 曲线反差 / 高光滚落 / 阴影恢复 / 哑光黑场抬升 (Fade)
 * - 富士风格白平衡偏移 (WB Shift: R 红青轴 / B 蓝黄轴)
 * - 3×3 色彩矩阵（精准还原 Classic Neg / Classic Chrome / Velvia / Eterna 等色偏）
 * - 富士 Color Chrome FX Blue 深蓝天空压暗润泽效果
 * - 自然饱和度 (Vibrance) + 全局饱和度 + 真实黑白胶片通道混合 (ACROS)
 * - 亮度加权三段式分离调色（暗部 / 中间调 / 高光）
 */

export interface FilmGrade {
  /** 曝光偏移 (-0.35 ~ +0.35, 0 = 原始) */
  exposure?: number;
  /** 胶片 S 曲线反差 (-0.45 ~ +0.6, 0 = 线性) */
  contrast?: number;
  /** 阴影提亮或压暗 (-0.35 ~ +0.35) */
  shadows?: number;
  /** 高光压缩或提亮 (-0.35 ~ +0.35) */
  highlights?: number;
  /** 黑场哑光抬升 (0 ~ 0.14，营造复古胶片柔和暗部) */
  fade?: number;
  /** 富士白平衡偏移：r (-9..+9 红/青), b (-9..+9 蓝/黄) */
  wbShift?: { r: number; b: number };
  /** 全局饱和度 (0 = 黑白, 1 = 原始, 1.35 = 浓郁) */
  saturation?: number;
  /** 自然鲜明度 (-0.3 ~ +0.45，优先增强低饱和色，避免肤色溢出) */
  vibrance?: number;
  /** 3×3 色彩科学矩阵 [rr, rg, rb, gr, gg, gb, br, bg, bb] */
  colorMatrix?: [
    number, number, number,
    number, number, number,
    number, number, number,
  ];
  /** 黑白胶片通道权重 [r, g, b]（配置后启用真实全色黑白胶片转换） */
  monoWeights?: [number, number, number];
  /** 三段式分离调色，每通道偏移量约 -40 ~ +40 */
  splitTone?: {
    shadows?: [number, number, number];
    midtones?: [number, number, number];
    highlights?: [number, number, number];
  };
  /** 类似富士 Color Chrome FX Blue：加深蔚蓝天空与水面的厚重质感 (0 ~ 0.45) */
  colorChromeBlue?: number;
}

export interface FilmFineTune {
  /** 用户色温微调 (-30 ~ +30，正数偏暖，负数偏冷) */
  warmth: number;
  /** 用户曝光微调 (-25 ~ +25) */
  exposure: number;
  /** 覆盖预设颗粒感 (0 ~ 1，undefined 表示跟随滤镜默认) */
  grainOverride?: number;
  /** 覆盖预设黑柔光晕 (0 ~ 1，undefined 表示跟随滤镜默认) */
  bloomOverride?: number;
  /** 覆盖预设暗角 (0 ~ 1，undefined 表示跟随滤镜默认) */
  vignetteOverride?: number;
}

export const DEFAULT_FINE_TUNE: FilmFineTune = {
  warmth: 0,
  exposure: 0,
};

// 预计算分离调色亮度权重表（仅初始化一次，避免像素循环中调用 Math.pow）
const SHADOW_WEIGHT_LUT = new Float32Array(256);
const MID_WEIGHT_LUT = new Float32Array(256);
const HIGH_WEIGHT_LUT = new Float32Array(256);

for (let i = 0; i < 256; i++) {
  const l = i / 255;
  SHADOW_WEIGHT_LUT[i] = Math.pow(1 - l, 1.9);
  MID_WEIGHT_LUT[i] = 4 * l * (1 - l);
  HIGH_WEIGHT_LUT[i] = Math.pow(l, 1.75);
}

function clampByte(v: number): number {
  return v <= 0 ? 0 : v >= 255 ? 255 : v;
}

function buildToneCurveLut(grade: FilmGrade): Float32Array {
  const lut = new Float32Array(256);
  const exposure = grade.exposure ?? 0;
  const contrast = grade.contrast ?? 0;
  const shadows = grade.shadows ?? 0;
  const highlights = grade.highlights ?? 0;
  const fade = grade.fade ?? 0;
  const expMul = Math.pow(2, exposure * 1.15);

  for (let i = 0; i < 256; i++) {
    let x = (i / 255) * expMul;

    // 胶片高光柔顺肩部滚落（避免天空云层生硬死白）
    if (x > 0.82) {
      const over = x - 0.82;
      x = 0.82 + (over / (1 + over * 1.65));
    }

    // 阴影与高光精细区段控制
    const clampedForMask = x < 0 ? 0 : x > 1 ? 1 : x;
    if (shadows !== 0) {
      x += shadows * 0.28 * Math.pow(1 - clampedForMask, 2.25);
    }
    if (highlights !== 0) {
      x += highlights * 0.24 * Math.pow(clampedForMask, 2.0);
    }

    if (x < 0) x = 0;
    if (x > 1) x = 1;

    // 平滑 S 曲线反差（Hermite 胶片特性曲线）
    if (contrast > 0) {
      const s = x * x * (3 - 2 * x);
      x = x + (s - x) * contrast;
    } else if (contrast < 0) {
      x = x + (0.5 - x) * (-contrast * 0.52);
    }

    // 复古胶片哑光黑场抬升
    if (fade > 0) {
      x = fade + x * (1 - fade * 0.82);
    }

    lut[i] = clampByte(x * 255);
  }
  return lut;
}

/**
 * 对 Canvas 当前画面执行像素级胶片调色与用户精细微调
 */
export function applyFilmGradeToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grade: FilmGrade | undefined,
  intensity: number,
  fineTune?: FilmFineTune
): void {
  const hasPresetGrade = Boolean(grade) && intensity > 0.005;
  const userWarmth = fineTune?.warmth ?? 0;
  const userExposure = fineTune?.exposure ?? 0;
  const hasUserGrade = Math.abs(userWarmth) > 0.2 || Math.abs(userExposure) > 0.2;

  if (!hasPresetGrade && !hasUserGrade) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  const g = grade ?? {};
  const toneLut = hasPresetGrade ? buildToneCurveLut(g) : null;
  const matrix = hasPresetGrade ? g.colorMatrix : undefined;
  const mono = hasPresetGrade ? g.monoWeights : undefined;

  const wbR = hasPresetGrade ? (g.wbShift?.r ?? 0) : 0;
  const wbB = hasPresetGrade ? (g.wbShift?.b ?? 0) : 0;
  const wbDeltaR = wbR * 2.4 - wbB * 1.1;
  const wbDeltaG = -wbR * 0.45 - wbB * 0.3;
  const wbDeltaB = wbB * 2.55 - wbR * 0.65;

  const sat = hasPresetGrade ? (g.saturation ?? 1) : 1;
  const vib = hasPresetGrade ? (g.vibrance ?? 0) : 0;
  const chromeBlue = hasPresetGrade ? (g.colorChromeBlue ?? 0) : 0;

  const stShad = hasPresetGrade ? g.splitTone?.shadows : undefined;
  const stMid = hasPresetGrade ? g.splitTone?.midtones : undefined;
  const stHigh = hasPresetGrade ? g.splitTone?.highlights : undefined;
  const hasSplit = Boolean(stShad || stMid || stHigh);

  const sr = stShad?.[0] ?? 0;
  const sg = stShad?.[1] ?? 0;
  const sb = stShad?.[2] ?? 0;
  const mr = stMid?.[0] ?? 0;
  const mg = stMid?.[1] ?? 0;
  const mb = stMid?.[2] ?? 0;
  const hr = stHigh?.[0] ?? 0;
  const hg = stHigh?.[1] ?? 0;
  const hb = stHigh?.[2] ?? 0;

  const blend = Math.max(0, Math.min(1, intensity));
  const invBlend = 1 - blend;

  // 用户手动曝光与色温独立参数
  const userExpMul = userExposure !== 0 ? Math.pow(2, (userExposure / 25) * 0.55) : 1;
  const uWarmR = userWarmth * 0.85;
  const uWarmG = userWarmth * 0.1;
  const uWarmB = -userWarmth * 0.92;

  for (let i = 0; i < len; i += 4) {
    const r0 = data[i];
    const g0 = data[i + 1];
    const b0 = data[i + 2];

    let r = r0;
    let gr = g0;
    let b = b0;

    if (hasPresetGrade) {
      // 1. 3×3 胶片色彩矩阵
      if (matrix) {
        const nr = r * matrix[0] + gr * matrix[1] + b * matrix[2];
        const ng = r * matrix[3] + gr * matrix[4] + b * matrix[5];
        const nb = r * matrix[6] + gr * matrix[7] + b * matrix[8];
        r = nr;
        gr = ng;
        b = nb;
      }

      // 2. 富士白平衡偏移 (R/B Shift)
      if (wbR !== 0 || wbB !== 0) {
        r += wbDeltaR;
        gr += wbDeltaG;
        b += wbDeltaB;
      }

      // 3. 富士 Color Chrome FX Blue：加深蔚蓝天空层次与浓郁度
      if (chromeBlue > 0) {
        const rgMax = r > gr ? r : gr;
        const blueExcess = b - rgMax;
        if (blueExcess > 6) {
          const factor = (blueExcess / 255) * chromeBlue;
          r *= 1 - factor * 0.55;
          gr *= 1 - factor * 0.22;
          b *= 1 - factor * 0.14;
        }
      }

      // 4. 真实胶片黑白通道 或 饱和度/自然鲜明度
      if (mono) {
        const gray = r * mono[0] + gr * mono[1] + b * mono[2];
        r = gray;
        gr = gray;
        b = gray;
      } else if (sat !== 1 || vib !== 0) {
        const luma = 0.299 * r + 0.587 * gr + 0.114 * b;
        let satFactor = sat;
        if (vib !== 0) {
          const maxC = r > gr ? (r > b ? r : b) : (gr > b ? gr : b);
          const minC = r < gr ? (r < b ? r : b) : (gr < b ? gr : b);
          const curSat = (maxC - minC) * 0.00392157; // / 255
          satFactor = sat + vib * (1 - curSat);
        }
        r = luma + (r - luma) * satFactor;
        gr = luma + (gr - luma) * satFactor;
        b = luma + (b - luma) * satFactor;
      }

      // 5. 胶片特性曲线 LUT（曝光 + S 曲线 + 阴影高光 + 哑光黑场）
      if (toneLut) {
        r = toneLut[r <= 0 ? 0 : r >= 255 ? 255 : r | 0];
        gr = toneLut[gr <= 0 ? 0 : gr >= 255 ? 255 : gr | 0];
        b = toneLut[b <= 0 ? 0 : b >= 255 ? 255 : b | 0];
      }

      // 6. 亮度加权三段式分离调色
      if (hasSplit) {
        const lumIdx = clampByte((77 * r + 150 * gr + 29 * b) >> 8) | 0;
        const sw = SHADOW_WEIGHT_LUT[lumIdx];
        const mw = MID_WEIGHT_LUT[lumIdx];
        const hw = HIGH_WEIGHT_LUT[lumIdx];
        r += sr * sw + mr * mw + hr * hw;
        gr += sg * sw + mg * mw + hg * hw;
        b += sb * sw + mb * mw + hb * hw;
      }

      // 7. 按滤镜强度与原图平滑融合
      r = r0 * invBlend + r * blend;
      gr = g0 * invBlend + gr * blend;
      b = b0 * invBlend + b * blend;
    }

    // 8. 用户手动曝光与色温微调
    if (hasUserGrade) {
      if (userExpMul !== 1) {
        r *= userExpMul;
        gr *= userExpMul;
        b *= userExpMul;
      }
      if (userWarmth !== 0) {
        r += uWarmR;
        gr += uWarmG;
        b += uWarmB;
      }
    }

    data[i] = clampByte(r);
    data[i + 1] = clampByte(gr);
    data[i + 2] = clampByte(b);
  }

  ctx.putImageData(imgData, 0, 0);
}
