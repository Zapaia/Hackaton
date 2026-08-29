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

/**
 * Keyed on the question as the user typed it plus the thread so far — not on the
 * rewritten question. The rewrite goes through a model and is not byte-stable even at
 * temperature 0, so keying on it would miss on a replay of the very same script.
 */
const keyFor = (question: string, history: string[]) =>
  createHash("sha256")
    .update([question.trim().toLowerCase(), ...history].join("\n"))
    .digest("hex")
    .slice(0, 32)

export async function read<T>(question: string, history: string[] = []): Promise<T | null> {
  try {
    const path = join(DIR, `${keyFor(question, history)}.json`)
    return JSON.parse(await readFile(path, "utf8"))
  } catch {
    return null
  }
}

export async function write(
  question: string,
  history: string[],
  value: unknown
): Promise<void> {
  try {
    await mkdir(DIR, { recursive: true })
    const path = join(DIR, `${keyFor(question, history)}.json`)
    await writeFile(path, JSON.stringify(value, null, 2))
  } catch (error) {
    console.warn("[cache] could not persist:", error)
  }
}
