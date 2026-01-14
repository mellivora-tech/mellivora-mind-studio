import { VoltAgent, Agent } from '@voltagent/core'

import { createOpenAI } from '@ai-sdk/openai'
import { createResearchAgent } from './agents/research-agent'

// Configure OpenAI
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

const model = openai('gpt-4o')

// Initialize VoltAgent
new VoltAgent({
  agents: {
    research: createResearchAgent(model),
  },
})

const port = process.env.AGENT_PORT || 3141
console.log(`🤖 Agent Service running on http://localhost:${port}`)
