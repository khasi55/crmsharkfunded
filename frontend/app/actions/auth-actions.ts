
'use server'

import { createClient } from "@/utils/supabase/server"

export interface ActionState {
    error?: string
    success?: boolean
    message?: string
}

export async function resetPasswordAction(formData: FormData): Promise<ActionState> {
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
        return { error: "Password is required" }
    }

    if (password !== confirmPassword) {
        return { error: "Passwords do not match" }
    }

    if (password.length < 6) {
        return { error: "Password must be at least 6 characters" }
    }

    try {
        const supabase = await createClient()

        // 1. Check Session (Server Side) which works with HttpOnly cookies
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
            console.error("❌ [ResetPasswordAction] No session found on server:", sessionError)
            return { error: "Session expired or invalid. Please request a new password reset link." }
        }

        console.log(`✅ [ResetPasswordAction] Verified session for: ${session.user.email}`)

        // 2. Update User
        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            console.error("❌ [ResetPasswordAction] Update failed:", error)
            return { error: error.message }
        }

        return { success: true, message: "Password updated successfully" }
    } catch (err: any) {
        console.error("❌ [ResetPasswordAction] Unexpected error:", err)
        return { error: "An unexpected error occurred" }
    }
}
