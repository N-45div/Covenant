/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: new URL("../..", import.meta.url).pathname,
  transpilePackages: []
};

export default nextConfig;

