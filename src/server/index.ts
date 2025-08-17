import { createServer, shutdownServer } from './fastify'

const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || '0.0.0.0'

async function start() {
  try {
    const server = await createServer()
    
    // Start the server
    await server.listen({ port: PORT, host: HOST })
    
    console.log(`🚀 Server running on http://${HOST}:${PORT}`)
    console.log(`📊 Health check available at http://${HOST}:${PORT}/health`)
    
    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`)
      await shutdownServer(server)
      process.exit(0)
    }
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
  } catch (error) {
    console.error('❌ Error starting server:', error)
    process.exit(1)
  }
}

start()
