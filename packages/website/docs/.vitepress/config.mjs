import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/pixivizer/",
  lang: "zh-CN",
  title: "Pictelio",
  description: "第三方 Pixiv 客户端，为 Android 打造简洁浏览体验",

  head: [
    ["link", { rel: "canonical", href: "https://a1121611810.github.io/pixivizer/" }],
    ["link", { rel: "preconnect", href: "https://github.com" }],
    ["meta", { property: "og:title", content: "Pictelio - 第三方 Pixiv 客户端" }],
    [
      "meta",
      {
        property: "og:description",
        content: "为 Android 打造的简洁 Pixiv 浏览体验。发现推荐与关注作品，沉浸式查看大图，安全可控的内容过滤。",
      },
    ],
    ["meta", { property: "og:url", content: "https://a1121611810.github.io/pixivizer/" }],
    ["meta", { property: "og:type", content: "website" }],
  ],

  themeConfig: {
    logo: "/pixivizer/logo.svg",

    nav: [
      { text: "首页", link: "/" },
      { text: "隐私政策", link: "/privacy-policy" },
      {
        text: "下载",
        link: "https://github.com/a1121611810/pixivizer/releases",
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/a1121611810/pixivizer" },
    ],

    footer: {
      message: "Pictelio 为第三方开源项目，与 Pixiv 株式会社无关。",
      copyright: `© ${new Date().getFullYear()} a1121611810`,
    },

    search: {
      provider: "local",
    },
  },
});
