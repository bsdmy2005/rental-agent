export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Handle unhandled promise rejections to prevent crashes
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      // Log the error but don't crash the process
      // This is especially important for database connection errors
      if (reason instanceof Error) {
        // Suppress connection timeout errors that are expected in serverless environments
        const errorWithCode = reason as Error & { code?: string }
        if (errorWithCode.code === 'CONNECT_TIMEOUT' || reason.message?.includes('CONNECT_TIMEOUT')) {
          console.warn('[DB] Connection timeout (non-fatal):', reason.message)
          return
        }
        console.error('[Unhandled Rejection]', reason.message, reason.stack)
      } else {
        console.error('[Unhandled Rejection]', reason)
      }
    })

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error)
      // Don't exit - let Next.js handle it
    })
  }
}
