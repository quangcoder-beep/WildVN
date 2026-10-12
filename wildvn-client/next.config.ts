import type { NextConfig } from "next";
import { getMinioRemotePattern, shouldAllowLocalMinio } from "./app/_shared/lib/minio-config";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [getMinioRemotePattern(process.env.NEXT_PUBLIC_MINIO_URL)],
    // Local MinIO is safe for development only. Production must use a public
    // object-storage domain so Next's SSRF protection remains enabled.
    dangerouslyAllowLocalIP: shouldAllowLocalMinio(process.env.NEXT_PUBLIC_MINIO_URL),
  },
};

export default nextConfig;
