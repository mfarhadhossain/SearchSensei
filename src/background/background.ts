// Sensitivity analysis result interface
interface SensitivityAnalysis {
  isSensitive: boolean;
  categories: string[];
  confidence: number;
  explanation: string;
}

// GDPR sensitive data categories for the prompt
const GDPR_CATEGORIES = [
  'Personal identification',
  'Location data',
  'Financial information',
  'Health information',
  'Biometric data',
  'Racial or ethnic origin',
  'Political opinions',
  'Religious beliefs',
  'Sexual orientation',
  'Criminal records',
];

// Function to analyze text sensitivity using OpenAI
async function analyzeSensitivity(query: string): Promise<SensitivityAnalysis> {
  const prompt = `
      Analyze if the following search query contains or implies GDPR-sensitive personal information.
      Consider these GDPR categories: ${GDPR_CATEGORIES.join(', ')}.

      Query: "${query}"

      Respond in JSON format with:
      - isSensitive (boolean)
      - categories (array of matched categories)
      - confidence (number between 0 and 1)
      - explanation (brief explanation)

      Only provide the JSON, no other text.
    `;

  try {
    console.log('Making OpenAI request for query:', query);
    const completion = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPEN_AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a GDPR compliance analyzer. Respond only in valid JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 150,
        }),
      }
    );
    console.log('after making request');

    console.log(completion);
    if (!completion.ok) {
      throw new Error(`API request failed: ${completion.statusText}`);
    }

    const data = await completion.json();
    console.log('OpenAI response:', data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response format');
    }

    // Remove the backticks if they are present
    const content = data.choices[0].message.content
      .replace(/```json\n/, '')
      .replace(/```$/, '')
      .trim();

    try {
      const result = JSON.parse(content);
      return result as SensitivityAnalysis;
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      throw new Error('Failed to parse JSON content from OpenAI response');
    }
  } catch (error) {
    console.error('Error analyzing sensitivity:', error);
    // Return a safe default in case of error
    return {
      isSensitive: true, // Err on the side of caution
      categories: ['Error in analysis'],
      confidence: 1,
      explanation:
        'Error during sensitivity analysis, treating as sensitive for safety',
    };
  }
}
console.log('Background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.type === 'CHECK_SENSITIVITY') {
    console.log('Processing CHECK_SENSITIVITY message');
    (async () => {
      try {
        const analysis = await analyzeSensitivity(message.query);
        sendResponse({
          success: true,
          isSensitive: analysis.isSensitive,
          analysis: analysis,
        });
        console.log('Sent response back to content script');
      } catch (error) {
        console.error('Error in message handler:', error);
        sendResponse({
          success: false,
          isSensitive: false,
          error: 'Error processing request',
        });
      }
    })();
    console.log('Sent response back to content script');
  }

  return true; // Keep message channel open for async response
});

const OPEN_AI_API_KEY = 'YOUR_API_KEY';
