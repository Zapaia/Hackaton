/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export default {
  // The standalone deployment is proxied by the portfolio at /mooneto. Keep the
  // path configurable so local development still works at the root.
  basePath,
  typescript: { ignoreBuildErrors: true },
  // The dev overlay badge sits on top of the input and would show up in the demo video.
  devIndicators: false,
}
