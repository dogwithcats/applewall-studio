"use client";

import { useEffect, useRef } from "react";
import { Download, Smartphone, Tablet, Laptop, Sparkles } from "lucide-react";
import { DEFAULT_SUITE_DEVICE_IDS, getDeviceById, type AppleDeviceSpec } from "@/lib/devices";
import {
  exportDeviceWallpaper,
  renderWallpaperToCanvas,
  type WallpaperRenderOptions,
} from "@/lib/canvas-engine";

interface SuitePreviewProps {
  image: HTMLImageElement | null;
  renderOptions: WallpaperRenderOptions;
  onExportSuccess?: (label: string) => void;
}

function MiniDeviceCard({
  image,
  device,
  renderOptions,
  icon,
  canvasWidth,
  canvasHeight,
  customTopBreathing,
  onDownload,
}: {
  image: HTMLImageElement | null;
  device: AppleDeviceSpec;
  renderOptions: WallpaperRenderOptions;
  icon: React.ReactNode;
  canvasWidth: number;
  canvasHeight: number;
  customTopBreathing: number;
  onDownload: () => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || !image) return;
    c.width = canvasWidth;
    c.height = canvasHeight;
    renderWallpaperToCanvas(c, image, {
      ...renderOptions,
      topBreathingRoom: customTopBreathing,
      homeScreenBlur: false,
      bypassStyle: false,
    });
  }, [image, canvasWidth, canvasHeight, renderOptions, customTopBreathing]);

  return (
    <div className="flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
      <div className="mb-3 flex w-full items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <span className="text-blue-400">{icon}</span>
          {device.shortName}
        </div>
        <span className="font-mono text-[11px] text-zinc-400">
          {device.width}×{device.height}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center py-2">
        <div className="overflow-hidden rounded-[18px] border border-white/20 bg-black p-1.5 shadow-2xl">
          <canvas
            ref={ref}
            className="block max-h-[260px] w-auto rounded-[12px] object-contain"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onDownload}
        disabled={!image}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] py-2 text-xs font-medium text-zinc-100 transition hover:bg-white/[0.12] disabled:opacity-40"
      >
        <Download className="h-3.5 w-3.5" />
        单独下载 {device.shortName}
      </button>
    </div>
  );
}

export function SuitePreview({ image, renderOptions, onExportSuccess }: SuitePreviewProps) {
  const iphone = getDeviceById(DEFAULT_SUITE_DEVICE_IDS.iphone);
  const ipad = getDeviceById(DEFAULT_SUITE_DEVICE_IDS.ipad);
  const mac = getDeviceById(DEFAULT_SUITE_DEVICE_IDS.mac);

  function downloadSingle(device: AppleDeviceSpec, breathing: number) {
    if (!image) return;
    exportDeviceWallpaper(image, device, {
      ...renderOptions,
      topBreathingRoom: breathing,
      homeScreenBlur: false,
      ipadLandscape: false,
    });
    onExportSuccess?.(`${device.name} 高清原图`);
  }

  function downloadAllThree() {
    if (!image) return;
    downloadSingle(iphone, renderOptions.topBreathingRoom);
    setTimeout(() => downloadSingle(ipad, Math.min(renderOptions.topBreathingRoom, 0.14)), 250);
    setTimeout(() => downloadSingle(mac, Math.min(renderOptions.topBreathingRoom, 0.06)), 500);
    onExportSuccess?.("iPhone + iPad + Mac 全家桶三端套图");
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <div className="text-xs sm:text-sm">
            <span className="font-medium text-white">苹果全家桶三端联动适配</span>
            <span className="ml-2 text-zinc-300">
              同一张照片自动按三端比例与安全区差异化延展，视觉风格 100% 统一
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadAllThree}
          disabled={!image}
          className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-400 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          一键下载三端套图
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniDeviceCard
          image={image}
          device={iphone}
          renderOptions={renderOptions}
          icon={<Smartphone className="h-4 w-4" />}
          canvasWidth={264}
          canvasHeight={574}
          customTopBreathing={renderOptions.topBreathingRoom}
          onDownload={() => downloadSingle(iphone, renderOptions.topBreathingRoom)}
        />
        <MiniDeviceCard
          image={image}
          device={ipad}
          renderOptions={renderOptions}
          icon={<Tablet className="h-4 w-4" />}
          canvasWidth={360}
          canvasHeight={480}
          customTopBreathing={Math.min(renderOptions.topBreathingRoom, 0.14)}
          onDownload={() => downloadSingle(ipad, Math.min(renderOptions.topBreathingRoom, 0.14))}
        />
        <MiniDeviceCard
          image={image}
          device={mac}
          renderOptions={renderOptions}
          icon={<Laptop className="h-4 w-4" />}
          canvasWidth={518}
          canvasHeight={335}
          customTopBreathing={Math.min(renderOptions.topBreathingRoom, 0.06)}
          onDownload={() => downloadSingle(mac, Math.min(renderOptions.topBreathingRoom, 0.06))}
        />
      </div>
    </div>
  );
}
