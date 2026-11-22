"use client";

import { useEffect, useRef } from "react";
import { Flashlight, Camera, Wifi, BatteryFull, Signal } from "lucide-react";
import type { AppleDeviceSpec } from "@/lib/devices";
import { getEffectiveDimensions } from "@/lib/devices";
import { renderWallpaperToCanvas, type WallpaperRenderOptions } from "@/lib/canvas-engine";

export type ClockFontStyle = "sf-bold" | "sf-rounded" | "serif" | "thin";

interface DevicePreviewProps {
  image: HTMLImageElement | null;
  device: AppleDeviceSpec;
  renderOptions: WallpaperRenderOptions;
  showSafeZones: boolean;
  showOriginal: boolean;
  clockFont: ClockFontStyle;
  clockColor: string;
  depthHint: boolean;
}

const CLOCK_FONT_CLASS: Record<ClockFontStyle, string> = {
  "sf-bold": "font-bold tracking-tight",
  "sf-rounded": "font-semibold tracking-normal",
  serif: "font-serif font-semibold tracking-tight",
  thin: "font-extralight tracking-wide",
};

export function DevicePreview({
  image,
  device,
  renderOptions,
  showSafeZones,
  showOriginal,
  clockFont,
  clockColor,
  depthHint,
}: DevicePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { width: realW, height: realH } = getEffectiveDimensions(
    device,
    Boolean(renderOptions.ipadLandscape)
  );

  // 预览画布按设备真实比例缩放至高清预览分辨率（保证丝滑实时渲染）
  const maxPreviewDim = device.family === "mac" ? 860 : 720;
  const scale = maxPreviewDim / Math.max(realW, realH);
  const canvasW = Math.round(realW * scale);
  const canvasH = Math.round(realH * scale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = canvasW;
    canvas.height = canvasH;
    renderWallpaperToCanvas(canvas, image, {
      ...renderOptions,
      bypassStyle: showOriginal,
    });
  }, [image, canvasW, canvasH, renderOptions, showOriginal]);

  const isPhone = device.family === "iphone";
  const isPad = device.family === "ipad";
  const isMac = device.family === "mac";

  // 视觉框最大尺寸约束
  const frameClass = isPhone
    ? "w-[290px] sm:w-[316px] rounded-[46px] p-[10px]"
    : isPad
      ? renderOptions.ipadLandscape
        ? "w-full max-w-[560px] rounded-[28px] p-[11px]"
        : "w-[330px] sm:w-[390px] rounded-[28px] p-[11px]"
      : "w-full max-w-[640px] rounded-[22px] p-[10px]";

  const screenRoundedClass = isPhone
    ? "rounded-[36px]"
    : isPad
      ? "rounded-[18px]"
      : "rounded-[12px]";

  return (
    <div className="flex flex-col items-center justify-center">
      {/* 外壳样机 */}
      <div
        className={`relative border border-white/20 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black shadow-[0_28px_80px_rgba(0,0,0,0.75)] transition-all duration-300 ${frameClass}`}
      >
        <div
          className={`relative w-full overflow-hidden bg-zinc-950 ${screenRoundedClass}`}
          style={{ aspectRatio: `${realW} / ${realH}` }}
        >
          <canvas ref={canvasRef} className="block h-full w-full object-cover" />

          {/* 原图对比角标 */}
          {showOriginal && (
            <div className="pointer-events-none absolute left-3 top-10 z-30 rounded-full border border-white/20 bg-black/65 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
              原图效果
            </div>
          )}

          {/* ==================== iPhone 系统 UI 覆盖 ==================== */}
          {isPhone && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
              {/* 状态栏 + 灵动岛 / 经典刘海 */}
              <div className="relative flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-white/95">
                <span>09:41</span>
                {device.hasDynamicIsland && (
                  <div className="absolute left-1/2 top-2.5 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-black shadow-inner ring-1 ring-white/10" />
                )}
                {!device.hasDynamicIsland && device.hasNotch && (
                  <div className="absolute left-1/2 top-0 h-[22px] w-[112px] -translate-x-1/2 rounded-b-2xl bg-black" />
                )}
                <div className="flex items-center gap-1">
                  <Signal className="h-3 w-3" />
                  <Wifi className="h-3 w-3" />
                  <BatteryFull className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* 锁屏模式 vs 主屏图标模式 */}
              {!renderOptions.homeScreenBlur ? (
                <>
                  <div className="mt-5 flex flex-col items-center text-center">
                    <span
                      className="text-[12px] font-medium tracking-wide drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]"
                      style={{ color: clockColor, opacity: 0.92 }}
                    >
                      11月22日 星期日
                    </span>
                    <span
                      className={`mt-0.5 text-[62px] leading-none drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)] transition-all ${CLOCK_FONT_CLASS[clockFont]}`}
                      style={{
                        color: clockColor,
                        opacity: depthHint ? 0.88 : 0.96,
                      }}
                    >
                      09:41
                    </span>
                    {/* 锁屏小组件占位 */}
                    <div className="mt-2.5 flex items-center gap-2 text-[10px] text-white/85">
                      <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-md">
                        ☀ 22° 晴朗
                      </span>
                      <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-md">
                        🔋 94%
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto px-7 pb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md ring-1 ring-white/15">
                        <Flashlight className="h-4 w-4" />
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md ring-1 ring-white/15">
                        <Camera className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mx-auto h-1 w-28 rounded-full bg-white/85" />
                  </div>
                </>
              ) : (
                /* 主屏 App 图标网格模拟 */
                <div className="flex flex-1 flex-col justify-between px-5 pb-4 pt-6">
                  <div className="grid grid-cols-4 gap-3.5">
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div className="h-11 w-11 rounded-[13px] border border-white/20 bg-white/20 shadow-lg backdrop-blur-md" />
                        <div className="h-1.5 w-7 rounded-full bg-white/50" />
                      </div>
                    ))}
                  </div>
                  <div className="mx-auto flex w-full items-center justify-around rounded-[24px] border border-white/15 bg-white/20 px-3 py-2.5 backdrop-blur-xl">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-10 w-10 rounded-[12px] border border-white/20 bg-white/30"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== iPad 系统 UI 覆盖 ==================== */}
          {isPad && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
              <div className="flex items-center justify-between text-[11px] font-medium text-white/90">
                <span>09:41 周日 11月22日</span>
                <div className="flex items-center gap-1.5">
                  <Wifi className="h-3 w-3" />
                  <span>100%</span>
                  <BatteryFull className="h-3.5 w-3.5" />
                </div>
              </div>

              {!renderOptions.homeScreenBlur ? (
                <div className="mb-auto mt-5 text-center">
                  <div
                    className={`text-[54px] leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)] ${CLOCK_FONT_CLASS[clockFont]}`}
                    style={{ color: clockColor }}
                  >
                    09:41
                  </div>
                  <div className="mt-1 text-xs text-white/85">11月22日 星期日</div>
                </div>
              ) : (
                <div className="mx-auto mt-auto mb-1 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/20 px-4 py-2 backdrop-blur-xl">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-8 w-8 rounded-xl border border-white/25 bg-white/30" />
                  ))}
                </div>
              )}
              <div className="mx-auto h-1 w-28 rounded-full bg-white/80" />
            </div>
          )}

          {/* ==================== Mac 系统 UI 覆盖 ==================== */}
          {isMac && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
              {/* macOS 顶部菜单栏 */}
              <div className="relative flex h-6 items-center justify-between bg-black/28 px-3 text-[10px] font-medium text-white/90 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="font-bold"></span>
                  <span>访达</span>
                  <span className="opacity-75">文件</span>
                  <span className="opacity-75">编辑</span>
                  <span className="opacity-75">显示</span>
                </div>
                {device.hasNotch && (
                  <div className="absolute left-1/2 top-0 h-5 w-24 -translate-x-1/2 rounded-b-lg bg-black" />
                )}
                <div className="flex items-center gap-2">
                  <Wifi className="h-3 w-3" />
                  <span>11月22日 周日 09:41</span>
                </div>
              </div>

              {/* macOS 底部 Dock */}
              <div className="mb-2.5 flex justify-center">
                <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/18 px-3 py-1.5 shadow-xl backdrop-blur-xl">
                  {[
                    "from-blue-400 to-blue-600",
                    "from-emerald-400 to-teal-500",
                    "from-amber-400 to-orange-500",
                    "from-pink-400 to-rose-500",
                    "from-indigo-400 to-violet-600",
                    "from-sky-400 to-cyan-500",
                    "from-zinc-200 to-zinc-400",
                  ].map((grad, idx) => (
                    <div
                      key={idx}
                      className={`h-7 w-7 rounded-lg bg-gradient-to-br shadow-sm ${grad}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 安全区参考辅助线 ==================== */}
          {showSafeZones && (
            <div className="pointer-events-none absolute inset-0 z-20">
              {/* 顶部禁区 / 灵动岛或菜单栏 */}
              <div
                className="absolute inset-x-0 top-0 border-b border-dashed border-rose-400/80 bg-rose-500/12"
                style={{ height: `${device.safeZones.topClearPercent}%` }}
              />
              {/* 锁屏时钟安全区 */}
              {device.safeZones.clockZoneTopPercent && device.safeZones.clockZoneBottomPercent && (
                <div
                  className="absolute inset-x-3 flex items-end justify-end rounded-xl border border-dashed border-amber-300/80 bg-amber-400/10 p-1.5"
                  style={{
                    top: `${device.safeZones.clockZoneTopPercent}%`,
                    height: `${
                      device.safeZones.clockZoneBottomPercent - device.safeZones.clockZoneTopPercent
                    }%`,
                  }}
                >
                  <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-amber-200">
                    锁屏时钟安全区（建议留白）
                  </span>
                </div>
              )}
              {/* iOS 景深最佳主体顶部参考线 */}
              {device.safeZones.depthSweetSpotPercent && depthHint && (
                <div
                  className="absolute inset-x-0 border-t-2 border-dotted border-cyan-300/90"
                  style={{ top: `${device.safeZones.depthSweetSpotPercent}%` }}
                >
                  <span className="ml-2 inline-block -translate-y-5 rounded bg-cyan-950/90 px-1.5 py-0.5 text-[9px] text-cyan-200 ring-1 ring-cyan-400/40">
                    景深黄金线：主体头顶略过此处易触发景深
                  </span>
                </div>
              )}
              {/* 底部 Dock / Home Bar 避让区 */}
              <div
                className="absolute inset-x-0 bottom-0 flex items-start justify-end border-t border-dashed border-sky-400/75 bg-sky-500/10 p-1"
                style={{ height: `${device.safeZones.bottomClearPercent}%` }}
              >
                <span className="rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-sky-200">
                  {isMac ? "Dock 避让区" : "底部按钮避让区"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mac 铝合金底座装饰 */}
      {isMac && (
        <div className="h-3 w-[88%] max-w-[680px] rounded-b-xl bg-gradient-to-b from-zinc-600 via-zinc-700 to-zinc-800 shadow-lg" />
      )}

      {/* 底部设备规格信息条 */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-200">
          {device.name}
          {device.screenSize ? ` · ${device.screenSize}` : ""}
          {isPad ? (renderOptions.ipadLandscape ? " · 横屏" : " · 竖屏") : ""}
        </span>
        {device.tierLabel && (
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              device.tier === "pro-max"
                ? "border-amber-400/35 bg-amber-500/15 text-amber-200"
                : device.tier === "pro"
                  ? "border-blue-400/35 bg-blue-500/15 text-blue-200"
                  : "border-emerald-400/30 bg-emerald-500/12 text-emerald-200"
            }`}
          >
            {device.tierLabel}
            {device.hasNotch && isPhone ? " · 刘海屏" : isPhone ? " · 灵动岛" : ""}
          </span>
        )}
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-zinc-300">
          导出原图 {realW} × {realH}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
          比例 {device.aspectLabel}
        </span>
      </div>
    </div>
  );
}
