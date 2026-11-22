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
    tag: "宠物保真演示",
    imagePath: "/samples/cat-window.jpg",
    scenario: "portrait_pet",
    recommendedPresetId: "portrait-studio-light",
    accent: "#f59e0b",
  },
  {
    id: "sample-alpine-glow",
    title: "日照金山湖畔",
    tag: "风景二创演示",
    imagePath: "/samples/alpine-glow.jpg",
    scenario: "scenery_art",
    recommendedPresetId: "art-shinkai-anime",
    accent: "#38bdf8",
  },
  {
    id: "sample-seaside-portrait",
    title: "海边黄昏剪影",
    tag: "锁屏留白演示",
    imagePath: "/samples/seaside-dusk.jpg",
    scenario: "portrait_pet",
    recommendedPresetId: "portrait-top-breathing",
    accent: "#f472b6",
  },
];

export function getSampleImageUrl(sampleId: string): string {
  return SAMPLE_PHOTOS.find((s) => s.id === sampleId)?.imagePath ?? SAMPLE_PHOTOS[0].imagePath;
}
