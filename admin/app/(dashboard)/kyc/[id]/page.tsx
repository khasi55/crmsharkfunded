"use client";

import { KYCReviewClient } from "@/components/admin/kyc/KYCReviewClient";
import { useParams } from "next/navigation";

export default function AdminKYCDetailsPage() {
    const params = useParams();
    const id = params?.id as string;

    return <KYCReviewClient id={id} />;
}

