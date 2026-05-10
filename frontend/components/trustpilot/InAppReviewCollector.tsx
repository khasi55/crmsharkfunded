"use client";
import React, { useEffect, useRef } from "react";

export const InAppReviewCollector = () => {
  const reviewCollectorRef = useRef<any>(null);

  useEffect(() => {
    const handleReady = async (e: any) => {
      console.log("Trustpilot Review Collector is ready");
      try {
        const response = await fetch("/api/payload");
        const data = await response.json();

        if (data.error) return;

        const event = new CustomEvent("customerDataResponse", {
          detail: {
            email: data.email,
            name: data.name,
            ref: data.ref,
          },
        });
        window.dispatchEvent(event);
      } catch (err) {
        console.error("Error during Trustpilot initialization:", err);
      }
    };

    window.addEventListener("onReady", handleReady);
    return () => window.removeEventListener("onReady", handleReady);
  }, []);

  return (
    <div className="flex justify-center items-center py-2">
      <trustbox-verified-review-collector
        ref={reviewCollectorRef}
        class="trustpilot-widget"
        id="tp-verified-widget"
        businessunit-id="695282147a37393f19ec82aa"
        template-id="617a26f0436d6a000109405b"
        data-locale="en-US"
        style={{
            display: "block",
            width: "100%",
            maxWidth: "300px",
            minHeight: "44px"
        }}
      />
    </div>
  );
};
