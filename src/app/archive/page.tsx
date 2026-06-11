"use client";

import { useRouter } from "next/navigation";
import ArchiveGallery from "../../components/ArchiveGallery";

export default function ArchivePage() {
    const router = useRouter();

    return (
        <main className="flex min-h-screen flex-col items-center bg-slate-950 text-slate-50 p-4 pb-12 antialiased">
            {/* Header Panel */}
            <div className="flex items-center justify-between w-full max-w-[400px] mb-8 px-1 mt-6">
                <div className="flex flex-col text-left">
                    <h1 className="text-3xl font-black text-white uppercase tracking-wider leading-none">
                        Match History
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest mt-1 uppercase">
                        Your Scavenger Archives
                    </p>
                </div>

                <button
                    onClick={() => router.push("/")}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800text-white hover:text-slate-200 text-xs font-bold rounded-xl shadow-md transition-all tracking-wider active:scale-95 cursor-pointer"
                >
                    ← Back
                </button>
            </div>

            <ArchiveGallery activeResetTrigger={true} />
        </main>
    );
}