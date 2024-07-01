/** @type {import('next').NextConfig} */

import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    reloadOnOnline: true,
    disable : process.env.NODE_ENV === 'development'
});

const nextConfig = {}

export default withSerwist(nextConfig)