import { getPresetById, type ScenarioType } from "../presets";

export type AIProviderName = "local" | "volcengine" | "dashscope" | "siliconflow" | "gemini";

export interface GenerateWallpaperRequest {
  imageDataUrl: string;
  presetId: string;
  scenario: ScenarioType;
  deviceId: string;
  deviceWidth: number;
  deviceHeight: number;
  strength: number;
  customPrompt?: string;
  topBreathingRoom: number;
  /** 可选 BYOK：允许极客用户填写自己的 API Key */
  customProvider?: AIProviderName;
  customApiKey?: string;
}

export interface GenerateWallpaperResponse {
  ok: boolean;
  providerUsed: AIProviderName;
  providerLabel: string;
  mode: "cloud" | "local-instant";
  /** 云端 AI 生成成功时返回新图片 URL / DataURL；本地引擎时返回 null，由前端 Canvas 即时渲染 */
  resultImageUrl: string | null;
  finalPrompt: string;
  tips: string;
  durationMs: number;
  error?: string;
}

export function detectConfiguredProvider(): AIProviderName {
  const configured = (process.env.AI_PROVIDER || "local").toLowerCase() as AIProviderName;
  if (configured === "volcengine" && process.env.VOLC_API_KEY) return "volcengine";
  if (configured === "dashscope" && process.env.DASHSCOPE_API_KEY) return "dashscope";
  if (configured === "siliconflow" && process.env.SILICONFLOW_API_KEY) return "siliconflow";
  if (configured === "gemini" && process.env.GEMINI_API_KEY) return "gemini";

  // 自动回退检测：只要配置了任一 Key 即可启用
  if (process.env.VOLC_API_KEY) return "volcengine";
  if (process.env.DASHSCOPE_API_KEY) return "dashscope";
  if (process.env.SILICONFLOW_API_KEY) return "siliconflow";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "local";
}

export function buildWallpaperPrompt(req: GenerateWallpaperRequest): string {
  const preset = getPresetById(req.presetId);
  const parts = [preset.promptTemplate];

  if (req.topBreathingRoom >= 0.15) {
    parts.push("画面顶部保留干净柔和的呼吸留白区，适配苹果锁屏时间与灵动岛显示，避免主体遮挡顶部时钟。");
  }
  if (req.scenario === "portrait_pet") {
    parts.push("【重要约束】严格保持原图人物脸部特征或宠物花纹形态高度一致，仅优化光影、画质、构图与氛围。");
  }
  if (req.customPrompt?.trim()) {
    parts.push(`用户补充要求：${req.customPrompt.trim()}`);
  }
  return parts.join(" ");
}

async function callVolcengineArk(
  req: GenerateWallpaperRequest,
  finalPrompt: string,
  apiKey: string
): Promise<string> {
  const endpoint =
    process.env.VOLC_ENDPOINT_URL || "https://ark.cn-beijing.volces.com/api/v3/images/generations";
  const model =
    req.scenario === "portrait_pet"
      ? process.env.VOLC_EDIT_MODEL || "doubao-seededit-3-0-i2i-250628"
      : process.env.VOLC_ART_MODEL || "doubao-seededit-3-0-i2i-250628";

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: finalPrompt,
      image: req.imageDataUrl,
      response_format: "b64_json",
      guidance_scale: req.scenario === "portrait_pet" ? 5.5 : 7.5,
      watermark: false,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`火山引擎方舟调用失败 (${resp.status}): ${text.slice(0, 200)}`);
  }

  const data = (await resp.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const first = data.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) return first.url;
  throw new Error("火山引擎未返回有效图片数据");
}

async function callSiliconFlow(
  req: GenerateWallpaperRequest,
  finalPrompt: string,
  apiKey: string
): Promise<string> {
  const resp = await fetch("https://api.siliconflow.cn/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "Kwai-Kolors/Kolors",
      prompt: finalPrompt,
      image: req.imageDataUrl,
      image_size: req.deviceHeight > req.deviceWidth ? "768x1344" : "1344x768",
      batch_size: 1,
      num_inference_steps: 25,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`硅基流动调用失败 (${resp.status}): ${text.slice(0, 200)}`);
  }

  const data = (await resp.json()) as { images?: Array<{ url?: string }> };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("硅基流动未返回有效图片链接");
  return url;
}

export async function runWallpaperGeneration(
  req: GenerateWallpaperRequest
): Promise<GenerateWallpaperResponse> {
  const start = Date.now();
  const finalPrompt = buildWallpaperPrompt(req);

  const chosenProvider: AIProviderName =
    req.customProvider && req.customApiKey?.trim()
      ? req.customProvider
      : detectConfiguredProvider();

  if (chosenProvider === "volcengine") {
    const apiKey = req.customApiKey?.trim() || process.env.VOLC_API_KEY || "";
    const url = await callVolcengineArk(req, finalPrompt, apiKey);
    return {
      ok: true,
      providerUsed: "volcengine",
      providerLabel: "火山引擎 · 豆包 SeedEdit",
      mode: "cloud",
      resultImageUrl: url,
      finalPrompt,
      tips: "已完成云端 AI 保真美化与氛围重塑，你仍可在右侧微调构图与锁屏安全区。",
      durationMs: Date.now() - start,
    };
  }

  if (chosenProvider === "siliconflow") {
    const apiKey = req.customApiKey?.trim() || process.env.SILICONFLOW_API_KEY || "";
    const url = await callSiliconFlow(req, finalPrompt, apiKey);
    return {
      ok: true,
      providerUsed: "siliconflow",
      providerLabel: "硅基流动 · Kolors / FLUX",
      mode: "cloud",
      resultImageUrl: url,
      finalPrompt,
      tips: "已完成云端 AI 艺术创作，可随时切换 iPhone / iPad / Mac 预览三端效果。",
      durationMs: Date.now() - start,
    };
  }

  // 默认：零配置本地即时增强引擎（0 算力成本，免费演示与轻量美化极速响应）
  await new Promise((r) => setTimeout(r, 420));
  return {
    ok: true,
    providerUsed: "local",
    providerLabel: "果壁本地即时引擎 (零成本模式)",
    mode: "local-instant",
    resultImageUrl: null,
    finalPrompt,
    tips:
      "已启用本地美学光影与顶部智能留白引擎（0 费用秒出片）。配置火山引擎豆包/硅基流动 API Key 后可自动开启云端 AI 深度重绘。",
    durationMs: Date.now() - start,
  };
}
