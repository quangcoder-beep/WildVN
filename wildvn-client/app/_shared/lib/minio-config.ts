export const DEFAULT_MINIO_URL = "http://localhost:9000/wildvn";
type MinioProtocol = "http" | "https";

export interface MinioRemotePattern {
  protocol: MinioProtocol;
  hostname: string;
  port: string;
  pathname: string;
}

function parseMinioUrl(value?: string): URL {
  const candidate = value?.trim() || DEFAULT_MINIO_URL;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed
      : new URL(DEFAULT_MINIO_URL);
  } catch {
    return new URL(DEFAULT_MINIO_URL);
  }
}

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized ? `${normalized}/**` : "/**";
}

export function getMinioRemotePattern(value?: string): MinioRemotePattern {
  const parsed = parseMinioUrl(value);
  return {
    protocol: parsed.protocol === "https:" ? "https" : "http",
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: normalizePathname(parsed.pathname),
  };
}

export function isPrivateMinioHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1") return true;

  const octets = normalized.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 127)
    || (first === 169 && second === 254);
}

export function shouldAllowLocalMinio(value?: string, nodeEnv = process.env.NODE_ENV): boolean {
  const { hostname } = getMinioRemotePattern(value);
  return nodeEnv !== "production" && isPrivateMinioHostname(hostname);
}
