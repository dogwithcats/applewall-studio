"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Sparkles,
  Smartphone,
  Tablet,
  Laptop,
  Layers,
  Download,
  Eye,
  SlidersHorizontal,
  MessageSquareHeart,
  RotateCw,
  Image as ImageIcon,
  Share2,
  CheckCircle2,
  Film,
  Shuffle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SplitSquareHorizontal,
} from "lucide-react";
import {
  APPLE_DEVICES,
  IPHONE_SERIES_LIST,
  IPHONE_TIER_LIST,
  findIPhoneDevice,
  getDeviceById,
  type DeviceFamily,
  type IPhoneSeries,
  type IPhoneTier,
} from "@/lib/devices";
import {
  FILTER_CATEGORIES,
  STYLE_PRESETS,
  getPresetById,
  type ScenarioType,
} from "@/lib/presets";
import { DEFAULT_FINE_TUNE, type FilmFineTune } from "@/lib/film-lut";
import { SAMPLE_PHOTOS, getSampleImageUrl } from "@/lib/samples";
import {
  exportDeviceWallpaper,
  exportShowcasePoster,
  renderFilterThumbnails,
  type WallpaperRenderOptions,
} from "@/lib/canvas-engine";
import {
  DevicePreview,
  type ChassisFinish,
  type ClockFontStyle,
} from "./DevicePreview";
import { SuitePreview } from "./SuitePreview";
import { FeedbackModal } from "./FeedbackModal";
import { InspirationStrip } from "./InspirationStrip";

const CLOCK_COLORS = [
  { label: "纯白", value: "#ffffff" },
  { label: "暖金", value: "#fde68a" },
  { label: "冰蓝", value: "#bae6fd" },
  { label: "樱粉", value: "#fbcfe8" },
  { label: "星曜黑", value: "#18181b" },
];

const CHASSIS_FINISHES: { id: ChassisFinish; label: string; color: string }[] = [
  { id: "natural", label: "原色钛", color: "#9a968e" },
  { id: "desert", label: "沙漠金", color: "#cfa987" },
  { id: "black", label: "暗夜黑", color: "#2b2d34" },
  { id: "silver", label: "星光银", color: "#d7dae2" },
];

export function StudioApp() {
  // === 1. 图片素材状态 ===
  const [sourceDataUrl, setSourceDataUrl] = useState<string>("");
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [filterThumbs, setFilterThumbs] = useState<Record<string, string>>({});
  const [activeSampleId, setActiveSampleId] = useState<string>(SAMPLE_PHOTOS[0].id);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // === 2. 内置富士胶片 & 壁纸滤镜状态 ===
  const [scenario, setScenario] = useState<ScenarioType>("fuji_film");
  const [presetId, setPresetId] = useState<string>("fuji-classic-neg");
  const [strength, setStrength] = useState<number>(0.86);
  const [fineTune, setFineTune] = useState<FilmFineTune>(DEFAULT_FINE_TUNE);
  const [showFineTune, setShowFineTune] = useState<boolean>(false);

  // === 3. 苹果设备与视图模式 ===
  const [viewMode, setViewMode] = useState<"single" | "suite">("single");
  const [deviceFamily, setDeviceFamily] = useState<DeviceFamily>("iphone");
  const [deviceId, setDeviceId] = useState<string>("iphone-18-pro-max");
  const [ipadLandscape, setIpadLandscape] = useState<boolean>(false);
  const [chassisFinish, setChassisFinish] = useState<ChassisFinish>("natural");

  // === 4. 构图、安全区与锁屏微调 ===
  const [zoom, setZoom] = useState<number>(1.04);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [topBreathingRoom, setTopBreathingRoom] = useState<number>(0.14);
  const [clockScrim, setClockScrim] = useState<number>(0.18);
  const [homeScreenBlur, setHomeScreenBlur] = useState<boolean>(false);
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [depthHint, setDepthHint] = useState<boolean>(true);
  const [clockFont, setClockFont] = useState<ClockFontStyle>("sf-bold");
  const [clockColor, setClockColor] = useState<string>("#ffffff");

  // === 5. 反馈弹窗与 Toast 提示 ===
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const preset = useMemo(() => getPresetById(presetId), [presetId]);
  const device = useMemo(() => getDeviceById(deviceId), [deviceId]);
  const filteredPresets = useMemo(
    () => STYLE_PRESETS.filter((p) => p.scenario === scenario),
    [scenario]
  );
  const familyDevices = useMemo(
    () => APPLE_DEVICES.filter((d) => d.family === deviceFamily),
    [deviceFamily]
  );

  const hasCustomFineTune = useMemo(
    () =>
      fineTune.warmth !== 0 ||
      fineTune.exposure !== 0 ||
      fineTune.grainOverride !== undefined ||
      fineTune.bloomOverride !== undefined ||
      fineTune.vignetteOverride !== undefined,
    [fineTune]
  );

  const effectiveGrainDisplay =
    fineTune.grainOverride !== undefined
      ? fineTune.grainOverride
      : (preset.localRecipe.grain ?? 0) * strength;
  const effectiveBloomDisplay =
    fineTune.bloomOverride !== undefined
      ? fineTune.bloomOverride
      : (preset.localRecipe.bloom ?? 0) * strength;
  const effectiveVignetteDisplay =
    fineTune.vignetteOverride !== undefined
      ? fineTune.vignetteOverride
      : (preset.localRecipe.vignette ?? 0) * strength;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  // 初始化默认演示照片
  useEffect(() => {
    const sampleUrl = getSampleImageUrl(SAMPLE_PHOTOS[0].id);
    setSourceDataUrl(sampleUrl);
  }, []);

  // 加载当前图像为 HTMLImageElement 并即时生成全部 22 款滤镜的实时缩略图
  useEffect(() => {
    if (!sourceDataUrl) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      setLoadedImage(img);
      try {
        const thumbs = renderFilterThumbnails(img, STYLE_PRESETS);
        if (!cancelled) setFilterThumbs(thumbs);
      } catch {
        // 忽略极端跨域情况下的缩略图生成失败
      }
    };
    img.src = sourceDataUrl;
    return () => {
      cancelled = true;
    };
  }, [sourceDataUrl]);

  function handleSwitchFamily(family: DeviceFamily) {
    setDeviceFamily(family);
    setViewMode("single");
    const first = APPLE_DEVICES.find((d) => d.family === family);
    if (first) setDeviceId(first.id);
    if (family === "mac") {
      setTopBreathingRoom((v) => Math.min(v, 0.04));
      setHomeScreenBlur(false);
    }
  }

  function handleSelectPreset(id: string) {
    const p = getPresetById(id);
    setPresetId(p.id);
    setScenario(p.scenario);
    setStrength(p.defaultStrength);
    setFineTune(DEFAULT_FINE_TUNE);
    if (deviceFamily === "iphone" && p.localRecipe.recommendedTopBreathing !== undefined) {
      setTopBreathingRoom(p.localRecipe.recommendedTopBreathing);
    }
    setCompareMode(false);
  }

  function handleRandomPreset() {
    const candidates = STYLE_PRESETS.filter((p) => p.id !== presetId);
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    if (!picked) return;
    handleSelectPreset(picked.id);
    showToast(`已切换至「${picked.name}」(${picked.filmCode})`);
  }

  function handleSelectSample(sampleId: string) {
    const meta = SAMPLE_PHOTOS.find((s) => s.id === sampleId);
    const url = getSampleImageUrl(sampleId);
    setActiveSampleId(sampleId);
    setSourceDataUrl(url);
    setZoom(1.04);
    setOffsetX(0);
    setOffsetY(0);
    if (meta) {
      setScenario(meta.scenario);
      handleSelectPreset(meta.recommendedPresetId);
    }
  }

  function handleFileUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("请上传 JPG / PNG / WebP / HEIC 图片文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setActiveSampleId("");
      setSourceDataUrl(dataUrl);
      setZoom(1.02);
      setOffsetX(0);
      setOffsetY(0);
      showToast("照片已加载！所有富士滤镜已实时生成预览缩略图");
    };
    reader.readAsDataURL(file);
  }

  const renderOptions: WallpaperRenderOptions = useMemo(
    () => ({
      preset,
      strength,
      fineTune,
      zoom,
      offsetX,
      offsetY,
      topBreathingRoom,
      clockScrim,
      homeScreenBlur,
      ipadLandscape,
    }),
    [
      preset,
      strength,
      fineTune,
      zoom,
      offsetX,
      offsetY,
      topBreathingRoom,
      clockScrim,
      homeScreenBlur,
      ipadLandscape,
    ]
  );

  function handleExportCurrent(asHomeScreen = false) {
    if (!loadedImage) return;
    exportDeviceWallpaper(loadedImage, device, {
      ...renderOptions,
      homeScreenBlur: asHomeScreen,
      bypassStyle: false,
    });
    showToast(
      `已导出 ${device.name} ${asHomeScreen ? "主屏柔焦配对" : "高清原生"} PNG 壁纸！`
    );
  }

  function handleExportPoster() {
    if (!loadedImage) return;
    exportShowcasePoster(loadedImage, { ...renderOptions, bypassStyle: false });
    showToast("已生成小红书/朋友圈高颜值带壳晒图海报！");
  }

  function handleApplyRemix(targetPresetId: string, targetScenario: ScenarioType, sampleId: string) {
    setScenario(targetScenario);
    handleSelectPreset(targetPresetId);
    if (!sourceDataUrl || activeSampleId) {
      const url = getSampleImageUrl(sampleId);
      setActiveSampleId(sampleId);
      setSourceDataUrl(url);
    }
    showToast("已一键套用同款富士配方与构图参数，现在可上传你的照片试试！");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#06070b] text-zinc-100">
      {/* 顶部微光氛围背景 */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[440px] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_65%)]" />

      {/* ==================== 顶部导航栏 ==================== */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#06070b]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1460px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-b from-zinc-100 to-zinc-300 text-base font-bold text-black shadow-[0_6px_18px_rgba(255,255,255,0.16)]">
              
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold tracking-tight text-white">
                  果壁 Studio
                </span>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  免费纯本地 · 零水印
                </span>
              </div>
              <p className="hidden text-[11px] text-zinc-400 sm:block">
                专为 iPhone / iPad / Mac 打造的富士胶片滤镜与三端壁纸工作台
              </p>
            </div>
          </div>

          <div className="hidden items-center rounded-full border border-white/[0.09] bg-white/[0.03] p-1 md:flex">
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                viewMode === "single"
                  ? "bg-white text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              单设备精调
            </button>
            <button
              type="button"
              onClick={() => setViewMode("suite")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                viewMode === "suite"
                  ? "bg-white text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              全家桶三端联动
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-300 lg:flex">
              <Film className="h-3.5 w-3.5 text-amber-300" />
              <span>内置 {STYLE_PRESETS.length} 款胶片滤镜 · 纯本地毫秒级渲染</span>
            </div>

            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-white/[0.12]"
            >
              <MessageSquareHeart className="h-3.5 w-3.5 text-blue-400" />
              <span>提建议</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== 主三栏工作台 ==================== */}
      <main className="mx-auto max-w-[1460px] px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ---------- 左侧栏：上传照片 + 内置富士胶片与壁纸滤镜 ---------- */}
          <aside className="space-y-4 lg:col-span-3">
            {/* 1. 照片上传区 */}
            <div className="glass-panel rounded-[26px] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                  <ImageIcon className="h-4 w-4 text-blue-400" />
                  1. 上传你的照片
                </h2>
                <span className="text-[11px] text-zinc-500">本地直出护隐私</span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-3.5 text-center transition ${
                  isDragging
                    ? "border-blue-400 bg-blue-500/15"
                    : "border-white/15 bg-black/25 hover:border-white/30 hover:bg-white/[0.04]"
                }`}
              >
                <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
                  <Upload className="h-4 w-4 text-zinc-200" />
                </div>
                <p className="text-xs font-medium text-zinc-200">点击或拖拽照片到这里</p>
                <p className="mt-0.5 text-[10.5px] text-zinc-500">
                  支持人像 / 萌宠 / 风景原图，零上传延迟
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
              </div>

              {/* 带真实缩略图的内置高清样图 */}
              <div className="mt-3">
                <p className="mb-2 text-[11px] text-zinc-400">内置高清样图一键试玩：</p>
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_PHOTOS.map((s) => {
                    const selected = activeSampleId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSample(s.id)}
                        className={`group overflow-hidden rounded-xl border text-left transition ${
                          selected
                            ? "border-white/60 ring-2 ring-blue-500/40"
                            : "border-white/10 opacity-80 hover:border-white/25 hover:opacity-100"
                        }`}
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
                          <img
                            src={s.imagePath}
                            alt={s.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="bg-black/50 px-1.5 py-1">
                          <div className="truncate text-[10px] font-medium text-zinc-100">
                            {s.title}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. 内置富士胶片 & 壁纸滤镜库 */}
            <div className="glass-panel rounded-[26px] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                  <Film className="h-4 w-4 text-amber-300" />
                  2. 内置胶片与壁纸滤镜
                </h2>
                <button
                  type="button"
                  onClick={handleRandomPreset}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-medium text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
                >
                  <Shuffle className="h-3 w-3 text-amber-300" />
                  随机
                </button>
              </div>

              {/* 三大滤镜分类分段切换 */}
              <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-white/[0.08] bg-black/45 p-1">
                {FILTER_CATEGORIES.map((cat) => {
                  const count = STYLE_PRESETS.filter((p) => p.scenario === cat.id).length;
                  const active = scenario === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setScenario(cat.id);
                      }}
                      className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
                        active
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span>{cat.shortLabel}</span>
                      <span
                        className={`text-[9.5px] tabular-nums ${
                          active ? "text-zinc-600" : "text-zinc-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 2 列实时缩略图滤镜网格 */}
              <div className="grid max-h-[348px] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
                {filteredPresets.map((item) => {
                  const selected = item.id === presetId;
                  const thumb = filterThumbs[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPreset(item.id)}
                      className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition ${
                        selected
                          ? "border-blue-400/80 bg-blue-500/[0.14] ring-1 ring-blue-400/50"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]"
                      }`}
                    >
                      {/* 实时照片滤镜预览图 */}
                      <div
                        className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-900"
                        style={
                          !thumb
                            ? {
                                background: `linear-gradient(135deg, ${item.swatch[0]}, ${item.swatch[1]})`,
                              }
                            : undefined
                        }
                      >
                        {thumb && (
                          <img
                            src={thumb}
                            alt={item.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />

                        {/* 左上胶片代号徽章（富士风格） */}
                        <span
                          className={`absolute left-1.5 top-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider backdrop-blur-md ${
                            selected
                              ? "border-blue-300/60 bg-blue-500/80 text-white"
                              : "border-white/20 bg-black/60 text-amber-200"
                          }`}
                        >
                          {item.filmCode}
                        </span>

                        {item.badge && (
                          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[8.5px] font-medium text-zinc-100 backdrop-blur-md">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* 滤镜名称与配方标签 */}
                      <div className="px-2 py-1.5">
                        <div className="truncate text-[11.5px] font-semibold text-white">
                          {item.shortName}
                        </div>
                        <div className="mt-0.5 truncate text-[9.5px] text-zinc-400">
                          {item.recipeTag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 当前选中滤镜详情卡 */}
              <div className="mt-3 rounded-2xl border border-white/[0.07] bg-black/35 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/30"
                      style={{
                        background: `linear-gradient(135deg, ${preset.swatch[0]}, ${preset.swatch[1]})`,
                      }}
                    />
                    <span className="truncate text-xs font-semibold text-white">
                      {preset.name}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] text-amber-200">
                    {preset.filmCode}
                  </span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-zinc-400">
                  {preset.subtitle}
                </p>
              </div>

              {/* 滤镜强度 + 可展开胶片质感微调 */}
              <div className="mt-3.5 space-y-3 border-t border-white/[0.08] pt-3.5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300">滤镜浓度（0% 为原图）</span>
                    <span className="font-mono text-zinc-200">{Math.round(strength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={strength}
                    onChange={(e) => setStrength(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* 胶片质感微调抽屉 */}
                <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setShowFineTune((v) => !v)}
                    className="flex w-full items-center justify-between text-[11.5px] font-medium text-zinc-200 hover:text-white"
                  >
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-amber-300" />
                      胶片质感微调（色温 / 颗粒 / 黑柔）
                      {hasCustomFineTune && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      )}
                    </span>
                    {showFineTune ? (
                      <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                  </button>

                  {showFineTune && (
                    <div className="mt-3 space-y-2.5 border-t border-white/[0.06] pt-2.5">
                      <div>
                        <div className="mb-1 flex justify-between text-[10.5px]">
                          <span className="text-zinc-400">色温偏移 (WB 暖/冷)</span>
                          <span className="font-mono text-zinc-300">
                            {fineTune.warmth > 0
                              ? `暖 +${fineTune.warmth}`
                              : fineTune.warmth < 0
                                ? `冷 ${fineTune.warmth}`
                                : "默认 0"}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-30}
                          max={30}
                          step={1}
                          value={fineTune.warmth}
                          onChange={(e) =>
                            setFineTune((prev) => ({ ...prev, warmth: Number(e.target.value) }))
                          }
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-[10.5px]">
                          <span className="text-zinc-400">曝光补偿 (EV)</span>
                          <span className="font-mono text-zinc-300">
                            {fineTune.exposure > 0 ? `+${fineTune.exposure}` : fineTune.exposure}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-25}
                          max={25}
                          step={1}
                          value={fineTune.exposure}
                          onChange={(e) =>
                            setFineTune((prev) => ({ ...prev, exposure: Number(e.target.value) }))
                          }
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-[10.5px]">
                          <span className="text-zinc-400">银盐颗粒</span>
                          <span className="font-mono text-zinc-300">
                            {Math.round(effectiveGrainDisplay * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={0.65}
                          step={0.01}
                          value={Math.min(0.65, effectiveGrainDisplay)}
                          onChange={(e) =>
                            setFineTune((prev) => ({
                              ...prev,
                              grainOverride: Number(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-[10.5px]">
                          <span className="text-zinc-400">黑柔光晕 (Pro-Mist)</span>
                          <span className="font-mono text-zinc-300">
                            {Math.round(effectiveBloomDisplay * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={0.85}
                          step={0.01}
                          value={Math.min(0.85, effectiveBloomDisplay)}
                          onChange={(e) =>
                            setFineTune((prev) => ({
                              ...prev,
                              bloomOverride: Number(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-[10.5px]">
                          <span className="text-zinc-400">暗角氛围</span>
                          <span className="font-mono text-zinc-300">
                            {Math.round(effectiveVignetteDisplay * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={0.75}
                          step={0.01}
                          value={Math.min(0.75, effectiveVignetteDisplay)}
                          onChange={(e) =>
                            setFineTune((prev) => ({
                              ...prev,
                              vignetteOverride: Number(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                      </div>

                      {hasCustomFineTune && (
                        <button
                          type="button"
                          onClick={() => setFineTune(DEFAULT_FINE_TUNE)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.1] hover:text-white"
                        >
                          <RotateCcw className="h-3 w-3" />
                          恢复当前胶片默认配方
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* ---------- 中央舞台：无嵌套冗余边框的沉浸式苹果真机画廊 ---------- */}
          <section className="glass-panel studio-stage-bg relative flex flex-col justify-between overflow-hidden rounded-[28px] p-4 sm:p-6 lg:col-span-6">
            {/* 顶部设备与系列选择栏 */}
            <div className="relative z-20 mb-4 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/[0.09] bg-black/45 p-1 backdrop-blur-xl">
                {(
                  [
                    { id: "iphone", label: "iPhone", icon: Smartphone },
                    { id: "ipad", label: "iPad", icon: Tablet },
                    { id: "mac", label: "Mac", icon: Laptop },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = viewMode === "single" && deviceFamily === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSwitchFamily(item.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                        active ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setViewMode("suite")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    viewMode === "suite"
                      ? "bg-blue-500 text-white shadow"
                      : "text-blue-300 hover:text-blue-200"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  全家桶
                </button>
              </div>

              {/* iPhone 系列 + 基础版/Pro/Pro Max 快速分段区分 */}
              {viewMode === "single" && deviceFamily === "iphone" && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={device.series || "18"}
                    onChange={(e) => {
                      const nextSeries = e.target.value as IPhoneSeries;
                      const target = findIPhoneDevice(nextSeries, device.tier || "pro-max");
                      setDeviceId(target.id);
                    }}
                    className="rounded-full border border-white/12 bg-black/55 px-3 py-1.5 text-xs font-medium text-zinc-100 backdrop-blur-xl focus:border-blue-400 focus:outline-none"
                  >
                    {IPHONE_SERIES_LIST.map((s) => (
                      <option key={s.id} value={s.id} className="bg-zinc-950">
                        {s.label}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center rounded-full border border-white/10 bg-black/50 p-0.5 backdrop-blur-xl">
                    {IPHONE_TIER_LIST.map((t) => {
                      const active = (device.tier || "pro-max") === t.id;
                      const tierStyle =
                        active && t.id === "pro-max"
                          ? "bg-amber-300 text-black font-semibold shadow"
                          : active && t.id === "pro"
                            ? "bg-blue-500 text-white font-semibold shadow"
                            : active
                              ? "bg-emerald-300 text-black font-semibold shadow"
                              : "text-zinc-400 hover:text-zinc-100";
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            const target = findIPhoneDevice(
                              (device.series || "18") as IPhoneSeries,
                              t.id as IPhoneTier
                            );
                            setDeviceId(target.id);
                          }}
                          className={`rounded-full px-2.5 py-1 text-[11px] transition ${tierStyle}`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {viewMode === "single" && deviceFamily !== "iphone" && (
                <div className="flex items-center gap-2">
                  <select
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="rounded-full border border-white/12 bg-black/55 px-3 py-1.5 text-xs text-zinc-100 backdrop-blur-xl focus:border-blue-400 focus:outline-none"
                  >
                    {familyDevices.map((d) => (
                      <option key={d.id} value={d.id} className="bg-zinc-950">
                        {d.name} ({d.width}×{d.height})
                      </option>
                    ))}
                  </select>

                  {deviceFamily === "ipad" && (
                    <button
                      type="button"
                      onClick={() => setIpadLandscape((v) => !v)}
                      className="flex items-center gap-1 rounded-full border border-white/12 bg-black/50 px-3 py-1.5 text-xs text-zinc-200 backdrop-blur-xl hover:bg-white/10"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      {ipadLandscape ? "横屏" : "竖屏"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 核心预览画布（干净开放，无冗余内边框） */}
            <div className="flex flex-1 items-center justify-center py-2">
              {viewMode === "single" ? (
                <DevicePreview
                  image={loadedImage}
                  device={device}
                  renderOptions={renderOptions}
                  showSafeZones={showSafeZones}
                  compareMode={compareMode}
                  clockFont={clockFont}
                  clockColor={clockColor}
                  depthHint={depthHint}
                  chassisFinish={chassisFinish}
                  onPanChange={(nx, ny) => {
                    setOffsetX(nx);
                    setOffsetY(ny);
                  }}
                />
              ) : (
                <SuitePreview
                  image={loadedImage}
                  renderOptions={renderOptions}
                  onExportSuccess={(label) => showToast(`已导出 ${label}！`)}
                />
              )}
            </div>

            {/* 底部悬浮玻璃工具 Dock */}
            {viewMode === "single" && (
              <div className="relative z-20 mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-white/[0.07] pt-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowSafeZones((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                      showSafeZones
                        ? "border-amber-300/50 bg-amber-400/15 text-amber-200"
                        : "border-white/10 bg-black/40 text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    安全区参考线
                  </button>

                  {deviceFamily !== "mac" && (
                    <button
                      type="button"
                      onClick={() => setHomeScreenBlur((v) => !v)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        homeScreenBlur
                          ? "border-purple-400/50 bg-purple-500/15 text-purple-200"
                          : "border-white/10 bg-black/40 text-zinc-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      {homeScreenBlur ? "主屏柔焦模式" : "主屏图标预览"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setCompareMode((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                      compareMode
                        ? "border-blue-400/60 bg-blue-500/20 text-blue-100"
                        : "border-white/10 bg-black/40 text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    <SplitSquareHorizontal className="h-3.5 w-3.5" />
                    {compareMode ? "退出分屏对比" : "滑动对比原图"}
                  </button>
                </div>

                {/* 钛金属机身配色切换 */}
                <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/40 px-2.5 py-1">
                  <span className="text-[10px] text-zinc-400">机身</span>
                  {CHASSIS_FINISHES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setChassisFinish(f.id)}
                      title={f.label}
                      className={`h-4 w-4 rounded-full border transition ${
                        chassisFinish === f.id
                          ? "scale-110 border-white ring-2 ring-white/30"
                          : "border-white/25 opacity-75 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: f.color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ---------- 右侧栏：苹果专属构图微调 + 无损导出 ---------- */}
          <aside className="space-y-4 lg:col-span-3">
            <div className="glass-panel rounded-[26px] p-4">
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                  <SlidersHorizontal className="h-4 w-4 text-sky-400" />
                  3. 构图与安全区精调
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.04);
                    setOffsetX(0);
                    setOffsetY(0);
                    setTopBreathingRoom(deviceFamily === "mac" ? 0.04 : 0.14);
                    setClockScrim(0.18);
                  }}
                  className="text-[11px] text-zinc-400 transition hover:text-white"
                >
                  重置
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className="text-zinc-300">顶部智能留白扩图</span>
                    <span className="font-mono text-zinc-200">
                      {Math.round(topBreathingRoom * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.34}
                    step={0.01}
                    value={topBreathingRoom}
                    onChange={(e) => setTopBreathingRoom(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className="text-zinc-300">锁屏时钟柔暗护眼</span>
                    <span className="font-mono text-zinc-200">{Math.round(clockScrim * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.6}
                    step={0.02}
                    value={clockScrim}
                    onChange={(e) => setClockScrim(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className="text-zinc-300">画面缩放</span>
                    <span className="font-mono text-zinc-200">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={2.1}
                    step={0.02}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-zinc-400">左右微移</span>
                      <span className="font-mono text-zinc-400">{offsetX}</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={offsetX}
                      onChange={(e) => setOffsetX(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-zinc-400">上下微移</span>
                      <span className="font-mono text-zinc-400">{offsetY}</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={offsetY}
                      onChange={(e) => setOffsetY(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {deviceFamily !== "mac" && (
                  <div className="space-y-2.5 border-t border-white/[0.08] pt-3.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-300">锁屏时间字体与色彩</span>
                      <label className="flex cursor-pointer items-center gap-1.5 text-zinc-400">
                        <input
                          type="checkbox"
                          checked={depthHint}
                          onChange={(e) => setDepthHint(e.target.checked)}
                          className="rounded"
                        />
                        景深模拟
                      </label>
                    </div>

                    <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/[0.08] bg-black/35 p-1">
                      {(
                        [
                          { id: "sf-bold", label: "粗黑" },
                          { id: "sf-rounded", label: "圆润" },
                          { id: "serif", label: "衬线" },
                          { id: "thin", label: "纤细" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setClockFont(f.id)}
                          className={`rounded-lg py-1 text-[11px] transition ${
                            clockFont === f.id
                              ? "bg-white font-medium text-black shadow"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      {CLOCK_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setClockColor(c.value)}
                          title={c.label}
                          className={`h-6 w-6 rounded-full border transition ${
                            clockColor === c.value
                              ? "scale-110 border-white ring-2 ring-blue-400/50"
                              : "border-white/25 opacity-80 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel rounded-[26px] p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-white">
                <Download className="h-4 w-4 text-emerald-400" />
                4. 免费无损导出（无水印）
              </h2>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleExportCurrent(false)}
                  disabled={!loadedImage}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-black shadow-[0_8px_24px_rgba(255,255,255,0.14)] transition hover:bg-zinc-200 disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  下载 {device.shortName} 原图
                </button>

                {deviceFamily !== "mac" && (
                  <button
                    type="button"
                    onClick={() => handleExportCurrent(true)}
                    disabled={!loadedImage}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-medium text-zinc-100 transition hover:bg-white/[0.09] disabled:opacity-40"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                    下载配套「主屏柔焦模糊壁纸」
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewMode("suite")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/25 bg-blue-500/[0.09] py-2.5 text-xs font-medium text-blue-200 transition hover:bg-blue-500/[0.16]"
                >
                  <Layers className="h-3.5 w-3.5" />
                  生成 iPhone + iPad + Mac 三端套图
                </button>

                <button
                  type="button"
                  onClick={handleExportPoster}
                  disabled={!loadedImage}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] py-2.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/[0.15] disabled:opacity-40"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  生成小红书 / 朋友圈带壳晒图海报
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
                完全免费、纯本地处理不上传云端。点右上角「提建议」即可许愿新富士配方。
              </p>
            </div>
          </aside>
        </div>

        {/* ==================== 底部灵感广场 ==================== */}
        <InspirationStrip onApplyRemix={handleApplyRemix} />
      </main>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        deviceContext={device.name}
        presetContext={preset.name}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-zinc-900/95 px-4 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
