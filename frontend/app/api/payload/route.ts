import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessUnitId = process.env.TRUSTPILOT_BUSINESS_UNIT_ID || "695282147a37393f19ec82aa";
    
    return NextResponse.json({
      email: user.email || "",
      name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer",
      ref: user.id,
      businessUnitId
    });
  } catch (error) {
    console.error("Trustpilot payload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
