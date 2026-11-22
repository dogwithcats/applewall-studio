"use client";

import { useState } from "react";
import { MessageSquareHeart, Star, X, CheckCircle2, Send } from "lucide-react";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  deviceContext: string;
  presetContext: string;
}

const CATEGORIES = [
  { id: "style_request", label: "想要新风格" },
  { id: "effect_quality", label: "美化/保真效果" },
  { id: "device_bug", label: "机型尺寸适配" },
  { id: "ux_idea", label: "产品交互建议" },
] as const;

export function FeedbackModal({
  open,
  onClose,
  deviceContext,
  presetContext,
}: FeedbackModalProps) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("style_request");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const resp = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating,
          content,
          contact,
          deviceContext,
          presetContext,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setError(data.error || "提交失败，请重试");
      } else {
        setSubmitted(true);
        setContent("");
      }
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetAndClose() {
    setSubmitted(false);
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-zinc-950/95 p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">收到你的建议啦！</h3>
            <p className="mt-2 text-sm text-zinc-400">
              果壁 Studio 现阶段完全免费开放，你的每一条真实反馈都会直接决定下一个版本的功能方向。
            </p>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="mt-5 rounded-xl bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              继续制作壁纸
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <MessageSquareHeart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">共创反馈 · 帮我们做得更好</h3>
                <p className="text-xs text-zinc-400">免费开放体验中，欢迎吐槽或许愿新风格</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    category === c.id
                      ? "border-blue-500/70 bg-blue-500/15 text-blue-200"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-zinc-400">整体体验打分</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="rounded-lg p-1 transition hover:bg-white/10"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        n <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-600"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-zinc-400">
                你的建议或想要的新风格/新机型
              </label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="例如：希望能加一个宫崎骏吉卜力风格，或者支持 Apple Watch 表盘壁纸..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/60 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-zinc-400">
                微信号 / 邮箱（选填，新功能上线通知你）
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="选填"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/60 focus:outline-none"
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-medium text-white transition hover:bg-blue-400 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? "正在提交..." : "提交建议"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
