import { cn } from "@/lib/utils";

export const boxCn = (error?: string) =>
  cn(
    "flex min-h-[46px] w-full items-center gap-2 rounded-lg border bg-white px-3 text-sm text-[#1a1d25] transition-colors",
    "focus-within:border-[#3a47c2] focus-within:ring-1 focus-within:ring-[#3a47c2]",
    "has-[:disabled]:bg-[#f8faff] has-[:disabled]:text-[#656972]",
    error ? "border-red-400" : "border-[#e3e5ea]",
  );

export const bareInputCn = "min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-[#8f929d] disabled:cursor-not-allowed";
