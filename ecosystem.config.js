
module.exports = {
    apps: [
        {
            name: "mt5-sync-worker",
            script: "./scripts/mt5-sync.ts",
            interpreter: "node",
            interpreter_args: "--import tsx", // Use tsx loader for TypeScript
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "production",
            },
            // Error handling
            exp_backoff_restart_delay: 100,
        },
    ],
};
