/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Twitch/Kick thumbnails and avatars are served from their own CDNs.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.jtvnw.net" },
      { protocol: "https", hostname: "**.twitchcdn.net" },
      { protocol: "https", hostname: "**.kick.com" },
      { protocol: "https", hostname: "files.kick.com" }
    ]
  }
};

export default nextConfig;
