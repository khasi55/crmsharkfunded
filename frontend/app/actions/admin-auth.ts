"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAdmin(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    const supabase = await createClient();

    // Query the admin_users table
    // WARNING: In a real production app, passwords should be hashed (e.g., bcrypt).
    // The user explicitly asked to "check the details mail password name according to that login the user"
    // suggesting a direct check for now. We will implement direct check but strongly advise hashing.
    // Use RPC to call the security definer function
    // This bypasses RLS on the table itself
    const { data: user, error } = await supabase
        .rpc("verify_admin_credentials", {
            email_input: email,
            password_input: password,
        })
        .single();

    if (error || !user) {
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

    redirect("/admin/dashboard");
}

export async function logoutAdmin() {
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    redirect("/admin-login");
}
