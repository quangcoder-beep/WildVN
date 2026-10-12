/**
 * Helper to construct the full image URL.
 * If the provided path is already a full URL (http:// or https://), it returns it as is.
 * Otherwise, it prepends the NEXT_PUBLIC_MINIO_URL environment variable.
 */
export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  
  // If it's already an absolute URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }


  // Get the base URL from env, removing trailing slashes if any
  const baseUrl = process.env.NEXT_PUBLIC_MINIO_URL?.replace(/\/$/, '') || '';
  
  // Ensure the path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${normalizedPath}`;
};
