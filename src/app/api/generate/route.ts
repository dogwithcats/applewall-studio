import { NextRequest, NextResponse } from "next/server";
import {
  detectConfiguredProvider,
  runWallpaperGeneration,
  type GenerateWallpaperRequest,
} from "@/lib/ai/providers";

// MVP 内存级每日免费限流器（生产环境平滑切换至 Redis / PostgreSQL daily_usage_quotas）
const dailyQuotaMap = new Map<string, { date: string; count: number }>();

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getClientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local-dev";
  return fwd.split(",")[0].trim();
}

export async function GET(req: NextRequest) {
  const provider = detectConfiguredProvider();
  const dailyLimit = Number(process.env.DAILY_FREE_LIMIT_PER_IP || "15");
  const today = getTodayKey();
  const key = getClientKey(req);
  const record = dailyQuotaMap.get(key);
  const used = record && record.date === today ? record.count : 0;

  return NextResponse.json({
    provider,
    isCloudConfigured: provider !== "local",
    dailyLimit,
    usedToday: used,
    remainingToday: Math.max(0, dailyLimit - used),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateWallpaperRequest;

    if (!body?.imageDataUrl || !body?.presetId) {
      return NextResponse.json(
        { ok: false, error: "请先上传图片并选择美化风格" },
        { status: 400 }
      );
    }

    const dailyLimit = Number(process.env.DAILY_FREE_LIMIT_PER_IP || "15");
    const today = getTodayKey();
    const key = getClientKey(req);
    const current = dailyQuotaMap.get(key);
    const used = current && current.date === today ? current.count : 0;

    // 仅对消耗平台云端 API 的调用计入每日防刷限流；本地引擎与用户自带 Key 无限畅玩
    const serverProvider = detectConfiguredProvider();
    const usesPlatformCloud = !body.customApiKey?.trim() && serverProvider !== "local";

    if (usesPlatformCloud && used >= dailyLimit) {
      return NextResponse.json(
        {
          ok: false,
          error: `今日免费云端 AI 次数（${dailyLimit}次）已用完，你可以继续无限使用本地即时增强引擎，或填写自己的 API Key。`,
        },
        { status: 429 }
      );
    }

    const result = await runWallpaperGeneration(body);

    if (usesPlatformCloud && result.ok) {
      dailyQuotaMap.set(key, { date: today, count: used + 1 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "生成服务暂时繁忙，请稍后再试";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
