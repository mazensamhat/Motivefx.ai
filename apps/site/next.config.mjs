/** @type {import('next').NextConfig} */

const nextConfig = {
  env: {NEXT_PUBLIC_RELEASE_VERSION: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12) || "local"},

  transpilePackages: ["@motivefx/database"],

};



export default nextConfig;

