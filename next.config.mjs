/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["three"],
  images: {
    unoptimized: false,
  },
};
export default nextConfig;
