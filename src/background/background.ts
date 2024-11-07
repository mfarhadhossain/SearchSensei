// Sensitivity analysis result interface
interface SensitivityAnalysis {
  isSensitive: boolean;
  categories: string[];
  confidence: number;
  explanation: string;
  sanitizedQuery: string;
}

// GDPR sensitive data categories for the prompt
const GDPR_CATEGORIES = [
  'Personal identification',
  'Financial information',
  'Biometric data',
  'Location data',
  'Health information',
  'Racial or ethnic origin',
  'Political opinions',
  'Religious beliefs',
  'Sexual orientation',
  'Trade-Union membership',
];

// Function to analyze text sensitivity using OpenAI
async function analyzeSensitivity(query: string): Promise<SensitivityAnalysis> {
  const userCategories = await getUserSelectedCategories();
  const categories =
    userCategories.length > 0 ? userCategories : GDPR_CATEGORIES;

  console.log(`categories sent `, categories);
  const prompt = `
      Analyze if the following search query contains or implies personal information that is considered sensitive according to user-defined preferences.
      Consider ONLY the following categories as sensitive, as per user preferences: ${categories.join(
        ', '
      )}.

      Query: "${query}"

      If the query does not match any of the specified categories, respond with "isSensitive: false".
      Otherwise, respond in JSON format with:
      - isSensitive (boolean, true only if it matches at least one category)
      - categories (array of matched categories)
      - confidence (number between 0 and 1)
      - explanation (brief explanation)
      - sanitizedQuery (string, a version of the query where sensitive information is removed or abstracted, using replacement or abstraction techniques)

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
                'You are an expert in cybersecurity and data privacy, specializing in GDPR compliance analysis. Respond only in valid JSON format and avoid adding any explanatory text outside the JSON response.',
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
      sanitizedQuery: '',
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

// Function to fetch user-selected sensitive categories
async function getUserSelectedCategories(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sensitiveCategories'], (result) => {
      if (result.sensitiveCategories) {
        resolve(result.sensitiveCategories);
      } else {
        resolve([]); // Default to empty if no categories are selected
      }
    });
  });
}

const OPEN_AI_API_KEY = 'YOUR_API_KEY';
