import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full font-sans">
      <style>{`
        @keyframes authBlob {
          0%,100% { transform: translate(0,0) scale(1); }
          25%     { transform: translate(20px,-30px) scale(1.15); }
          50%     { transform: translate(-20px,20px) scale(.88); }
          75%     { transform: translate(30px,10px) scale(1.05); }
        }
        .orb-blue  { animation: authBlob 8s ease-in-out infinite; }
        .orb-indigo { animation: authBlob 8s ease-in-out infinite; animation-delay: 2s; }
      `}</style>

      {/* LEFT — branding panel */}
      <div className="relative hidden w-[42%] flex-shrink-0 flex-col items-center justify-center overflow-hidden md:flex"
        style={{ background: "linear-gradient(to bottom right, #1e3a8a, #1e40af, #312e81)" }}
      >
        {/* Blob orbs */}
        <div className="orb-blue pointer-events-none absolute top-[25%] -left-20 h-80 w-80 rounded-full blur-[40px]"
          style={{ background: "linear-gradient(to right, rgba(191,219,254,.5), rgba(165,243,252,.5))" }} />
        <div className="orb-indigo pointer-events-none absolute bottom-[25%] -right-20 h-80 w-80 rounded-full blur-[40px]"
          style={{ background: "linear-gradient(to right, rgba(199,210,254,.5), rgba(191,219,254,.5))" }} />

        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />

        {/* Glass card */}
        <div className="animate-fade-in-up relative z-10 mx-auto flex w-full max-w-[340px] flex-col items-center gap-5 rounded-3xl border border-white/20 px-8 py-10 opacity-0 shadow-2xl sm:max-w-[400px] sm:gap-6 sm:px-10 sm:py-12"
          style={{
            background: "rgba(255,255,255,.10)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            animationDelay: "100ms",
            animationFillMode: "forwards",
          }}
        >
          {/* Logo */}
          <div className="relative inline-flex items-center justify-center">
            <div className="animate-spin-slow absolute h-28 w-28 rounded-full p-[2px]"
              style={{
                background: "linear-gradient(to right, #1e3a8a, #3b82f6, #1e40af)",
                WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }} />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/30 shadow-xl"
              style={{
                background: "rgba(255,255,255,.20)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 10px 25px -5px rgba(30,58,138,.40)",
              }}
            >
              <Image
                src="/logo-mark.png"
                alt="LAB"
                width={64}
                height={64}
                className="h-16 w-16 object-contain [filter:brightness(0)_invert(1)]"
                priority
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="font-display text-[32px] font-bold leading-tight -tracking-[.02em] text-white sm:text-[36px]">
              FlowLab
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-200/85 sm:text-[15px] max-w-[300px]">
              Sistema de integracao operacional do Laboratorio Lab.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px w-20"
            style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,.4), transparent)" }} />

          {/* Status badge */}
          <div className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5"
            style={{ background: "rgba(255,255,255,.10)" }}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-blue-100/90">12 departamentos</span>
          </div>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 relative"
        style={{ background: "linear-gradient(to bottom right, #0f172a, #1e293b, #1e1b4b)" }}
      >
        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />

        {/* Mobile logo */}
        <div className="absolute left-6 top-6 md:hidden">
          <Image
            src="/logo-hor.svg"
            alt="LAB"
            width={140}
            height={40}
            className="h-8 w-auto [filter:brightness(0)_invert(1)]"
            priority
          />
        </div>

        <div className="animate-scale-in relative z-10 w-full max-w-[400px] rounded-3xl border border-gray-700 bg-gray-800/80 px-6 py-8 shadow-2xl opacity-0 backdrop-blur-[40px] sm:px-10 sm:py-10"
          style={{
            animationDelay: "150ms",
            animationFillMode: "forwards",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
