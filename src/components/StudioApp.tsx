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
  Wand2,
  Share2,
  CheckCircle2,
  KeyRound,
  Cpu,
  ChevronDown,
  ChevronUp,
  SplitSquareHorizontal,
} from "lucide-react";
import {
  APPLE_DEVICES,
  IPHONE_SERIES_LIST,
  IPHONE_TIER_LIST,
  findIPhoneDevice,
  getDeviceById,
  getEffectiveDimensions,
  type DeviceFamily,
  type IPhoneSeries,
  type IPhoneTier,
} from "@/lib/devices";
import { STYLE_PRESETS, getPresetById, type ScenarioType } from "@/lib/presets";
import { SAMPLE_PHOTOS, getSampleImageUrl } from "@/lib/samples";
import {
  exportDeviceWallpaper,
  exportShowcasePoster,
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
import type { AIProviderName, GenerateWallpaperResponse } from "@/lib/ai/providers";

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
  const [activeImageUrl, setActiveImageUrl] = useState<string>("");
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string>(SAMPLE_PHOTOS[0].id);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // === 2. 双核心场景 & 美化预设 ===
  const [scenario, setScenario] = useState<ScenarioType>("portrait_pet");
  const [presetId, setPresetId] = useState<string>("portrait-studio-light");
  const [strength, setStrength] = useState<number>(0.42);
  const [customPrompt, setCustomPrompt] = useState<string>("");

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
  const [topBreathingRoom, setTopBreathingRoom] = useState<number>(0.12);
  const [clockScrim, setClockScrim] = useState<number>(0.18);
  const [homeScreenBlur, setHomeScreenBlur] = useState<boolean>(false);
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [depthHint, setDepthHint] = useState<boolean>(true);
  const [clockFont, setClockFont] = useState<ClockFontStyle>("sf-bold");
  const [clockColor, setClockColor] = useState<string>("#ffffff");

  // === 5. AI 生成状态 & BYOK 可选配置 ===
  const [generating, setGenerating] = useState<boolean>(false);
  const [aiMeta, setAiMeta] = useState<{
    provider: string;
    isCloudConfigured: boolean;
    remainingToday: number;
    dailyLimit: number;
  } | null>(null);
  const [lastResult, setLastResult] = useState<GenerateWallpaperResponse | null>(null);
  const [showByok, setShowByok] = useState<boolean>(false);
  const [customProvider, setCustomProvider] = useState<AIProviderName>("volcengine");
  const [customApiKey, setCustomApiKey] = useState<string>("");

  // === 6. 反馈弹窗与 Toast 提示 ===
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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  // 初始化默认演示照片 + 查询后端 AI 引擎状态
  useEffect(() => {
    const sampleUrl = getSampleImageUrl(SAMPLE_PHOTOS[0].id);
    setSourceDataUrl(sampleUrl);
    setActiveImageUrl(sampleUrl);

    fetch("/api/generate")
      .then((r) => r.json())
      .then((d) => setAiMeta(d))
      .catch(() => {});
  }, []);

  // 加载当前激活图像为 HTMLImageElement 供 Canvas 渲染
  useEffect(() => {
    if (!activeImageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoadedImage(img);
    img.src = activeImageUrl;
  }, [activeImageUrl]);

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
    setPresetId(id);
    setStrength(p.defaultStrength);
    if (deviceFamily === "iphone" && p.localRecipe.recommendedTopBreathing !== undefined) {
      setTopBreathingRoom(p.localRecipe.recommendedTopBreathing);
    }
    setCompareMode(false);
  }

  function handleSelectSample(sampleId: string) {
    const meta = SAMPLE_PHOTOS.find((s) => s.id === sampleId);
    const url = getSampleImageUrl(sampleId);
    setActiveSampleId(sampleId);
    setSourceDataUrl(url);
    setActiveImageUrl(url);
    setLastResult(null);
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
      setActiveImageUrl(dataUrl);
      setLastResult(null);
      setZoom(1.02);
      setOffsetX(0);
      setOffsetY(0);
      showToast("照片已加载！可在真机屏幕内直接拖动调整构图");
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerateAI() {
    if (!sourceDataUrl) {
      showToast("请先上传一张照片");
      return;
    }
    setGenerating(true);
    setCompareMode(false);
    try {
      const dims = getEffectiveDimensions(device, ipadLandscape);
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: sourceDataUrl,
          presetId,
          scenario,
          deviceId,
          deviceWidth: dims.width,
          deviceHeight: dims.height,
          strength,
          customPrompt,
          topBreathingRoom,
          customProvider: customApiKey.trim() ? customProvider : undefined,
          customApiKey: customApiKey.trim() || undefined,
        }),
      });
      const data = (await resp.json()) as GenerateWallpaperResponse;
      if (!resp.ok || !data.ok) {
        showToast(data.error || "生成失败，请检查网络或稍后再试");
        return;
      }

      setLastResult(data);
      if (data.resultImageUrl) {
        setActiveImageUrl(data.resultImageUrl);
      } else {
        setActiveImageUrl(sourceDataUrl);
      }
      showToast(`✨ ${data.providerLabel} 处理完成（${data.durationMs}ms）`);
    } catch {
      showToast("请求失败，已保持本地实时渲染模式");
    } finally {
      setGenerating(false);
    }
  }

  const renderOptions: WallpaperRenderOptions = useMemo(
    () => ({
      preset,
      strength,
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
      setActiveImageUrl(url);
    }
    showToast("已一键套用同款风格与构图参数，现在可上传你的照片试试！");
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
                  完全免费 · 共创测试版
                </span>
              </div>
              <p className="hidden text-[11px] text-zinc-400 sm:block">
                专为 iPhone / iPad / Mac 打造的 AI 壁纸美化与三端适配工作台
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
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <span>
                {aiMeta?.isCloudConfigured
                  ? `云端 AI (${aiMeta.provider}) · 今日剩余 ${aiMeta.remainingToday} 次`
                  : "本地即时引擎就绪（无限免费）"}
              </span>
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
          {/* ---------- 左侧栏：上传照片 + 双场景美化控制 ---------- */}
          <aside className="space-y-4 lg:col-span-3">
            {/* 1. 照片上传区 */}
            <div className="glass-panel rounded-[26px] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                  <ImageIcon className="h-4 w-4 text-blue-400" />
                  1. 上传你的照片
                </h2>
                <span className="text-[11px] text-zinc-500">本地直传护隐私</span>
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
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-4 text-center transition ${
                  isDragging
                    ? "border-blue-400 bg-blue-500/15"
                    : "border-white/15 bg-black/25 hover:border-white/30 hover:bg-white/[0.04]"
                }`}
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
                  <Upload className="h-4 w-4 text-zinc-200" />
                </div>
                <p className="text-xs font-medium text-zinc-200">点击或拖拽照片到这里</p>
                <p className="mt-0.5 text-[10.5px] text-zinc-500">支持人像 / 萌宠 / 风景原图</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
              </div>

              {/* 带真实缩略图的内置高清样图 */}
              <div className="mt-3.5">
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

            {/* 2. 双核心场景 + 风格预设 */}
            <div className="glass-panel rounded-[26px] p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-white">
                <Sparkles className="h-4 w-4 text-amber-300" />
                2. 场景与 AI 美化风格
              </h2>

              <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-black/45 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setScenario("portrait_pet");
                    const first = STYLE_PRESETS.find((p) => p.scenario === "portrait_pet");
                    if (first) handleSelectPreset(first.id);
                  }}
                  className={`rounded-lg py-1.5 text-xs font-medium transition ${
                    scenario === "portrait_pet"
                      ? "bg-white text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  真人 / 宠物保真
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScenario("scenery_art");
                    const first = STYLE_PRESETS.find((p) => p.scenario === "scenery_art");
                    if (first) handleSelectPreset(first.id);
                  }}
                  className={`rounded-lg py-1.5 text-xs font-medium transition ${
                    scenario === "scenery_art"
                      ? "bg-white text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  风景 / 艺术二创
                </button>
              </div>

              <div className="space-y-1.5">
                {filteredPresets.map((item) => {
                  const selected = item.id === presetId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPreset(item.id)}
                      className={`w-full rounded-2xl border p-2.5 text-left transition ${
                        selected
                          ? "border-blue-400/60 bg-blue-500/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                          : "border-white/[0.06] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 rounded-full ring-1 ring-white/30"
                            style={{
                              background: `linear-gradient(135deg, ${item.swatch[0]}, ${item.swatch[1]})`,
                            }}
                          />
                          <span className="text-xs font-semibold text-white">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[9.5px] text-zinc-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10.5px] leading-snug text-zinc-400">
                        {item.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* 风格强度 & 补充描述 */}
              <div className="mt-4 space-y-3 border-t border-white/[0.08] pt-3.5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300">
                      {scenario === "portrait_pet" ? "美化幅度（越低越保真）" : "艺术重绘强度"}
                    </span>
                    <span className="font-mono text-zinc-200">{Math.round(strength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.15}
                    max={0.95}
                    step={0.01}
                    value={strength}
                    onChange={(e) => setStrength(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={
                      scenario === "portrait_pet"
                        ? "选填补充：如去除背景路人、柔化暖光"
                        : "选填补充：如增加星芒、柔和粉蓝晚霞"
                    }
                    className="w-full rounded-xl border border-white/[0.09] bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-blue-400/60 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setShowByok((v) => !v)}
                    className="flex w-full items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      接入国内云端大模型 Key（选填）
                    </span>
                    {showByok ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {showByok && (
                    <div className="mt-2.5 space-y-2">
                      <select
                        value={customProvider}
                        onChange={(e) => setCustomProvider(e.target.value as AIProviderName)}
                        className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="volcengine">火山引擎 · 豆包 SeedEdit (国内保真首选)</option>
                        <option value="siliconflow">硅基流动 · Kolors / FLUX</option>
                      </select>
                      <input
                        type="password"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder="留空则使用默认免费本地引擎"
                        className="w-full rounded-lg border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={generating || !sourceDataUrl}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-blue-500 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(59,130,246,0.32)] transition hover:brightness-110 disabled:opacity-50"
                >
                  <Wand2 className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                  {generating ? "AI 正在美化与适配..." : "一键 AI 美化适配"}
                </button>
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

            {lastResult && (
              <div className="relative z-20 mt-3 rounded-2xl border border-white/[0.08] bg-black/45 px-3.5 py-2.5 text-[11px] text-zinc-400 backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-200">{lastResult.tips}</span>
                  <span className="shrink-0 text-emerald-300">✓ {lastResult.providerLabel}</span>
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
                    setTopBreathingRoom(deviceFamily === "mac" ? 0.04 : 0.12);
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
                完全免费、不加水印。点右上角「提建议」即可许愿新风格或新功能。
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
