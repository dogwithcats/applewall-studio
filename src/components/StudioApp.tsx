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
import { SAMPLE_PHOTOS, generateSampleDataUrl } from "@/lib/samples";
import {
  exportDeviceWallpaper,
  exportShowcasePoster,
  type WallpaperRenderOptions,
} from "@/lib/canvas-engine";
import { DevicePreview, type ClockFontStyle } from "./DevicePreview";
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
  const [strength, setStrength] = useState<number>(0.45);
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // === 3. 苹果设备与视图模式 ===
  const [viewMode, setViewMode] = useState<"single" | "suite">("single");
  const [deviceFamily, setDeviceFamily] = useState<DeviceFamily>("iphone");
  const [deviceId, setDeviceId] = useState<string>("iphone-18-pro-max");
  const [ipadLandscape, setIpadLandscape] = useState<boolean>(false);

  // === 4. 构图、安全区与锁屏微调 ===
  const [zoom, setZoom] = useState<number>(1.05);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [topBreathingRoom, setTopBreathingRoom] = useState<number>(0.16);
  const [clockScrim, setClockScrim] = useState<number>(0.22);
  const [homeScreenBlur, setHomeScreenBlur] = useState<boolean>(false);
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
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
    const sampleUrl = generateSampleDataUrl(SAMPLE_PHOTOS[0].id);
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

  // 切换设备大类时自动选中该大类首款机型
  function handleSwitchFamily(family: DeviceFamily) {
    setDeviceFamily(family);
    setViewMode("single");
    const first = APPLE_DEVICES.find((d) => d.family === family);
    if (first) setDeviceId(first.id);
    if (family === "mac") {
      setTopBreathingRoom((v) => Math.min(v, 0.06));
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
    setShowOriginal(false);
  }

  function handleSelectSample(sampleId: string) {
    const meta = SAMPLE_PHOTOS.find((s) => s.id === sampleId);
    const dataUrl = generateSampleDataUrl(sampleId);
    setActiveSampleId(sampleId);
    setSourceDataUrl(dataUrl);
    setActiveImageUrl(dataUrl);
    setLastResult(null);
    setZoom(1.05);
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
      showToast("照片已加载！点击左侧「AI 美化适配」或直接微调导出");
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerateAI() {
    if (!sourceDataUrl) {
      showToast("请先上传一张照片");
      return;
    }
    setGenerating(true);
    setShowOriginal(false);
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
      `已导出 ${device.name} ${asHomeScreen ? "主屏柔焦配对" : "高清原生"} PNG 壁纸！欢迎右上角提建议`
    );
  }

  function handleExportPoster() {
    if (!loadedImage) return;
    exportShowcasePoster(loadedImage, { ...renderOptions, bypassStyle: false });
    showToast("已生成小红书/朋友圈高颜值晒图海报！");
  }

  function handleApplyRemix(targetPresetId: string, targetScenario: ScenarioType, sampleId: string) {
    setScenario(targetScenario);
    handleSelectPreset(targetPresetId);
    if (!sourceDataUrl || activeSampleId) {
      const url = generateSampleDataUrl(sampleId);
      setActiveSampleId(sampleId);
      setSourceDataUrl(url);
      setActiveImageUrl(url);
    }
    showToast("已一键套用同款风格与构图参数，现在可上传你的照片试试！");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100">
      {/* 顶部氛围极光背景 */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.16),transparent_65%)]" />

      {/* ==================== 顶部导航栏 ==================== */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080d]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-bold text-white shadow-lg shadow-blue-500/25">
              
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-white">
                  果壁 Studio
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  完全免费 · 共创测试版
                </span>
              </div>
              <p className="hidden text-[11px] text-zinc-400 sm:block">
                专为 iPhone / iPad / Mac 打造的 AI 壁纸美化与三端适配工作台
              </p>
            </div>
          </div>

          {/* 视图模式快速切换 */}
          <div className="hidden items-center rounded-xl border border-white/10 bg-white/[0.04] p-1 md:flex">
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "single"
                  ? "bg-white text-black shadow"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              单设备精调预览
            </button>
            <button
              type="button"
              onClick={() => setViewMode("suite")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "suite"
                  ? "bg-white text-black shadow"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              全家桶三端联动
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-zinc-300 lg:flex">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <span>
                {aiMeta?.isCloudConfigured
                  ? `云端 AI (${aiMeta.provider}) · 今日剩余 ${aiMeta.remainingToday} 次`
                  : "本地即时引擎已就绪（0成本无限用）"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-500/25"
            >
              <MessageSquareHeart className="h-3.5 w-3.5" />
              <span>提建议</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== 主三栏工作台 ==================== */}
      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ---------- 左侧栏：上传照片 + 双场景美化控制 ---------- */}
          <aside className="space-y-4 lg:col-span-3">
            {/* 1. 照片上传区 */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  <ImageIcon className="h-4 w-4 text-blue-400" />
                  1. 上传你的照片
                </h2>
                <span className="text-[11px] text-zinc-500">支持人像/萌宠/风景</span>
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
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center transition ${
                  isDragging
                    ? "border-blue-400 bg-blue-500/15"
                    : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]"
                }`}
              >
                <Upload className="mb-2 h-5 w-5 text-zinc-300" />
                <p className="text-xs font-medium text-zinc-200">点击上传或拖拽照片到这里</p>
                <p className="mt-1 text-[11px] text-zinc-500">本地直传预览，隐私不留存</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
              </div>

              {/* 内置快速演示样图 */}
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] text-zinc-400">手头没图？点下面示例图立即体验：</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {SAMPLE_PHOTOS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSample(s.id)}
                      className={`rounded-xl border px-2 py-1.5 text-left transition ${
                        activeSampleId === s.id
                          ? "border-blue-500/70 bg-blue-500/15 text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                      }`}
                    >
                      <div className="truncate text-[11px] font-medium">{s.title}</div>
                      <div className="truncate text-[9px] opacity-70">{s.tag}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. 双核心场景 + 风格预设 */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-amber-400" />
                2. 选择场景与 AI 美化风格
              </h2>

              {/* 双场景切换 */}
              <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setScenario("portrait_pet");
                    const first = STYLE_PRESETS.find((p) => p.scenario === "portrait_pet");
                    if (first) handleSelectPreset(first.id);
                  }}
                  className={`rounded-lg py-2 text-xs font-medium transition ${
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
                  className={`rounded-lg py-2 text-xs font-medium transition ${
                    scenario === "scenery_art"
                      ? "bg-white text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  风景 / 艺术二创
                </button>
              </div>

              <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">
                {scenario === "portrait_pet"
                  ? "保真模式：低重绘强度锁定五官与宠物毛发，重点优化影棚光影、景深与锁屏留白。"
                  : "二创模式：保留原图构图骨架，大胆重塑色彩笔触与苹果级光影氛围。"}
              </p>

              {/* 风格卡片列表 */}
              <div className="space-y-2">
                {filteredPresets.map((item) => {
                  const selected = item.id === presetId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPreset(item.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        selected
                          ? "border-blue-500/80 bg-blue-500/12 shadow-[0_0_24px_rgba(59,130,246,0.12)]"
                          : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
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
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-200">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-snug text-zinc-400">
                        {item.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* 风格强度 & 补充描述 */}
              <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300">
                      {scenario === "portrait_pet" ? "美化幅度（越低越保真）" : "艺术重绘强度"}
                    </span>
                    <span className="font-mono text-blue-300">{Math.round(strength * 100)}%</span>
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
                  <label className="mb-1 block text-[11px] text-zinc-400">
                    自定义补充描述（选填，用于云端 AI）
                  </label>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={
                      scenario === "portrait_pet"
                        ? "如：去除背景路人，天空变成柔和粉蓝晚霞"
                        : "如：增加微弱流星雨和柔和丁达尔光柱"
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-blue-500/60 focus:outline-none"
                  />
                </div>

                {/* 可选 BYOK 折叠区 */}
                <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setShowByok((v) => !v)}
                    className="flex w-full items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      接入国内云端大模型 Key（选填）
                    </span>
                    {showByok ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  <Wand2 className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                  {generating ? "AI 正在美化与适配..." : "一键 AI 美化适配"}
                </button>
              </div>
            </div>
          </aside>

          {/* ---------- 中央舞台：苹果设备切换与真机预览 ---------- */}
          <section className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:p-6 lg:col-span-6">
            {/* 顶部设备选择条 */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
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
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "bg-white text-black shadow"
                          : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.09]"
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
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === "suite"
                      ? "bg-blue-500 text-white shadow"
                      : "border border-blue-500/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  全家桶三端
                </button>
              </div>

              {/* 具体型号子选择：iPhone 支持按代数 + 基础版/Pro/Pro Max 快速区分 */}
              {viewMode === "single" && deviceFamily === "iphone" && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={device.series || "18"}
                    onChange={(e) => {
                      const nextSeries = e.target.value as IPhoneSeries;
                      const target = findIPhoneDevice(nextSeries, device.tier || "pro-max");
                      setDeviceId(target.id);
                    }}
                    className="rounded-xl border border-white/12 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 focus:border-blue-500 focus:outline-none"
                  >
                    {IPHONE_SERIES_LIST.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center rounded-xl border border-white/12 bg-black/40 p-0.5">
                    {IPHONE_TIER_LIST.map((t) => {
                      const active = (device.tier || "pro-max") === t.id;
                      const tierStyle =
                        active && t.id === "pro-max"
                          ? "bg-amber-400 text-black font-semibold shadow"
                          : active && t.id === "pro"
                            ? "bg-blue-500 text-white font-semibold shadow"
                            : active
                              ? "bg-emerald-400 text-black font-semibold shadow"
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
                          className={`rounded-lg px-2.5 py-1 text-[11px] transition ${tierStyle}`}
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
                    className="rounded-xl border border-white/12 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-blue-500 focus:outline-none"
                  >
                    {familyDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.width}×{d.height})
                      </option>
                    ))}
                  </select>

                  {deviceFamily === "ipad" && (
                    <button
                      type="button"
                      onClick={() => setIpadLandscape((v) => !v)}
                      className="flex items-center gap-1 rounded-xl border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.1]"
                      title="切换 iPad 横竖屏"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      {ipadLandscape ? "横屏" : "竖屏"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 核心预览画布舞台 */}
            <div className="relative flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/6 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.045),transparent_70%)] px-3 py-6">
              {viewMode === "single" ? (
                <DevicePreview
                  image={loadedImage}
                  device={device}
                  renderOptions={renderOptions}
                  showSafeZones={showSafeZones}
                  showOriginal={showOriginal}
                  clockFont={clockFont}
                  clockColor={clockColor}
                  depthHint={depthHint}
                />
              ) : (
                <SuitePreview
                  image={loadedImage}
                  renderOptions={renderOptions}
                  onExportSuccess={(label) => showToast(`已导出 ${label}！`)}
                />
              )}
            </div>

            {/* 舞台底部快捷开关条 */}
            {viewMode === "single" && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSafeZones((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
                      showSafeZones
                        ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                        : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    安全区参考线
                  </button>

                  {deviceFamily !== "mac" && (
                    <button
                      type="button"
                      onClick={() => setHomeScreenBlur((v) => !v)}
                      className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                        homeScreenBlur
                          ? "border-purple-400/60 bg-purple-500/15 text-purple-200"
                          : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      {homeScreenBlur ? "当前：主屏配对模糊" : "切换主屏图标预览"}
                    </button>
                  )}

                  <button
                    type="button"
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onMouseLeave={() => setShowOriginal(false)}
                    onClick={() => setShowOriginal((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
                      showOriginal
                        ? "border-white/50 bg-white/20 text-white"
                        : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    <SplitSquareHorizontal className="h-3.5 w-3.5" />
                    {showOriginal ? "显示美化后" : "对比原图"}
                  </button>
                </div>

                {lastResult && (
                  <span className="text-[11px] text-emerald-300/90">
                    ✓ {lastResult.providerLabel}
                  </span>
                )}
              </div>
            )}

            {/* 显示 AI 生成提示与 Prompt 透明预览 */}
            {lastResult && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 px-3.5 py-2.5 text-[11px] text-zinc-400">
                <p className="text-zinc-200">{lastResult.tips}</p>
                <p className="mt-1 line-clamp-2 opacity-75">
                  已组装美学指令：{lastResult.finalPrompt}
                </p>
              </div>
            )}
          </section>

          {/* ---------- 右侧栏：苹果专属构图微调 + 无损导出 ---------- */}
          <aside className="space-y-4 lg:col-span-3">
            {/* 1. 构图与安全区微调 */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  <SlidersHorizontal className="h-4 w-4 text-sky-400" />
                  3. 苹果构图与安全区微调
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.05);
                    setOffsetX(0);
                    setOffsetY(0);
                    setTopBreathingRoom(deviceFamily === "mac" ? 0.04 : 0.16);
                    setClockScrim(0.22);
                  }}
                  className="text-[11px] text-zinc-400 hover:text-white"
                >
                  重置
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-zinc-300">顶部智能留白扩图（避让时钟）</span>
                    <span className="font-mono text-sky-300">
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
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-zinc-300">锁屏时间顶部柔暗（防白字看不清）</span>
                    <span className="font-mono text-sky-300">{Math.round(clockScrim * 100)}%</span>
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
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-zinc-300">画面缩放</span>
                    <span className="font-mono text-zinc-300">{Math.round(zoom * 100)}%</span>
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

                {/* iOS 锁屏样式模拟 */}
                {deviceFamily !== "mac" && (
                  <div className="space-y-2.5 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-300">锁屏时间样式模拟</span>
                      <label className="flex cursor-pointer items-center gap-1.5 text-zinc-400">
                        <input
                          type="checkbox"
                          checked={depthHint}
                          onChange={(e) => setDepthHint(e.target.checked)}
                          className="rounded"
                        />
                        景深参考
                      </label>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
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
                              ? "bg-white text-black font-medium"
                              : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
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
                              ? "scale-110 border-blue-400 ring-2 ring-blue-400/50"
                              : "border-white/25"
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. 导出高清原图 & 晒图海报 */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white">
                <Download className="h-4 w-4 text-emerald-400" />
                4. 免费无损导出（无水印）
              </h2>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleExportCurrent(false)}
                  disabled={!loadedImage}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  下载 {device.shortName} 原图
                </button>

                {deviceFamily !== "mac" && (
                  <button
                    type="button"
                    onClick={() => handleExportCurrent(true)}
                    disabled={!loadedImage}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] py-2.5 text-xs font-medium text-zinc-100 transition hover:bg-white/[0.1] disabled:opacity-40"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                    下载配套「主屏柔焦模糊壁纸」
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewMode("suite")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 py-2.5 text-xs font-medium text-blue-200 transition hover:bg-blue-500/20"
                >
                  <Layers className="h-3.5 w-3.5" />
                  生成 iPhone + iPad + Mac 三端套图
                </button>

                <button
                  type="button"
                  onClick={handleExportPoster}
                  disabled={!loadedImage}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 py-2.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-40"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  生成小红书 / 朋友圈带壳晒图海报
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
                完全免费、不加水印。如果你觉得哪里不好用或想要新风格，点右上角「提建议」告诉我们。
              </p>
            </div>
          </aside>
        </div>

        {/* ==================== 底部灵感广场 ==================== */}
        <InspirationStrip onApplyRemix={handleApplyRemix} />
      </main>

      {/* ==================== 反馈弹窗 ==================== */}
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        deviceContext={device.name}
        presetContext={preset.name}
      />

      {/* ==================== 底部轻量提示 Toast ==================== */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/15 bg-zinc-900/95 px-4 py-2.5 text-xs font-medium text-white shadow-2xl backdrop-blur-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
