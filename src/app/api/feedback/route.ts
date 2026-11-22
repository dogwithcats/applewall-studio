import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

interface FeedbackRecord {
  id: string;
  category: "style_request" | "device_bug" | "effect_quality" | "ux_idea" | "other";
  rating: number;
  content: string;
  contact?: string;
  deviceContext?: string;
  presetContext?: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedbacks.json");

async function readFeedbacks(): Promise<FeedbackRecord[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, "utf-8");
    return JSON.parse(raw) as FeedbackRecord[];
  } catch {
    return [];
  }
}

export async function GET() {
  const list = await readFeedbacks();
  return NextResponse.json({
    total: list.length,
    recent: list.slice(0, 20),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<FeedbackRecord>;
    const content = body.content?.trim();

    if (!content || content.length < 2) {
      return NextResponse.json({ ok: false, error: "请写下你的建议或想法（至少 2 个字）" }, { status: 400 });
    }

    const record: FeedbackRecord = {
      id: crypto.randomUUID(),
      category: body.category || "ux_idea",
      rating: Math.max(1, Math.min(5, Number(body.rating || 5))),
      content: content.slice(0, 1000),
      contact: body.contact?.trim().slice(0, 120) || undefined,
      deviceContext: body.deviceContext,
      presetContext: body.presetContext,
      createdAt: new Date().toISOString(),
    };

    await fs.mkdir(DATA_DIR, { recursive: true });
    const existing = await readFeedbacks();
    existing.unshift(record);
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify(existing, null, 2), "utf-8");

    return NextResponse.json({ ok: true, record });
  } catch {
    return NextResponse.json({ ok: false, error: "提交反馈失败，请重试" }, { status: 500 });
  }
}
