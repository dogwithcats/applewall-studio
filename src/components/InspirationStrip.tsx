"use client";

import { Sparkles, Wand2 } from "lucide-react";
import { STYLE_PRESETS, type ScenarioType } from "@/lib/presets";
import { getSampleImageUrl } from "@/lib/samples";

interface InspirationStripProps {
  onApplyRemix: (presetId: string, scenario: ScenarioType, sampleId: string) => void;
}

const COMMUNITY_CARDS = [
  {
    id: "remix-1",
    title: "治愈橘猫 · 影棚通透锁屏",
    author: "@爱拍猫的小林",
    deviceTag: "iPhone 18 Pro Max",
    presetId: "portrait-studio-light",
    scenario: "portrait_pet" as ScenarioType,
    sampleId: "sample-cat-window",
    likes: 342,
  },
  {
    id: "remix-2",
    title: "日照金山 · 新海诚剧场版",
    author: "@川西摄影师阿杰",
    deviceTag: "Mac + iPhone 全家桶",
    presetId: "art-shinkai-anime",
    scenario: "scenery_art" as ScenarioType,
    sampleId: "sample-alpine-glow",
    likes: 518,
  },
  {
    id: "remix-3",
    title: "海边剪影 · 顶部留白避时钟",
    author: "@极简果粉Momo",
    deviceTag: "iPhone 锁屏景深",
    presetId: "portrait-top-breathing",
    scenario: "portrait_pet" as ScenarioType,
    sampleId: "sample-seaside-portrait",
    likes: 289,
  },
  {
    id: "remix-4",
    title: "深邃星夜 · OLED 暗黑护眼",
    author: "@夜猫子设计师",
    deviceTag: 'MacBook Pro 16"',
    presetId: "art-oled-midnight",
    scenario: "scenery_art" as ScenarioType,
    sampleId: "sample-alpine-glow",
    likes: 416,
  },
];

export function InspirationStrip({ onApplyRemix }: InspirationStripProps) {
  return (
    <section className="glass-panel mt-7 rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <h2 className="text-sm font-semibold text-white sm:text-base">
            灵感广场 · 一键做同款
          </h2>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10.5px] text-zinc-300">
            免费共创社区示例
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          点击任意方案立刻套用同款风格与安全区参数，再上传你的照片即可出片
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {COMMUNITY_CARDS.map((card) => {
          const preset = STYLE_PRESETS.find((p) => p.id === card.presetId);
          const thumbUrl = getSampleImageUrl(card.sampleId);
          return (
            <div
              key={card.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-black/35 p-3 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="relative mb-3 h-28 w-full overflow-hidden rounded-xl bg-zinc-900">
                <img
                  src={thumbUrl}
                  alt={card.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/15" />
                <div className="absolute inset-x-2.5 bottom-2 flex items-center justify-between">
                  <span className="rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[9.5px] font-medium text-white backdrop-blur-md">
                    {card.deviceTag}
                  </span>
                  <span className="text-[10.5px] font-medium text-white/90">♥ {card.likes}</span>
                </div>
              </div>

              <div className="px-0.5">
                <h3 className="text-xs font-semibold text-white">{card.title}</h3>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  {card.author} · {preset?.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onApplyRemix(card.presetId, card.scenario, card.sampleId)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white hover:text-black"
              >
                <Wand2 className="h-3.5 w-3.5" />
                套用同款参数
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
