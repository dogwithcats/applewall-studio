"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flashlight,
  Camera,
  Wifi,
  Sun,
  CloudSun,
  Calendar,
  Music2,
  Compass,
  Settings,
  Image as ImageIcon,
  MessageCircle,
  Clock,
  SlidersHorizontal,
  MoveHorizontal,
  GripHorizontal,
} from "lucide-react";
import type { AppleDeviceSpec } from "@/lib/devices";
import { getEffectiveDimensions } from "@/lib/devices";
import {
  extractPalette,
  renderWallpaperToCanvas,
  type WallpaperRenderOptions,
} from "@/lib/canvas-engine";

export type ClockFontStyle = "sf-bold" | "sf-rounded" | "serif" | "thin";
export type ChassisFinish = "natural" | "desert" | "black" | "silver";

interface DevicePreviewProps {
  image: HTMLImageElement | null;
  device: AppleDeviceSpec;
  renderOptions: WallpaperRenderOptions;
  showSafeZones: boolean;
  compareMode: boolean;
  clockFont: ClockFontStyle;
  clockColor: string;
  depthHint: boolean;
  chassisFinish: ChassisFinish;
  onPanChange?: (nextX: number, nextY: number) => void;
}

const CLOCK_FONT_CLASS: Record<ClockFontStyle, string> = {
  "sf-bold": "font-bold tracking-[-0.04em]",
  "sf-rounded": "font-semibold tracking-[-0.02em]",
  serif: "font-serif font-semibold tracking-[-0.03em]",
  thin: "font-extralight tracking-[0.02em]",
};

const CHASSIS_STYLES: Record<
  ChassisFinish,
  { outer: string; button: string; label: string }
> = {
  natural: {
    outer:
      "from-[#9a968e] via-[#57544f] to-[#2c2a27] ring-1 ring-[#d6d1c7]/35 shadow-[0_36px_95px_rgba(0,0,0,0.85)]",
    button: "bg-gradient-to-b from-[#b7b2a9] to-[#68645d]",
    label: "原色钛金属",
  },
  desert: {
    outer:
      "from-[#d4b698] via-[#8d7258] to-[#3f3124] ring-1 ring-[#f2d8bd]/35 shadow-[0_36px_95px_rgba(0,0,0,0.85)]",
    button: "bg-gradient-to-b from-[#e4c8ac] to-[#987b5f]",
    label: "沙漠金钛金属",
  },
  black: {
    outer:
      "from-[#4a4c54] via-[#22242a] to-[#0f1014] ring-1 ring-white/20 shadow-[0_36px_95px_rgba(0,0,0,0.9)]",
    button: "bg-gradient-to-b from-[#5c5f68] to-[#25272d]",
    label: "暗夜黑钛金属",
  },
  silver: {
    outer:
      "from-[#e4e6eb] via-[#9fa4b0] to-[#4e525c] ring-1 ring-white/45 shadow-[0_36px_95px_rgba(0,0,0,0.82)]",
    button: "bg-gradient-to-b from-[#f0f2f7] to-[#9ea3af]",
    label: "星光银钛金属",
  },
};

function StatusSignalBars() {
  return (
    <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor" className="opacity-95">
      <rect x="0" y="6.5" width="2.4" height="3.5" rx="0.8" />
      <rect x="3.8" y="4.5" width="2.4" height="5.5" rx="0.8" />
      <rect x="7.6" y="2.2" width="2.4" height="7.8" rx="0.8" />
      <rect x="11.4" y="0" width="2.4" height="10" rx="0.8" />
    </svg>
  );
}

function StatusBattery() {
  return (
    <div className="flex items-center gap-[1.5px]">
      <div className="relative h-[10.5px] w-[21px] rounded-[3.2px] border border-white/60 p-[1.5px]">
        <div className="h-full w-[82%] rounded-[1.5px] bg-white" />
      </div>
      <div className="h-[4px] w-[1.5px] rounded-r-full bg-white/60" />
    </div>
  );
}

const HOME_APPS = [
  { name: "日历", bg: "from-white to-zinc-200 text-rose-600", icon: Calendar },
  { name: "天气", bg: "from-sky-400 to-blue-600 text-white", icon: CloudSun },
  { name: "照片", bg: "from-amber-300 via-pink-400 to-indigo-500 text-white", icon: ImageIcon },
  { name: "时钟", bg: "from-zinc-800 to-black text-white", icon: Clock },
  { name: "音乐", bg: "from-rose-500 to-pink-600 text-white", icon: Music2 },
  { name: "相机", bg: "from-zinc-300 to-zinc-500 text-zinc-900", icon: Camera },
  { name: "浏览器", bg: "from-cyan-400 to-blue-600 text-white", icon: Compass },
  { name: "设置", bg: "from-zinc-500 to-zinc-700 text-white", icon: Settings },
];

export function DevicePreview({
  image,
  device,
  renderOptions,
  showSafeZones,
  compareMode,
  clockFont,
  clockColor,
  depthHint,
  chassisFinish,
  onPanChange,
}: DevicePreviewProps) {
  const styledCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);

  const [splitPercent, setSplitPercent] = useState(50);
  const [draggingSplit, setDraggingSplit] = useState(false);
  const [panning, setPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  const { width: realW, height: realH } = getEffectiveDimensions(
    device,
    Boolean(renderOptions.ipadLandscape)
  );

  // 动态提取壁纸主色调，投射 Apple.com 级细腻氛围背光
  const ambientColors = useMemo(() => {
    if (!image) return ["#3b82f6", "#6366f1"];
    try {
      const p = extractPalette(image);
      return [p[1] || "#3b82f6", p[2] || "#f59e0b"];
    } catch {
      return ["#3b82f6", "#6366f1"];
    }
  }, [image]);

  const maxPreviewDim = device.family === "mac" ? 960 : 820;
  const scale = maxPreviewDim / Math.max(realW, realH);
  const canvasW = Math.round(realW * scale);
  const canvasH = Math.round(realH * scale);

  useEffect(() => {
    const canvas = styledCanvasRef.current;
    if (!canvas || !image) return;
    canvas.width = canvasW;
    canvas.height = canvasH;
    renderWallpaperToCanvas(canvas, image, {
      ...renderOptions,
      bypassStyle: false,
    });
  }, [image, canvasW, canvasH, renderOptions]);

  useEffect(() => {
    const canvas = originalCanvasRef.current;
    if (!canvas || !image || !compareMode) return;
    canvas.width = canvasW;
    canvas.height = canvasH;
    renderWallpaperToCanvas(canvas, image, {
      ...renderOptions,
      topBreathingRoom: 0,
      clockScrim: 0,
      homeScreenBlur: false,
      bypassStyle: true,
    });
  }, [image, canvasW, canvasH, renderOptions, compareMode]);

  const isPhone = device.family === "iphone";
  const isPad = device.family === "ipad";
  const isMac = device.family === "mac";
  const chassis = CHASSIS_STYLES[chassisFinish];

  // 机身外框尺寸与倒角
  const outerFrameClass = isPhone
    ? "w-[300px] sm:w-[322px] rounded-[52px] p-[3px]"
    : isPad
      ? renderOptions.ipadLandscape
        ? "w-full max-w-[570px] rounded-[30px] p-[3px]"
        : "w-[340px] sm:w-[396px] rounded-[30px] p-[3px]"
      : "w-full max-w-[650px] rounded-[22px] p-[2.5px]";

  const innerBezelClass = isPhone
    ? "rounded-[49px] p-[9px] bg-[#070709]"
    : isPad
      ? "rounded-[27px] p-[10px] bg-[#08080a]"
      : "rounded-[19.5px] p-[9px] bg-[#070709]";

  const screenRoundedClass = isPhone
    ? "rounded-[40px]"
    : isPad
      ? "rounded-[17px]"
      : "rounded-[11px]";

  // 画布直接拖拽平移
  function handleScreenPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (compareMode || !onPanChange) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: renderOptions.offsetX,
      origY: renderOptions.offsetY,
    };
  }

  function handleScreenPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (draggingSplit && screenRef.current) {
      const rect = screenRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(6, Math.min(94, pct)));
      return;
    }
    if (!panning || !panStartRef.current || !onPanChange) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    const nextX = Math.max(-50, Math.min(50, Math.round(panStartRef.current.origX + dx * 0.4)));
    const nextY = Math.max(-50, Math.min(50, Math.round(panStartRef.current.origY + dy * 0.4)));
    onPanChange(nextX, nextY);
  }

  function handleScreenPointerUp() {
    setPanning(false);
    setDraggingSplit(false);
    panStartRef.current = null;
  }

  return (
    <div className="relative flex w-full flex-col items-center justify-center py-2">
      {/* 动态壁纸氛围背光（柔和、不抢眼、高级感核心） */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-35 blur-[90px] transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 38% 35%, ${ambientColors[0]}, transparent 62%), radial-gradient(circle at 68% 70%, ${ambientColors[1]}, transparent 65%)`,
        }}
      />

      {/* ==================== 旗舰金属机身外框 ==================== */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className={`relative bg-gradient-to-br transition-all duration-300 ${chassis.outer} ${outerFrameClass}`}
        >
          {/* iPhone 物理侧边按键 + 天线断带（左侧操作按钮+音量键，右侧电源键+凹陷相机控制键） */}
          {isPhone && (
            <>
              {/* 四角钛金属中框天线断带 */}
              <div className="pointer-events-none absolute left-0 top-[68px] h-[3.5px] w-[3px] bg-black/55" />
              <div className="pointer-events-none absolute right-0 top-[68px] h-[3.5px] w-[3px] bg-black/55" />
              <div className="pointer-events-none absolute bottom-[68px] left-0 h-[3.5px] w-[3px] bg-black/55" />
              <div className="pointer-events-none absolute bottom-[68px] right-0 h-[3.5px] w-[3px] bg-black/55" />

              {/* 操作按钮 / 音量加 / 音量减 */}
              <div
                className={`pointer-events-none absolute -left-[3.5px] top-[104px] h-[22px] w-[3.5px] rounded-l-[3px] shadow-[-1px_0_2px_rgba(0,0,0,0.65)] ${chassis.button}`}
              />
              <div
                className={`pointer-events-none absolute -left-[3.5px] top-[146px] h-[44px] w-[3.5px] rounded-l-[3px] shadow-[-1px_0_2px_rgba(0,0,0,0.65)] ${chassis.button}`}
              />
              <div
                className={`pointer-events-none absolute -left-[3.5px] top-[202px] h-[44px] w-[3.5px] rounded-l-[3px] shadow-[-1px_0_2px_rgba(0,0,0,0.65)] ${chassis.button}`}
              />

              {/* 电源键 + 蓝宝石齐平相机控制键 */}
              <div
                className={`pointer-events-none absolute -right-[3.5px] top-[168px] h-[68px] w-[3.5px] rounded-r-[3px] shadow-[1px_0_2px_rgba(0,0,0,0.65)] ${chassis.button}`}
              />
              <div className="pointer-events-none absolute -right-[2px] top-[348px] h-[44px] w-[2.5px] rounded-r-[2px] bg-[#16171d] ring-1 ring-white/25" />
            </>
          )}

          {/* 贴合黑边内框 */}
          <div className={`relative shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ${innerBezelClass}`}>
            {/* iPhone 顶部微缝听筒扬声器 */}
            {isPhone && (
              <div className="pointer-events-none absolute left-1/2 top-[3.5px] z-30 h-[2.5px] w-[42px] -translate-x-1/2 rounded-full bg-[#15161b] shadow-[inset_0_1px_1px_rgba(0,0,0,0.9),0_0.5px_0_rgba(255,255,255,0.12)]" />
            )}

            {/* 实际屏幕视口 */}
            <div
              ref={screenRef}
              onPointerDown={handleScreenPointerDown}
              onPointerMove={handleScreenPointerMove}
              onPointerUp={handleScreenPointerUp}
              onPointerCancel={handleScreenPointerUp}
              className={`relative w-full select-none overflow-hidden bg-zinc-950 ring-1 ring-white/[0.08] ${screenRoundedClass} ${
                compareMode ? "cursor-ew-resize" : panning ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{ aspectRatio: `${realW} / ${realH}` }}
            >
              {/* 美化后画布 */}
              <canvas ref={styledCanvasRef} className="block h-full w-full object-cover" />

              {/* 拖拽分屏对比：原图画布 */}
              {compareMode && (
                <>
                  <div
                    className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
                  >
                    <canvas ref={originalCanvasRef} className="block h-full w-full object-cover" />
                  </div>

                  {/* 对比分割线与玻璃手柄 */}
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDraggingSplit(true);
                    }}
                    className="absolute inset-y-0 z-30 w-8 -translate-x-1/2 cursor-ew-resize"
                    style={{ left: `${splitPercent}%` }}
                  >
                    <div className="mx-auto h-full w-[1.5px] bg-white/85 shadow-[0_0_12px_rgba(0,0,0,0.8)]" />
                    <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-black/55 text-white shadow-xl backdrop-blur-xl">
                      <MoveHorizontal className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* 原图 / 美化后悬浮微标 */}
                  <span className="pointer-events-none absolute bottom-20 left-3 z-30 rounded-full border border-white/15 bg-black/55 px-2.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md">
                    原图
                  </span>
                  <span className="pointer-events-none absolute bottom-20 right-3 z-30 rounded-full border border-blue-400/30 bg-blue-500/35 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
                    滤镜后
                  </span>
                </>
              )}

              {/* 超瓷晶玻璃微弱高光质感 */}
              <div className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] bg-[linear-gradient(132deg,rgba(255,255,255,0.075)_0%,transparent_26%,transparent_76%,rgba(255,255,255,0.03)_100%)]" />

              {/* ==================== iPhone 系统 UI 覆盖 ==================== */}
              {isPhone && (
                <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
                  {/* 状态栏 + 真实光学镜头灵动岛 / 经典刘海 */}
                  <div className="relative flex items-center justify-between px-6 pt-3 text-[11px] font-semibold tracking-tight text-white">
                    <span className="tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
                      {!renderOptions.homeScreenBlur ? "中国移动" : "09:41"}
                    </span>
                    {device.hasDynamicIsland && (
                      <div className="absolute left-1/2 top-2.5 flex h-[24px] w-[92px] -translate-x-1/2 items-center justify-between rounded-full bg-[#030305] px-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.85),inset_0_0_0_0.5px_rgba(255,255,255,0.09)]">
                        {/* Face ID 红外泛光感应微点 */}
                        <div className="h-[5px] w-[5px] rounded-full bg-[#120d16] ring-1 ring-white/[0.04]" />
                        {/* 前置蓝宝石光学镜头与蓝紫镀膜反光 */}
                        <div className="relative flex h-[11px] w-[11px] items-center justify-center rounded-full bg-[#060914] ring-1 ring-white/15">
                          <div className="h-[6px] w-[6px] rounded-full bg-gradient-to-br from-indigo-400/50 via-sky-900/80 to-black" />
                          <div className="absolute left-[2.5px] top-[2px] h-[2px] w-[2px] rounded-full bg-cyan-200/80" />
                        </div>
                      </div>
                    )}
                    {!device.hasDynamicIsland && device.hasNotch && (
                      <div className="absolute left-1/2 top-0 flex h-[22px] w-[114px] -translate-x-1/2 items-center justify-center gap-2 rounded-b-[16px] bg-black">
                        <div className="h-[3px] w-9 rounded-full bg-zinc-800" />
                        <div className="h-[7px] w-[7px] rounded-full bg-[#0b1020] ring-1 ring-white/10" />
                      </div>
                    )}
                    <div className="relative flex items-center gap-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
                      <StatusSignalBars />
                      <Wifi className="h-3 w-3 stroke-[2.2]" />
                      <StatusBattery />
                      {/* iOS 锁屏右上角控制中心提示短线 */}
                      {!renderOptions.homeScreenBlur && (
                        <div className="absolute -bottom-[6px] left-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full bg-white/45" />
                      )}
                    </div>
                  </div>

                  {/* 锁屏模式 vs 精致主屏图标模式 */}
                  {!renderOptions.homeScreenBlur ? (
                    <>
                      <div className="mt-4 flex flex-col items-center text-center">
                        {/* Face ID 小锁图标 */}
                        <svg
                          width="11"
                          height="13"
                          viewBox="0 0 12 14"
                          fill="none"
                          className="mb-1.5 opacity-90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
                          style={{ color: clockColor }}
                        >
                          <path
                            d="M3.2 6V4.4C3.2 2.85 4.45 1.6 6 1.6C7.55 1.6 8.8 2.85 8.8 4.4V6"
                            stroke="currentColor"
                            strokeWidth="1.45"
                            strokeLinecap="round"
                          />
                          <rect x="2" y="5.8" width="8" height="6.4" rx="1.8" fill="currentColor" />
                        </svg>

                        <span
                          className="text-[12.5px] font-medium tracking-[0.02em] drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]"
                          style={{ color: clockColor, opacity: 0.92 }}
                        >
                          11月22日 星期日 · 十月十三
                        </span>
                        <span
                          className={`mt-0.5 tabular-nums text-[68px] leading-[0.96] drop-shadow-[0_6px_22px_rgba(0,0,0,0.34)] transition-all ${CLOCK_FONT_CLASS[clockFont]}`}
                          style={{
                            color: clockColor,
                            opacity: depthHint ? 0.88 : 0.96,
                          }}
                        >
                          09:41
                        </span>

                        {/* 苹果原生单色玻璃锁屏小组件 */}
                        <div className="mt-3 flex items-center gap-2.5">
                          {/* 圆形天气组件 */}
                          <div className="flex h-10 w-10 flex-col items-center justify-center rounded-full border border-white/20 bg-white/[0.12] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)] backdrop-blur-xl">
                            <Sun className="h-3 w-3 opacity-90" />
                            <span className="mt-0.5 text-[9.5px] font-semibold leading-none tabular-nums">
                              22°
                            </span>
                          </div>

                          {/* 圆形环形电量组件 */}
                          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/[0.12] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)] backdrop-blur-xl">
                            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="2.6"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                fill="none"
                                stroke="rgba(255,255,255,0.92)"
                                strokeWidth="2.6"
                                strokeDasharray="88"
                                strokeDashoffset="8"
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-[9px] font-semibold tabular-nums">94</span>
                          </div>

                          {/* 胶囊日程天气组件 */}
                          <div className="flex h-10 items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.12] px-3 text-left text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-xl">
                            <CloudSun className="h-3.5 w-3.5 opacity-90" />
                            <div className="leading-tight">
                              <div className="text-[9.5px] font-semibold">晴朗微风</div>
                              <div className="text-[8px] opacity-75">空气优 · 适合扫街</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 底部手电筒 & 相机精致毛玻璃按钮 */}
                      <div className="mt-auto px-7 pb-3.5">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/25 bg-black/32 text-white shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3),0_8px_18px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
                            <Flashlight className="h-[17px] w-[17px] stroke-[1.8]" />
                          </div>
                          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/25 bg-black/32 text-white shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3),0_8px_18px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
                            <Camera className="h-[17px] w-[17px] stroke-[1.8]" />
                          </div>
                        </div>
                        <div className="mx-auto h-[4.5px] w-[114px] rounded-full bg-white/88 shadow-sm" />
                      </div>
                    </>
                  ) : (
                    /* 精致苹果主屏 App 网格预览 */
                    <div className="flex flex-1 flex-col justify-between px-5 pb-3.5 pt-7">
                      <div className="space-y-4">
                        {/* 顶部 2x2 玻璃大组件 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex h-[96px] flex-col justify-between rounded-[20px] border border-white/20 bg-white/15 p-3 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)] backdrop-blur-2xl">
                            <div className="flex items-center justify-between text-[10px] opacity-85">
                              <span>上海</span>
                              <Sun className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="text-2xl font-light leading-none tabular-nums">22°</div>
                              <div className="mt-1 text-[9px] opacity-80">晴 · 最高24°</div>
                            </div>
                          </div>
                          <div className="flex h-[96px] flex-col justify-between rounded-[20px] border border-white/20 bg-white/15 p-3 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)] backdrop-blur-2xl">
                            <div className="text-[10px] font-semibold text-rose-300">星期日</div>
                            <div>
                              <div className="text-2xl font-semibold leading-none tabular-nums">22</div>
                              <div className="mt-1 text-[9px] opacity-80">今日无待办日程</div>
                            </div>
                          </div>
                        </div>

                        {/* 精致图标网格 */}
                        <div className="grid grid-cols-4 gap-3">
                          {HOME_APPS.map((app) => {
                            const Icon = app.icon;
                            return (
                              <div key={app.name} className="flex flex-col items-center gap-1">
                                <div
                                  className={`flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br shadow-[0_6px_14px_rgba(0,0,0,0.32),inset_0_1px_1px_rgba(255,255,255,0.35)] ${app.bg}`}
                                >
                                  <Icon className="h-5 w-5 stroke-[1.8]" />
                                </div>
                                <span className="text-[9px] font-medium text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">
                                  {app.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 主屏毛玻璃 Dock */}
                      <div className="space-y-2.5">
                        <div className="flex justify-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
                        </div>
                        <div className="mx-auto flex w-full items-center justify-around rounded-[26px] border border-white/20 bg-white/18 px-3 py-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl">
                          {[
                            { bg: "from-emerald-400 to-green-600", icon: MessageCircle },
                            { bg: "from-sky-400 to-blue-600", icon: Compass },
                            { bg: "from-rose-500 to-pink-600", icon: Music2 },
                            { bg: "from-zinc-400 to-zinc-600", icon: Camera },
                          ].map((dockItem, idx) => {
                            const Icon = dockItem.icon;
                            return (
                              <div
                                key={idx}
                                className={`flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br text-white shadow-md ${dockItem.bg}`}
                              >
                                <Icon className="h-5 w-5 stroke-[1.8]" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ==================== iPad 系统 UI 覆盖 ==================== */}
              {isPad && (
                <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
                  <div className="flex items-center justify-between text-[11px] font-medium text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]">
                    <span className="tabular-nums">09:41 周日 11月22日</span>
                    <div className="flex items-center gap-1.5">
                      <Wifi className="h-3 w-3" />
                      <span className="text-[10px] tabular-nums">100%</span>
                      <StatusBattery />
                    </div>
                  </div>

                  {!renderOptions.homeScreenBlur ? (
                    <div className="mb-auto mt-6 text-center">
                      <div
                        className={`tabular-nums text-[58px] leading-none drop-shadow-[0_5px_18px_rgba(0,0,0,0.35)] ${CLOCK_FONT_CLASS[clockFont]}`}
                        style={{ color: clockColor }}
                      >
                        09:41
                      </div>
                      <div className="mt-1 text-xs text-white/85">11月22日 星期日</div>
                    </div>
                  ) : (
                    <div className="mx-auto mb-1.5 mt-auto flex items-center gap-2.5 rounded-[20px] border border-white/25 bg-white/18 px-3.5 py-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)] backdrop-blur-2xl">
                      {HOME_APPS.slice(0, 6).map((app) => {
                        const Icon = app.icon;
                        return (
                          <div
                            key={app.name}
                            className={`flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br shadow-sm ${app.bg}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mx-auto h-1 w-28 rounded-full bg-white/80" />
                </div>
              )}

              {/* ==================== Mac 系统 UI 覆盖 ==================== */}
              {isMac && (
                <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
                  {/* macOS 顶部半透明毛玻璃菜单栏 */}
                  <div className="relative flex h-6 items-center justify-between border-b border-white/[0.06] bg-black/28 px-3.5 text-[10px] font-medium text-white/95 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold"></span>
                      <span className="font-semibold">访达</span>
                      <span className="opacity-80">文件</span>
                      <span className="opacity-80">编辑</span>
                      <span className="opacity-80">显示</span>
                      <span className="hidden opacity-80 sm:inline">前往</span>
                    </div>
                    {device.hasNotch && (
                      <div className="absolute left-1/2 top-0 flex h-[18px] w-24 -translate-x-1/2 items-center justify-center rounded-b-lg bg-black">
                        <div className="h-[5px] w-[5px] rounded-full bg-[#0d1428] ring-1 ring-white/10" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Wifi className="h-3 w-3" />
                      <SlidersHorizontal className="h-2.5 w-2.5 opacity-85" />
                      <span className="tabular-nums">11月22日 周日 09:41</span>
                    </div>
                  </div>

                  {/* macOS 底部精雕 Dock */}
                  <div className="mb-2.5 flex justify-center">
                    <div className="flex items-center gap-2 rounded-[18px] border border-white/25 bg-white/15 px-3 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.28)] backdrop-blur-2xl">
                      {HOME_APPS.slice(0, 7).map((app, idx) => {
                        const Icon = app.icon;
                        return (
                          <div key={app.name} className="flex flex-col items-center gap-0.5">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-br shadow-sm ${app.bg}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span
                              className={`h-[3px] w-[3px] rounded-full ${
                                idx < 3 ? "bg-white/85" : "bg-transparent"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 安全区参考辅助线 ==================== */}
              {showSafeZones && (
                <div className="pointer-events-none absolute inset-0 z-20">
                  <div
                    className="absolute inset-x-0 top-0 border-b border-dashed border-rose-400/75 bg-rose-500/10"
                    style={{ height: `${device.safeZones.topClearPercent}%` }}
                  />
                  {device.safeZones.clockZoneTopPercent && device.safeZones.clockZoneBottomPercent && (
                    <div
                      className="absolute inset-x-3 flex items-end justify-end rounded-xl border border-dashed border-amber-300/80 bg-amber-400/8 p-1.5"
                      style={{
                        top: `${device.safeZones.clockZoneTopPercent}%`,
                        height: `${
                          device.safeZones.clockZoneBottomPercent -
                          device.safeZones.clockZoneTopPercent
                        }%`,
                      }}
                    >
                      <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] text-amber-200 backdrop-blur">
                        锁屏时钟留白安全区
                      </span>
                    </div>
                  )}
                  {device.safeZones.depthSweetSpotPercent && depthHint && (
                    <div
                      className="absolute inset-x-0 border-t-[1.5px] border-dotted border-cyan-300/90"
                      style={{ top: `${device.safeZones.depthSweetSpotPercent}%` }}
                    >
                      <span className="ml-2.5 inline-block -translate-y-5 rounded-md bg-cyan-950/85 px-1.5 py-0.5 text-[9px] text-cyan-200 ring-1 ring-cyan-400/35 backdrop-blur">
                        iOS 景深黄金线
                      </span>
                    </div>
                  )}
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-start justify-end border-t border-dashed border-sky-400/70 bg-sky-500/8 p-1"
                    style={{ height: `${device.safeZones.bottomClearPercent}%` }}
                  >
                    <span className="rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] text-sky-200 backdrop-blur">
                      {isMac ? "Dock 避让区" : "底部按钮避让区"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MacBook Pro 一体成型铝合金底座 + 开合凹槽 */}
        {isMac && (
          <div className="relative flex h-[14px] w-[108%] max-w-[700px] items-start justify-center rounded-b-[14px] bg-gradient-to-b from-zinc-400/85 via-zinc-600/90 to-zinc-800 shadow-[0_14px_30px_rgba(0,0,0,0.7)]">
            <div className="h-[5px] w-24 rounded-b-full bg-zinc-900/75 shadow-inner" />
          </div>
        )}
      </div>

      {/* 底部一体化极简参数胶囊 */}
      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-full border border-white/[0.09] bg-black/45 px-4 py-1.5 text-[11px] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <span className="font-medium text-white">
          {device.name}
          {device.screenSize ? ` · ${device.screenSize}` : ""}
          {isPad ? (renderOptions.ipadLandscape ? " 横屏" : " 竖屏") : ""}
        </span>
        {device.tierLabel && (
          <>
            <span className="h-3 w-px bg-white/15" />
            <span
              className={
                device.tier === "pro-max"
                  ? "font-medium text-amber-300"
                  : device.tier === "pro"
                    ? "font-medium text-blue-300"
                    : "font-medium text-emerald-300"
              }
            >
              {device.tierLabel}
              {device.hasNotch && isPhone ? " · 刘海屏" : isPhone ? " · 灵动岛" : ""}
            </span>
          </>
        )}
        <span className="h-3 w-px bg-white/15" />
        <span className="font-mono text-zinc-300">
          {realW} × {realH}
        </span>
        <span className="hidden h-3 w-px bg-white/15 sm:inline-block" />
        <span className="hidden items-center gap-1 text-zinc-400 sm:inline-flex">
          <GripHorizontal className="h-3 w-3" />
          {compareMode ? "左右拖动分割线对比" : "画布内可直接拖拽构图"}
        </span>
      </div>
    </div>
  );
}
