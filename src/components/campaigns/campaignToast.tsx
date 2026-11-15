import { toast } from "sonner";
import { Check } from "lucide-react";

/** The dark toast the campaign screens use, with an optional Undo. */
export function campaignToast(message: string, onUndo?: () => void) {
  toast(message, {
    icon: <Check className="size-4 text-[#89d19d]" aria-hidden="true" />,
    action: onUndo ? { label: "Undo", onClick: onUndo } : undefined,
    classNames: {
      toast: "!bg-[#1a1d25] !text-white !border-transparent !rounded-lg !px-4 !py-3 !shadow-[0_8px_12px_rgba(26,29,37,0.24)] !w-fit !gap-3",
      title: "!text-sm !font-medium !leading-5",
      actionButton: "!bg-transparent !text-[#cad6fe] !text-[13px] !font-medium !px-0 !ml-2",
    },
  });
}
