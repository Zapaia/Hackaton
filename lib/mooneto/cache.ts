/**
 * Disk cache for answered questions.
 *
 * Cala's latency swings between 3s and 43s for the same class of query, which a live
 * demo cannot absorb. Verified legal knowledge does not change between two questions,
 * so caching by resolved question is both safe and honest: repeat questions are instant,
 * anything new still goes to Cala.
 */
import { createHash } from "crypto"
import { mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"

const DIR = join(process.cwd(), ".cache", "answers")

const keyFor = (question: string) =>
  createHash("sha256").update(question.trim().toLowerCase()).digest("hex").slice(0, 32)

export async function read<T>(question: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(join(DIR, `${keyFor(question)}.json`), "utf8"))
  } catch {
    return null
  }
}

export async function write(question: string, value: unknown): Promise<void> {
  try {
    await mkdir(DIR, { recursive: true })
    await writeFile(join(DIR, `${keyFor(question)}.json`), JSON.stringify(value, null, 2))
  } catch (error) {
    console.warn("[cache] could not persist:", error)
  }
}
