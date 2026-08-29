/** Server-only illustrative imagery. Legal facts stay in the Cala-backed UI. */
import { fal } from "@fal-ai/client"

const MODEL = "fal-ai/flux-2"
export const H3_VIDEO_MODEL = "minimax/h3-max/text-to-video"

export async function generateIllustration(prompt: string): Promise<string> {
  const key = process.env.FAL_KEY
  if (!key) throw new Error("FAL_KEY is not set")

  fal.config({ credentials: key })
  const result = await fal.subscribe(MODEL, {
    input: {
      prompt,
      image_size: "landscape_16_9",
      num_images: 1,
      output_format: "webp",
      enable_safety_checker: true,
    },
  })

  const image = (result.data as { images?: Array<{ url?: string }> }).images?.[0]?.url
  if (!image) throw new Error("fal returned no image")
  return image
}

/** Generate a short, purely illustrative cartoon scene; legal facts stay in the UI. */
export async function generateCartoonActivity(
  prompt: string,
  options: { duration?: number } = {},
): Promise<string> {
  const key = process.env.FAL_KEY
  if (!key) throw new Error("FAL_KEY is not set")

  fal.config({ credentials: key })
  // H3 Max currently accepts a 5–15 second duration range.
  const duration = Math.max(5, Math.min(15, Math.round(options.duration ?? 5)))
  const result = await fal.subscribe(H3_VIDEO_MODEL, {
    input: {
      prompt,
      duration,
      resolution: "480P",
      aspect_ratio: "16:9",
      prompt_expansion_mode: "balanced",
      enable_safety_checker: true,
    },
  })

  const video = (result.data as { video?: { url?: string } }).video?.url
  if (!video) throw new Error("fal returned no video")
  return video
}
