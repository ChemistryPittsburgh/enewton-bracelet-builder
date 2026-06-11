/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["three"],
  images: {
    unoptimized: false,
  },
  async rewrites() {
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.ENEWTON_AWS_REGION;
    const base =
      process.env.S3_PUBLIC_URL ??
      `https://${bucket}.s3.${region}.amazonaws.com`;

    return [
      {
        source: "/models/:path*",
        destination: `${base}/models/:path*`,
      },
      {
        source: "/images/:path*",
        destination: `${base}/images/:path*`,
      },
    ];
  },
};
export default nextConfig;
