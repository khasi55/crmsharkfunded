"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAdmin(formData: FormData) {
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString().trim();

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    const supabase = createAdminClient();

    // Direct query to admin_users table (Service Role bypasses RLS)
    // Checking plain text password as per requirements
    const { data: user, error } = await supabase
        .from("admin_users")
        .select("id, email, full_name, role, password")
        .eq("email", email)
        .maybeSingle();

    if (error) {
        console.error("Database error during login:", error);
        return { error: "An error occurred during login." };
    }

    if (!user || user.password !== password) {
        // User not found or password incorrect
        return { error: "Invalid credentials" };
    }

    // Set a session cookie
    const cookieStore = await cookies();
    // Use an explicit type cast or optional chaining if necessary, though 'user' is typed from RPC return
    const userId = (user as { id: string }).id;

    cookieStore.set("admin_session", userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24, // 1 day
        path: "/",
    });

    redirect("/dashboard");
}

export async function logoutAdmin() {
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    redirect("/login");
}
