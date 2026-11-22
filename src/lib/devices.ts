export type DeviceFamily = "iphone" | "ipad" | "mac";
export type IPhoneSeries = "18" | "17" | "16" | "15" | "14";
export type IPhoneTier = "standard" | "pro" | "pro-max";

export interface AppleDeviceSpec {
  id: string;
  family: DeviceFamily;
  series?: IPhoneSeries;
  tier?: IPhoneTier;
  tierLabel?: "基础版" | "Pro" | "Pro Max";
  name: string;
  shortName: string;
  screenSize: string;
  width: number;
  height: number;
  aspectLabel: string;
  supportsLandscape?: boolean;
  hasDynamicIsland?: boolean;
  hasNotch?: boolean;
  safeZones: {
    topClearPercent: number; // 顶部灵动岛/刘海/菜单栏避让百分比
    clockZoneTopPercent?: number;
    clockZoneBottomPercent?: number;
    depthSweetSpotPercent?: number; // iOS 景深最佳主体顶部位置
    bottomClearPercent: number; // 底部 Dock / Home Indicator
  };
}

const IPHONE_SAFE_ZONES = {
  topClearPercent: 6,
  clockZoneTopPercent: 9,
  clockZoneBottomPercent: 28,
  depthSweetSpotPercent: 25,
  bottomClearPercent: 14,
};

export const IPHONE_SERIES_LIST: { id: IPhoneSeries; label: string }[] = [
  { id: "18", label: "iPhone 18 系列" },
  { id: "17", label: "iPhone 17 系列" },
  { id: "16", label: "iPhone 16 系列" },
  { id: "15", label: "iPhone 15 系列" },
  { id: "14", label: "iPhone 14 系列" },
];

export const IPHONE_TIER_LIST: { id: IPhoneTier; label: "基础版" | "Pro" | "Pro Max" }[] = [
  { id: "standard", label: "基础版" },
  { id: "pro", label: "Pro" },
  { id: "pro-max", label: "Pro Max" },
];

export const APPLE_DEVICES: AppleDeviceSpec[] = [
  // ==================== iPhone 18 系列 ====================
  {
    id: "iphone-18-pro-max",
    family: "iphone",
    series: "18",
    tier: "pro-max",
    tierLabel: "Pro Max",
    name: "iPhone 18 Pro Max",
    shortName: "18 Pro Max",
    screenSize: '6.9"',
    width: 1320,
    height: 2868,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-18-pro",
    family: "iphone",
    series: "18",
    tier: "pro",
    tierLabel: "Pro",
    name: "iPhone 18 Pro",
    shortName: "18 Pro",
    screenSize: '6.3"',
    width: 1206,
    height: 2622,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-18",
    family: "iphone",
    series: "18",
    tier: "standard",
    tierLabel: "基础版",
    name: "iPhone 18 基础版",
    shortName: "18 基础版",
    screenSize: '6.3"',
    width: 1206,
    height: 2622,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },

  // ==================== iPhone 17 系列 ====================
  {
    id: "iphone-17-pro-max",
    family: "iphone",
    series: "17",
    tier: "pro-max",
    tierLabel: "Pro Max",
    name: "iPhone 17 Pro Max",
    shortName: "17 Pro Max",
    screenSize: '6.9"',
    width: 1320,
    height: 2868,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-17-pro",
    family: "iphone",
    series: "17",
    tier: "pro",
    tierLabel: "Pro",
    name: "iPhone 17 Pro",
    shortName: "17 Pro",
    screenSize: '6.3"',
    width: 1206,
    height: 2622,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-17",
    family: "iphone",
    series: "17",
    tier: "standard",
    tierLabel: "基础版",
    name: "iPhone 17 基础版",
    shortName: "17 基础版",
    screenSize: '6.3"',
    width: 1206,
    height: 2622,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },

  // ==================== iPhone 16 系列 ====================
  {
    id: "iphone-16-pro-max",
    family: "iphone",
    series: "16",
    tier: "pro-max",
    tierLabel: "Pro Max",
    name: "iPhone 16 Pro Max",
    shortName: "16 Pro Max",
    screenSize: '6.9"',
    width: 1320,
    height: 2868,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-16-pro",
    family: "iphone",
    series: "16",
    tier: "pro",
    tierLabel: "Pro",
    name: "iPhone 16 Pro",
    shortName: "16 Pro",
    screenSize: '6.3"',
    width: 1206,
    height: 2622,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-16",
    family: "iphone",
    series: "16",
    tier: "standard",
    tierLabel: "基础版",
    name: "iPhone 16 基础版",
    shortName: "16 基础版",
    screenSize: '6.1"',
    width: 1179,
    height: 2556,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },

  // ==================== iPhone 15 系列 ====================
  {
    id: "iphone-15-pro-max",
    family: "iphone",
    series: "15",
    tier: "pro-max",
    tierLabel: "Pro Max",
    name: "iPhone 15 Pro Max",
    shortName: "15 Pro Max",
    screenSize: '6.7"',
    width: 1290,
    height: 2796,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-15-pro",
    family: "iphone",
    series: "15",
    tier: "pro",
    tierLabel: "Pro",
    name: "iPhone 15 Pro",
    shortName: "15 Pro",
    screenSize: '6.1"',
    width: 1179,
    height: 2556,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-15",
    family: "iphone",
    series: "15",
    tier: "standard",
    tierLabel: "基础版",
    name: "iPhone 15 基础版",
    shortName: "15 基础版",
    screenSize: '6.1"',
    width: 1179,
    height: 2556,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },

  // ==================== iPhone 14 系列 ====================
  {
    id: "iphone-14-pro-max",
    family: "iphone",
    series: "14",
    tier: "pro-max",
    tierLabel: "Pro Max",
    name: "iPhone 14 Pro Max",
    shortName: "14 Pro Max",
    screenSize: '6.7"',
    width: 1290,
    height: 2796,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-14-pro",
    family: "iphone",
    series: "14",
    tier: "pro",
    tierLabel: "Pro",
    name: "iPhone 14 Pro",
    shortName: "14 Pro",
    screenSize: '6.1"',
    width: 1179,
    height: 2556,
    aspectLabel: "9:19.5",
    hasDynamicIsland: true,
    safeZones: IPHONE_SAFE_ZONES,
  },
  {
    id: "iphone-14",
    family: "iphone",
    series: "14",
    tier: "standard",
    tierLabel: "基础版",
    name: "iPhone 14 基础版",
    shortName: "14 基础版",
    screenSize: '6.1"',
    width: 1170,
    height: 2532,
    aspectLabel: "9:19.5",
    hasDynamicIsland: false,
    hasNotch: true,
    safeZones: IPHONE_SAFE_ZONES,
  },

  // ==================== iPad 系列 ====================
  {
    id: "ipad-pro-13",
    family: "ipad",
    name: 'iPad Pro 13"',
    shortName: 'iPad Pro 13"',
    screenSize: '13"',
    width: 2064,
    height: 2752,
    aspectLabel: "3:4",
    supportsLandscape: true,
    safeZones: {
      topClearPercent: 4,
      clockZoneTopPercent: 8,
      clockZoneBottomPercent: 24,
      bottomClearPercent: 11,
    },
  },
  {
    id: "ipad-air-11",
    family: "ipad",
    name: 'iPad Air 11"',
    shortName: 'iPad Air 11"',
    screenSize: '11"',
    width: 1640,
    height: 2360,
    aspectLabel: "7:10",
    supportsLandscape: true,
    safeZones: {
      topClearPercent: 4,
      clockZoneTopPercent: 8,
      clockZoneBottomPercent: 24,
      bottomClearPercent: 11,
    },
  },

  // ==================== Mac 系列 ====================
  {
    id: "macbook-pro-16",
    family: "mac",
    name: 'MacBook Pro 16"',
    shortName: 'MBP 16"',
    screenSize: '16.2"',
    width: 3456,
    height: 2234,
    aspectLabel: "16:10",
    hasNotch: true,
    safeZones: {
      topClearPercent: 4,
      bottomClearPercent: 10,
    },
  },
  {
    id: "macbook-air-15",
    family: "mac",
    name: 'MacBook Air 15"',
    shortName: 'MBA 15"',
    screenSize: '15.3"',
    width: 2880,
    height: 1864,
    aspectLabel: "16:10",
    hasNotch: true,
    safeZones: {
      topClearPercent: 4,
      bottomClearPercent: 10,
    },
  },
  {
    id: "studio-display-5k",
    family: "mac",
    name: "Studio Display 5K",
    shortName: "5K 显示器",
    screenSize: '27"',
    width: 5120,
    height: 2880,
    aspectLabel: "16:9",
    safeZones: {
      topClearPercent: 3.5,
      bottomClearPercent: 9,
    },
  },
];

export const DEFAULT_SUITE_DEVICE_IDS: Record<DeviceFamily, string> = {
  iphone: "iphone-18-pro-max",
  ipad: "ipad-pro-13",
  mac: "macbook-pro-16",
};

export function getDeviceById(id: string): AppleDeviceSpec {
  return APPLE_DEVICES.find((d) => d.id === id) ?? APPLE_DEVICES[0];
}

export function findIPhoneDevice(series: IPhoneSeries, tier: IPhoneTier): AppleDeviceSpec {
  return (
    APPLE_DEVICES.find(
      (d) => d.family === "iphone" && d.series === series && d.tier === tier
    ) ?? APPLE_DEVICES[0]
  );
}

export function getEffectiveDimensions(
  device: AppleDeviceSpec,
  ipadLandscape: boolean
): { width: number; height: number } {
  if (device.family === "ipad" && ipadLandscape) {
    return { width: device.height, height: device.width };
  }
  return { width: device.width, height: device.height };
}
