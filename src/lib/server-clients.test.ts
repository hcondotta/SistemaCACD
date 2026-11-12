import { afterEach, describe, expect, it, vi } from "vitest";
import { isGeminiConfigured, isSupabaseConfigured } from "./server-clients";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isSupabaseConfigured", () => {
  it("rejeita os valores de exemplo copiados do .env.example", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://seu-projeto.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sua-chave-service-role");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("rejeita URL real acompanhada de chave de serviço ainda no placeholder", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://kirzdbmgarpswegumuoy.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sua-chave-service-role");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("rejeita variáveis vazias ou só com espaços", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://kirzdbmgarpswegumuoy.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "   ");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("aceita URL e chave de serviço reais", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://kirzdbmgarpswegumuoy.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_abc123");
    expect(isSupabaseConfigured()).toBe(true);
  });
});

describe("isGeminiConfigured", () => {
  it("rejeita a chave de exemplo", () => {
    vi.stubEnv("GEMINI_API_KEY", "sua-chave-gemini");
    expect(isGeminiConfigured()).toBe(false);
  });

  it("aceita uma chave real", () => {
    vi.stubEnv("GEMINI_API_KEY", "AIzaSyExemploDeChaveReal");
    expect(isGeminiConfigured()).toBe(true);
  });
});
