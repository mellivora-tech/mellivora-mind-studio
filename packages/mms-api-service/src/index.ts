import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.get('/health', (c) => c.json({ status: 'ok', service: 'mms-api-service' }))

// TODO: Routes
// app.route('/funds', fundRoutes)
// app.route('/reports', reportRoutes)

const port = process.env.PORT || 3001
console.log(`🚀 API Service running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
