'use client';

import React from 'react';

export default function UnderConstructionWrapper({ children }: { children: React.ReactNode }) {
  // Note: To remove this when the business launches, simply remove this wrapper 
  // from `src/app/[locale]/page.tsx` and return the `children` directly.
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Main Content (blurred behind the overlay) */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Full-screen coming soon overlay covering only the hero viewport */}
      <div className="absolute top-0 left-0 w-full h-[100vh] min-h-[700px] max-h-[1000px] z-[100] overflow-hidden">
        
        {/* Glassmorphic backdrop */}
        <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-[6px]" />

        {/* Subtle animated gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-crimson/20 rounded-full blur-[120px] animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] animate-[float_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-crimson/10 rounded-full blur-[80px] animate-[float_6s_ease-in-out_infinite_1s]" />

        {/* Central content card */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="relative max-w-2xl w-full text-center">
            
            {/* Status bar pill */}
            <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 backdrop-blur-md text-white/70 px-5 py-2 rounded-full text-xs font-semibold tracking-widest uppercase mb-8 shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson"></span>
              </span>
              IELTS Lab Oran — Launching Soon
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none tracking-tighter mb-6">
              <span className="text-white">Lab is</span><br/>
              <span className="text-crimson">Loading.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-white/50 text-lg md:text-xl font-light leading-relaxed max-w-md mx-auto mb-10">
              Preparing the most rigorous IELTS preparation facility in Algeria. The site will be live when we are ready to take registrations.
            </p>

            {/* Progress bar */}
            <div className="w-full max-w-sm mx-auto mb-10">
              <div className="flex justify-between text-white/40 text-xs mb-2 font-medium">
                <span>Setup Progress</span>
                <span>78%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-crimson to-red-400 h-full rounded-full" style={{ width: '78%', boxShadow: '0 0 12px rgba(217, 30, 54, 0.6)' }} />
              </div>
            </div>

            {/* Checklist items */}
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-12">
              {[
                { label: 'Lab Setup', done: true },
                { label: 'Curriculum', done: true },
                { label: 'Scheduling', done: false },
              ].map(({ label, done }) => (
                <div
                  key={label}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold ${
                    done
                      ? 'bg-white/5 border-white/10 text-white/70'
                      : 'bg-crimson/10 border-crimson/30 text-crimson/80'
                  }`}
                >
                  <span className={`text-lg ${done ? 'text-green-400' : 'text-crimson'}`}>
                    {done ? '✓' : '◷'}
                  </span>
                  {label}
                </div>
              ))}
            </div>

            {/* Bottom detail line */}
            <p className="text-white/25 text-xs tracking-widest uppercase font-medium">
              Bir El Djir, Oran • Digital IELTS Lab
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
