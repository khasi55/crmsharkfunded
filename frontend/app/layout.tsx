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
                {/* Google Tag Manager */}
                <Script id="gtm-script" strategy="afterInteractive">
                    {`
                        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                        })(window,document,'script','dataLayer','GTM-WB5JVZNF');
                    `}
                </Script>

                {/* Meta Pixel Code */}
                <Script id="facebook-pixel" strategy="afterInteractive">
                    {`
                        !function(f,b,e,v,n,t,s)
                        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                        n.queue=[];t=b.createElement(e);t.async=!0;
                        t.src=v;s=b.getElementsByTagName(e)[0];
                        s.parentNode.insertBefore(t,s)}(window, document,'script',
                        'https://connect.facebook.net/en_US/fbevents.js');
                        fbq('init', '3399437100225491');
                        fbq('track', 'PageView');
                    `}
                </Script>
                <noscript>
                    <img height="1" width="1" style={{ display: 'none' }}
                        src="https://www.facebook.com/tr?id=3399437100225491&ev=PageView&noscript=1"
                    />
                </noscript>
            </head>
            <body className={inter.className}>
                {/* Google Tag Manager (noscript) */}
                <noscript>
                    <iframe 
                        src="https://www.googletagmanager.com/ns.html?id=GTM-WB5JVZNF"
                        height="0" 
                        width="0" 
                        style={{ display: 'none', visibility: 'hidden' }}
                    />
                </noscript>
                <PromoBanner />
                {children}
            </body>
        </html>
    );
}
