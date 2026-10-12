"use client";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081"
).replace(/\/$/, "");

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v4.1h5.8c-.25 1.32-1.77 3.87-5.8 3.87A6.18 6.18 0 1 1 12 5.82c2.28 0 3.81.97 4.68 1.78l3.2-3.1C17.83 2.52 15.22 1.4 12 1.4a10.6 10.6 0 1 0 0 21.2c6.12 0 10.2-4.3 10.2-10.36 0-.7-.08-1.24-.18-1.78H12Z"
      />
      <path fill="#4285F4" d="M22.2 10.46 17.8 10.2v4.1h5.8c.25-1.32.08-2.57-.18-3.84l-1.22.01Z" />
      <path fill="#34A853" d="M12 22.6c2.9 0 5.34-.96 7.12-2.62l-3.48-2.7c-.97.65-2.2 1.05-3.64 1.05-3.98 0-5.52-2.55-5.8-3.86l-3.6 2.78A10.6 10.6 0 0 0 12 22.6Z" />
      <path fill="#FBBC05" d="M6.2 14.47a6.37 6.37 0 0 1 0-4.05L2.6 7.64a10.6 10.6 0 0 0 0 9.61l3.6-2.78Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.09 4.39 23.08 10.13 24v-8.44H7.08v-3.49h3.05V9.4c0-3.03 1.79-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.27h3.34l-.53 3.49h-2.81V24C19.61 23.08 24 18.09 24 12.07Z"
      />
      <path fill="white" d="M16.69 15.56 17.22 12h-3.34V9.73c0-.96.47-1.89 1.96-1.89h1.51V4.87s-1.37-.24-2.68-.24c-2.75 0-4.54 1.67-4.54 4.7V12H7.08v3.56h3.05V24c.61.1 1.24.15 1.87.15s1.26-.05 1.87-.15v-8.44h2.82Z" />
    </svg>
  );
}

const socialProviders = [
  {
    id: "google",
    label: "Google",
    href: `${API_BASE_URL}/oauth2/authorization/google`,
    icon: <GoogleIcon />,
  },
  {
    id: "facebook",
    label: "Facebook",
    href: `${API_BASE_URL}/oauth2/authorization/facebook`,
    icon: <FacebookIcon />,
  },
] as const;

export function SocialAuthButtons() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Đăng nhập bằng mạng xã hội">
      {socialProviders.map((provider) => (
        <a
          key={provider.id}
          href={provider.href}
          aria-label={`Đăng nhập bằng ${provider.label}`}
          data-provider={provider.id}
          className="group flex min-h-12 items-center justify-center gap-2.5 rounded-2xl border border-white/[0.1] bg-white/[0.06] px-4 text-sm font-medium text-white/75 transition-all duration-300 hover:border-white/[0.2] hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4A8] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <span className="transition-transform duration-300 group-hover:scale-110">
            {provider.icon}
          </span>
          <span>Tiếp tục với {provider.label}</span>
        </a>
      ))}
    </div>
  );
}
