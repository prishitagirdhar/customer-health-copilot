/** @type {import('next').NextConfig} */
const nextConfig = {
  // Make sure the simulated dataset ships with the serverless bundle on Vercel
  experimental: {
    outputFileTracingIncludes: {
      "/": ["./data/**/*"],
      "/api/playbooks/run": ["./data/**/*"],
    },
  },
};

export default nextConfig;
