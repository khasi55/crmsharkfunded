"use client";
import React, { useEffect, useRef } from "react";

export const InAppReviewCollector = () => {
  const reviewCollectorRef = useRef<any>(null);

  useEffect(() => {
    const initializeWidget = async () => {
      // Wait for the Trustpilot custom element to be defined
      if (typeof window !== "undefined" && "customElements" in window) {
        await customElements.whenDefined("trustbox-verified-review-collector");

        if (reviewCollectorRef.current) {
          reviewCollectorRef.current.onReady = async () => {
            try {
              const response = await fetch("/api/payload");
              if (!response.ok) throw new Error("Failed to fetch payload");
              
              const data = await response.json();

              if (reviewCollectorRef.current) {
                reviewCollectorRef.current.dispatchEvent(
                  new CustomEvent("customerDataResponse", {
                    detail: data,
                  })
                );
              }
            } catch (error) {
              console.error("Trustpilot Payload Error:", error);
            }
          };
        }
      }
    };

    initializeWidget();
  }, []);

  return (
    <div className="trustpilot-collector-wrapper">
      <trustbox-verified-review-collector
        ref={reviewCollectorRef}
        class="trustpilot-widget"
        id="tp-verified-widget"
        style-size="S"
        locale="en-US"
        template-id="53ch7c1d9be8a02f64d31e79"
        businessunit-id="695282147a37393f19ec82aa"
        style-width="100%"
        border-type="shadow"
        background="light"
        has-animated-stars="true"
      ></trustbox-verified-review-collector>
    </div>
  );
};
