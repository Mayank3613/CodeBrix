import { CONTRACT_VERSION } from "@codebrix/shared";
import { useProjectStore } from "../../stores";

export default function Header() {
  const projectName = useProjectStore((s) => s.projectName);

  return (
    <header className="h-14 px-5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10 shrink-0 select-none">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-black text-white text-base">
          CB
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white">CodeBrix</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              v{CONTRACT_VERSION}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono tracking-tight leading-none mt-0.5">
            Visual Machine Learning Studio
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-slate-200 font-medium">{projectName}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/60 px-2.5 py-1 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          Phase 1: React Flow Canvas
        </span>
        <a
          href="https://github.com/Mayank3613/CodeBrix"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}