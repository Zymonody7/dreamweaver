import { DreamAnalysis, Dream } from '../types'

// Get API key from environment
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_DOUBAO_API_KEY || ''
  }
  return process.env.DOUBAO_API_KEY || ''
}

// Doubao API endpoint
const DOUBAO_API_ENDPOINT =
  'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

// Helper function to call Doubao API
const callDoubaoAPI = async (
  messages: any[],
  model: string = 'doubao-seed-1-8-251228',
  temperature: number = 0.7
) => {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('Doubao API key not configured')
  }

  const response = await fetch(DOUBAO_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Doubao API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// Analyze dream text
export const analyzeDreamContent = async (
  text: string
): Promise<DreamAnalysis> => {
  const prompt = `
    Analyze the following dream description deeply.
    1. Identify key symbols (people, places, objects, actions) and interpret their potential subconscious meaning based on Jungian or general dream psychology.
    2. Analyze the underlying emotions and potential stressors.
    3. Rewrite the dream as a short, artistic creative story or poem.
    4. Extract key themes (e.g., Flying, Chase, Examination).

    Dream: "${text}"

    Please respond in JSON format with the following structure:
    {
      "symbols": [{"name": "string", "meaning": "string", "type": "person|place|object|action"}],
      "emotionalAnalysis": "string",
      "moods": ["string"],
      "creativeStory": "string",
      "themes": ["string"]
    }

    IMPORTANT: For each symbol, the "type" field MUST be exactly one of these four values: "person", "place", "object", or "action". Do not use compound types like "object/element" or any other variations.
  `

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert dream psychologist and analyst. Always respond in valid JSON format. For symbol types, only use: person, place, object, or action.'
    },
    { role: 'user', content: prompt }
  ]

  const responseText = await callDoubaoAPI(messages)

  try {
    // Try to parse JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as DreamAnalysis
    }
    throw new Error('No JSON found in response')
  } catch (error) {
    console.error('Failed to parse dream analysis:', error)
    throw new Error('Failed to analyze dream.')
  }
}

// Generate dream image using Doubao image generation API
export const generateDreamImage = async (
  description: string,
  themes: string[]
): Promise<string> => {
  const apiKey = getApiKey()

  if (!apiKey) {
    console.warn('Doubao API key not configured, using placeholder image')
    return generatePlaceholderImage(themes)
  }

  try {
    // Create a rich prompt for image generation
    const imagePrompt = `${description}. 主题: ${themes.join(', ')}. 超现实主义风格，梦幻氛围，深邃色彩，电影质感，光影效果，艺术感`

    const response = await fetch(
      'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'doubao-seedream-4-5-251128',
          prompt: imagePrompt,
          sequential_image_generation: 'disabled',
          response_format: 'url',
          size: '2K',
          stream: false,
          watermark: true
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Doubao image generation error:', error)
      return generatePlaceholderImage(themes)
    }

    const data = await response.json()

    // The API returns an array of images with URLs
    if (data.data && data.data.length > 0 && data.data[0].url) {
      return data.data[0].url
    }

    console.warn('No image URL in response, using placeholder')
    return generatePlaceholderImage(themes)
  } catch (error) {
    console.error('Error generating dream image:', error)
    return generatePlaceholderImage(themes)
  }
}

// Helper function to generate placeholder SVG image
const generatePlaceholderImage = (themes: string[]): string => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
  const color1 = colors[Math.floor(Math.random() * colors.length)]
  const color2 = colors[Math.floor(Math.random() * colors.length)]

  // Create a simple SVG gradient as placeholder
  const svg = `
    <svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#grad)" />
      <text x="50%" y="50%" text-anchor="middle" fill="white" font-size="24" font-family="serif" opacity="0.8">
        ${themes[0] || 'Dream'}
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// Generate Universe Story
export const generateUniverseStory = async (
  dreams: string[]
): Promise<string> => {
  const prompt = `
    You are the Weaver of the Collective Unconscious.
    I will provide snippets of dreams. Some are from the user, some are "echoes" from the collective pool.
    Weave them together into a mysterious, coherent, surreal narrative that connects these disparate threads into a single "Dream Universe".

    Dream Fragments:
    ${JSON.stringify(dreams)}

    Write a beautiful, mystical story (300-500 words) that connects these dreams.

    **IMPORTANT**: Format your response in Markdown with:
    - Use **bold** for emphasis on key mystical concepts
    - Use *italics* for dream-like whispers and ethereal descriptions
    - Use paragraph breaks for better readability
    - You may use > blockquotes for particularly profound insights
    - Structure the narrative with natural flow
  `

  const messages = [
    {
      role: 'system',
      content:
        'You are a mystical storyteller who weaves dreams into coherent narratives. Always format your stories in beautiful Markdown.'
    },
    { role: 'user', content: prompt }
  ]

  const response = await callDoubaoAPI(messages, 'doubao-seed-1-8-251228', 0.9)
  return response || 'The weaver is silent...'
}

// Analyze Subconscious Patterns
export const analyzeSubconsciousPatterns = async (
  dreams: Dream[]
): Promise<string> => {
  if (dreams.length < 3)
    return 'Please record at least 3 dreams to unlock pattern analysis.'

  // Extract detailed information including symbols
  const summary = dreams.map((d) => ({
    date: new Date(d.timestamp).toDateString(),
    mood: d.mood,
    themes: d.analysis?.themes || [],
    symbols: d.analysis?.symbols?.map(s => s.name) || [],
    clarity: d.clarity,
    realityConnection: d.realityConnection,
    emotionalTone: d.analysis?.emotionalAnalysis || ''
  }))

  // Extract all unique themes and symbols for pattern analysis
  const allThemes = dreams.flatMap(d => d.analysis?.themes || [])
  const allSymbols = dreams.flatMap(d => d.analysis?.symbols?.map(s => s.name) || [])
  const themeFrequency = allThemes.reduce((acc, theme) => {
    acc[theme] = (acc[theme] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const symbolFrequency = allSymbols.reduce((acc, symbol) => {
    acc[symbol] = (acc[symbol] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const prompt = `
    You are an expert Dream Psychologist specializing in pattern recognition and symbolic connections.

    Analyze these dream journal entries to find hidden patterns and connections:

    Dream Data: ${JSON.stringify(summary)}

    Theme Frequency: ${JSON.stringify(themeFrequency)}
    Symbol Frequency: ${JSON.stringify(symbolFrequency)}

    Please provide a Markdown formatted report with the following sections:

    ## 🔗 Interconnected Patterns
    Identify how different themes and symbols connect across dreams. For example:
    - "Water appears in 3 dreams, always linked with themes of Transformation and Anxiety"
    - "Flying dreams correlate with periods of high clarity and positive moods"

    ## 💭 Emotional Triggers
    Connect moods to specific themes and symbols (e.g., "When you feel Anxious, you tend to dream about Water and Confined Spaces").

    ## 🔄 Recurring Motifs
    Highlight symbols or themes that appear multiple times and explain their potential psychological significance.

    ## 🌍 Global Comparison
    Briefly contrast these patterns with common human dream archetypes (e.g., "Unlike typical falling dreams representing loss of control, your dreams focus on...").

    ## 🔮 Reality-Dream Bridge
    Analyze correlations between 'realityConnection' notes and dream patterns. Do certain real-life events trigger specific dream themes?

    Use **bold** for key insights, *italics* for symbolic interpretations, and > blockquotes for profound psychological observations.
    Keep it insightful, mystical, yet grounded in Jungian and modern dream psychology. Max 400 words.
  `

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert dream psychologist specializing in pattern recognition, symbolic connections, and subconscious analysis. You excel at finding meaningful relationships between disparate dream elements.'
    },
    { role: 'user', content: prompt }
  ]

  const response = await callDoubaoAPI(messages)
  return response || 'Could not analyze patterns.'
}
