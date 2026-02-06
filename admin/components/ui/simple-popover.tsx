"use client"

import * as React from "react"

const PopoverContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => { } });

export const Popover = ({ children, open, onOpenChange }: any) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const finalOpen = isControlled ? open : internalOpen;
    const finalSetOpen = isControlled ? onOpenChange : setInternalOpen;

    return (
        <PopoverContext.Provider value={{ open: finalOpen, setOpen: finalSetOpen }}>
            <div className="relative inline-block">{children}</div>
        </PopoverContext.Provider>
    );
};

export const PopoverTrigger = React.forwardRef(({ children, asChild, ...props }: any, ref: any) => {
    const { open, setOpen } = React.useContext(PopoverContext);
    const element = asChild ? React.Children.only(children) : children;

    return React.cloneElement(element, {
        ...props,
        ref,
        onClick: (e: any) => {
            setOpen(!open);
            element.props.onClick?.(e);
        }
    });
});
PopoverTrigger.displayName = "PopoverTrigger";

export const PopoverContent = React.forwardRef(({ className, align = "center", ...props }: any, ref: any) => {
    const { open, setOpen } = React.useContext(PopoverContext);

    React.useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (open && !event.target.closest('.relative.inline-block')) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, setOpen]);

    if (!open) return null;

    return (
        <div
            ref={ref}
            className={`absolute z-50 mt-2 bg-white rounded-md shadow-lg border border-gray-200 ${align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2'
                } ${className}`}
            style={{ minWidth: 'max-content' }}
            {...props}
        />
    );
});
PopoverContent.displayName = "PopoverContent";
