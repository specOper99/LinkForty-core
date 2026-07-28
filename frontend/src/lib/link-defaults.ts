export const LINK_DEFAULTS = {
  iosAppStoreUrl: "https://apps.apple.com/iq/app/964/id6471904256",
  androidAppStoreUrl:
    "https://play.google.com/store/apps/details?id=com.mediaZan.master964Application",
  targetingDevices: ["ios", "android", "web"] as const,
  utmParameters: {
    source: "964media",
    medium: "link",
    campaign: "share",
  },
  brandOg: {
    title: "شبكة 964",
    description: "منصة صحفية عراقية تقدم #العراق_بصورة_أوضح",
    imageUrl: "https://964media.com/core/views/b28bf1145a/assets/img/cover-main.jpg",
    type: "news",
  },
} as const;
