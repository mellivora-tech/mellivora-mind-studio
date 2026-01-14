import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors())

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// Routes
app.get('/', (c) => c.json({ message: 'Mellivora Mind Studio API Gateway' }))

// TODO: Route to services
// app.route('/api/agent', agentRoutes)
// app.route('/api/fund', fundRoutes)
// app.route('/api/user', userRoutes)
// app.route('/api/auth', authRoutes)

const port = process.env.PORT || 3000
console.log(`🚀 API Gateway running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
