import type { ScenarioType } from "./presets";

export interface SamplePhotoMeta {
  id: string;
  title: string;
  tag: string;
  imagePath: string;
  scenario: ScenarioType;
  recommendedPresetId: string;
  accent: string;
}

export const SAMPLE_PHOTOS: SamplePhotoMeta[] = [
  {
    id: "sample-cat-window",
    title: "午后橘猫窗台",
    tag: "富士经典负片",
    imagePath: "/samples/cat-window.jpg",
    scenario: "fuji_film",
    recommendedPresetId: "fuji-classic-neg",
    accent: "#f59e0b",
  },
  {
    id: "sample-alpine-glow",
    title: "日照金山湖畔",
    tag: "富士反转片",
    imagePath: "/samples/alpine-glow.jpg",
    scenario: "fuji_film",
    recommendedPresetId: "fuji-velvia",
    accent: "#38bdf8",
  },
  {
    id: "sample-seaside-portrait",
    title: "海边黄昏剪影",
    tag: "太平洋蓝配方",
    imagePath: "/samples/seaside-dusk.jpg",
    scenario: "fuji_film",
    recommendedPresetId: "fuji-pacific-blues",
    accent: "#f472b6",
  },
];

export function getSampleImageUrl(sampleId: string): string {
  return SAMPLE_PHOTOS.find((s) => s.id === sampleId)?.imagePath ?? SAMPLE_PHOTOS[0].imagePath;
}
