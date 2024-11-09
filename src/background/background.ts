const OPEN_AI_API_KEY = 'YOURKEY';
interface SensitivityTerm {
  term: string;
  category: string;
  startIndex: number;
  endIndex: number;
  replace: string;
  abstract: string;
}
// Sensitivity analysis result interface
interface SensitivityAnalysis {
  isSensitive: boolean;
  categories: string[];
  confidence: number;
  explanation: string;
  sanitizedQuery: string;
  sensitiveTerms?: SensitivityTerm[];
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
      - sensitiveTerms (array of objects), each with:
          - term (string, the sensitive term)
          - category (string, the category it matches)
          - startIndex (number, the starting index of the term in the query)
          - endIndex (number, the ending index of the term in the query)
          - replace (string, the term replaced with a placeholder, e.g., "[CATEGORY]")
          - abstract (string, an abstracted version of the term)

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
          max_tokens: 250,
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

async function isDataMinimizationEnabled(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['enableDataMinimization'], (result) => {
      resolve(!!result.enableDataMinimization);
    });
  });
}

function isSearchQuery(
  details: chrome.webRequest.WebRequestHeadersDetails
): boolean {
  const url = new URL(details.url);
  return (
    details.method === 'GET' &&
    url.hostname.endsWith('google.com') &&
    url.pathname === '/search' &&
    url.searchParams.has('q')
  );
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    if (isSearchQuery(details)) {
      console.log(`Details are: `, details);
      isDataMinimizationEnabled().then((enabled) => {
        if (!enabled) {
          return;
        }
        // Capture headers and parameters
        const requestHeaders = details.requestHeaders || [];
        const urlParams = new URLSearchParams(new URL(details.url).search);

        // Proceed to comparison logic
        compareDataCollection(details, requestHeaders, urlParams);
      });
    }
  },
  { urls: ['*://*.google.com/*'] },
  ['requestHeaders']
);

function compareDataCollection(
  details: chrome.webRequest.WebRequestHeadersDetails,
  requestHeaders: chrome.webRequest.HttpHeader[],
  urlParams: URLSearchParams
) {
  const sensitiveDataPoints: {
    name: string;
    type: string;
    value: string;
    purpose: string;
  }[] = [];

  // Check URL parameters
  for (const [key, value] of urlParams.entries()) {
    if (['q', 'rlz', 'sxsrf', 'ei'].includes(key)) {
      sensitiveDataPoints.push({
        name: key,
        type: 'parameter',
        value,
        purpose:
          key === 'q' ? 'User query (sensitive content)' : 'Tracking/Session',
      });
    }
  }

  // Check request headers
  for (const header of requestHeaders) {
    if (
      ['User-Agent', 'sec-ch-ua', 'sec-ch-ua-platform'].includes(header.name)
    ) {
      sensitiveDataPoints.push({
        type: 'header',
        name: header.name || '',
        value: header.value || '',
        purpose: 'Provides user/device information',
      });
    }
  }
  chrome.cookies.getAll({}, (cookies) => {
    cookies.forEach((cookie) => {
      if (['SID', 'HSID', 'SSID', 'NID'].includes(cookie.name)) {
        sensitiveDataPoints.push({
          type: 'cookie',
          name: cookie.name,
          value: cookie.value,
          purpose: 'Session tracking/personalization',
        });
      }
    });
  });
  console.log(`Sensitive data points`, sensitiveDataPoints);
  if (sensitiveDataPoints.length > 0) {
    chrome.storage.local.set({
      dataMinimizationAlert: sensitiveDataPoints,
      discrepancyCount: sensitiveDataPoints.length,
    });
    // Update badge to show the number of discrepancies
    chrome.action.setBadgeText({ text: sensitiveDataPoints.length.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#FFFF00' });
  } else {
    // Clear badge if no discrepancies
    chrome.action.setBadgeText({ text: '' });
  }
}
