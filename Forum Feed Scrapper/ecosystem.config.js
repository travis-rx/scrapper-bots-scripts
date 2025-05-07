module.exports = {
    apps: [
        {
            name: "Study Bae",
            script: "npm",
            automation: false,
            args: "run start",
            env: {
                NODE_ENV: "development"
            },
            env_production: {
                NODE_ENV: "production"
            }
        }
    ]
}