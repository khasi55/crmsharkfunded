import Sidebar from "@/components/layout/Sidebar";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen bg-bg-main">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen relative">
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
