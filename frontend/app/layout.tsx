import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PromoBanner from "@/components/layout/PromoBanner";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Dashboard | SharkFunded ",
    description: "SharkFunded Trading Platform",
    icons: {
        icon: "/shark-logo.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                {/* Axon Pixel Base Script */}
                <Script id="axon-pixel-init" strategy="afterInteractive">
                    {`
                        var AXON_EVENT_KEY = "393f6aeb-d829-47d0-8ae6-9fdcae6daa69";
                        !function(e,r){
                            var t=["https://s.axon.ai/pixel.js","https://res4.applovin.com/p/l/loader.iife.js"];
                            if(!e.axon){
                                var a=e.axon=function(){
                                    a.performOperation?a.performOperation.apply(a,arguments):a.operationQueue.push(arguments)
                                };
                                a.operationQueue=[],a.ts=Date.now(),a.eventKey=AXON_EVENT_KEY;
                                for(var n=r.getElementsByTagName("script")[0],o=0;o<t.length;o++){
                                    var i=r.createElement("script");
                                    i.async=!0,i.src=t[o],n.parentNode.insertBefore(i,n)
                                }
                            }
                        }(window,document);
                        axon("init");
                    `}
                </Script>
                {/* Google Tag Manager (GTM) - Placeholder */}
                {/* If you have a GTM ID, you can use the script below:
                <Script id="gtm-script" strategy="afterInteractive">
                    {\`
                        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                        })(window,document,'script','dataLayer','GTM-XXXXXXX');
                    \`}
                </Script>
                */}
            </head>
            <body className={inter.className}>
                <PromoBanner />
                {children}
            </body>
        </html>
    );
}
