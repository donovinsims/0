import { createClient } from "@vercel/kv"

const KV_REST_API_URL = process.env.KV_REST_API_URL
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN

// Mock implementation for development/local use without real Vercel KV
class MockKV {
  // Use globalThis to persist data across module reloads in Next.js development
  private get store(): Map<string, any> {
    const globalStore = (globalThis as any)._mockKvStore
    if (!globalStore) {
      (globalThis as any)._mockKvStore = new Map()
    }
    return (globalThis as any)._mockKvStore
  }

  constructor() {
     // console.log("MockKV initialized")
  }

  async set(key: string, value: any) {
    this.store.set(key, value)
    return 'OK'
  }

  async get(key: string) {
    return this.store.get(key) || null
  }

  async hset(key: string, fields: Record<string, any>) {
    const existing = this.store.get(key) || {}
    const updated = { ...existing, ...fields }
    this.store.set(key, updated)
    return Object.keys(fields).length
  }

  async hgetall(key: string) {
    return this.store.get(key) || null
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0
  }

  // List operations
  async rpush(key: string, ...values: any[]) {
    const list = this.store.get(key) || []
    if (!Array.isArray(list)) throw new Error("Key holds non-list value")
    list.push(...values)
    this.store.set(key, list)
    return list.length
  }

  async lrange(key: string, start: number, stop: number) {
    const list = this.store.get(key) || []
    if (!Array.isArray(list)) return []
    if (stop === -1) return list.slice(start)
    return list.slice(start, stop + 1)
  }

  // ZSet operations (basic mock for sorted sets, treating as list for now or implementing basic)
  async zrange(key: string, start: number, stop: number) {
     // Simplifying: just return the list. Real implementation would sort.
     // The app uses zrange for events, maybe expecting order.
     const list = this.store.get(key) || []
     if (!Array.isArray(list)) return []
     if (stop === -1) return list.slice(start)
     return list.slice(start, stop + 1)
  }

}

const shouldUseMock = !KV_REST_API_URL || KV_REST_API_URL.includes("localhost") || process.env.USE_MOCK_KV === "true"

export const kv = shouldUseMock
  ? (new MockKV() as any)
  : createClient({
      url: KV_REST_API_URL,
      token: KV_REST_API_TOKEN,
    })

export async function testKvConnection() {
  try {
    await kv.set("test_connection", "working")
    const result = await kv.get("test_connection")

    return {
      success: true,
      message: `KV connection successful (${shouldUseMock ? 'Mock' : 'Real'})`,
      result,
      environmentVariables: {
        KV_REST_API_URL: KV_REST_API_URL ? "Set (value hidden)" : "Not set",
        KV_REST_API_TOKEN: KV_REST_API_TOKEN ? "Set (value hidden)" : "Not set",
        NODE_ENV: process.env.NODE_ENV,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: "KV connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
      environmentVariables: {
        KV_REST_API_URL: KV_REST_API_URL ? "Set (value hidden)" : "Not set",
        KV_REST_API_TOKEN: KV_REST_API_TOKEN ? "Set (value hidden)" : "Not set",
        NODE_ENV: process.env.NODE_ENV,
      },
    }
  }
}
