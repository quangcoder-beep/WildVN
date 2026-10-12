"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/app/_shared/stores/authStore";

export function OAuthCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchMe();
    }
  }, [fetchMe]);

  useEffect(() => {
    const loginStatus = searchParams.get("login");
    if (loginStatus === "success") {
      // Remove the login=success parameter from the URL cleanly
      const params = new URLSearchParams(searchParams.toString());
      params.delete("login");
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  return null;
}
