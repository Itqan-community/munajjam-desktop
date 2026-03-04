const path = require("path");
const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  typedRoutes: false, // Disabled due to locale routes
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  webpack: (config) => config,
};

module.exports = withNextIntl(nextConfig);
