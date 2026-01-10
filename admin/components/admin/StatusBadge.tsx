import { cn } from "@/lib/utils";

export function StatusBadge({
    status,
    className,
}: {
    status: string;
    className?: string;
}) {
    const getStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved":
            case "passed":
            case "active":
                return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "pending":
            case "evaluation":
                return "bg-amber-50 text-amber-700 border-amber-200";
            case "rejected":
            case "breached":
            case "denied":
                return "bg-red-50 text-red-700 border-red-200";
            case "paid":
                return "bg-blue-50 text-blue-700 border-blue-200";
            default:
                return "bg-gray-50 text-gray-700 border-gray-200";
        }
    };

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize",
                getStyles(status),
                className
            )}
        >
            <span className={cn(
                "mr-1.5 h-1.5 w-1.5 rounded-full bg-current"
            )} />
            {status}
        </span>
    );
}
