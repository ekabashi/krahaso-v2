import OpenAI from 'openai'
import { getSystemPrompt, getParseableTextFormat } from './parsers/chatgpt'

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
  const timeout = Number(process.env.OPENAI_TIMEOUT_MS || '20000')
  const prompt = process.argv.slice(2).join(' ') || 'psh'
  const isGpt5 = model.startsWith('gpt-5')
  const gpt5Reasoning = { effort: 'medium' as const }

  const openai = new OpenAI({ apiKey, timeout })
  const today = new Date().toISOString().split('T')[0]

  const response = await openai.responses.create({
    model,
    input: [
      { role: 'system', content: getSystemPrompt(today) },
      { role: 'user', content: prompt }
    ],
    max_output_tokens: 500,
    ...(isGpt5 ? { reasoning: gpt5Reasoning, text: { format: { type: 'text' }, verbosity: 'low' } } : {})
  })

  const parseResponse = await openai.responses.parse({
    model,
    input: [
      { role: 'system', content: getSystemPrompt(today) },
      { role: 'user', content: prompt }
    ],
    max_output_tokens: 500,
    text: {
      format: getParseableTextFormat(),
      ...(isGpt5 ? { verbosity: 'low' } : {})
    },
    ...(isGpt5 ? { reasoning: gpt5Reasoning } : {})
  })

  const extracted = (response.output || [])
    .flatMap(item => Array.isArray((item as any).content) ? (item as any).content : [])
    .map((part: any) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim()

  console.log('model:', model)
  console.log('prompt:', prompt)
  console.log('output_text:', response.output_text || '<empty>')
  console.log('extracted_text:', extracted || '<empty>')
  console.log('usage:', response.usage || '<none>')
  console.log('output:', JSON.stringify(response.output ?? null))
  console.log('--- parse() ---')
  console.log('parsed_output_text:', parseResponse.output_text || '<empty>')
  console.log('parsed_output_parsed:', JSON.stringify(parseResponse.output_parsed ?? null))
  console.log('parsed_output:', JSON.stringify(parseResponse.output ?? null))
}

main().catch((error) => {
  console.error('[debug-openai] error:', error)
  process.exit(1)
})
