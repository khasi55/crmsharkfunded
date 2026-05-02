import { redirect } from "next/navigation";

export default function Home() {
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Redirecting to Dashboard...</h1>
            <p>If you are not redirected automatically, <a href="/dashboard">click here</a>.</p>
            <script dangerouslySetInnerHTML={{
                __html: `window.location.href = '/dashboard';`
            }} />
        </div>
    );
}
