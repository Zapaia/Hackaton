/** Server-only illustrative imagery. Legal facts stay in the Cala-backed UI. */
import { fal } from "@fal-ai/client"

const MODEL = "fal-ai/flux-2"

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
