module.exports = {
  apps: [
    {
      name: "filesharing",
      script: "server.js",
      instances: 1, // Single instance required for in-memory rate limiting and Socket.io room state
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
