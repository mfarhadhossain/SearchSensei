const OPEN_AI_API_KEY = 'Your_API_KEY';

interface SensitivityTerm {
    entity_type: string; // Category from the taxonomy
    text: string; // Detected entity text
    replace: string; // Placeholder for replacement
    abstract: string; // Abstracted version of the entity
}

// Sensitivity analysis result interface
interface SensitivityAnalysis {
    isSensitive: boolean;
    results: SensitivityTerm[];
}

const CATEGORY_MAPPING: { [key: string]: string[] } = {
    'Personal identification': [
        'NAME',
        'ADDRESS',
        'EMAIL',
        'PHONENUMBER',
        'ID',
        'ONLINEIDENTITY',
    ],
    'Financial information': ['FINANCIALINFORMATION'],
    'Biometric data': ['BIOMETRICDATA'],
    'Location data': ['GEO-LOCATION'],
    'Health information': ['HEALTHINFORMATION'],
    'Racial or ethnic origin': ['RACIAL_OR_ETHNIC_ORIGIN'],
    'Political opinions': ['POLITICAL_OPINION'],
    'Religious beliefs': ['RELIGIOUS_BELIEF'],
    'Sexual orientation': ['SEXUAL_ORIENTATION'],
    'Trade-Union membership': ['TRADE_UNION_MEMBERSHIP'],
};

const TAXONOMY_DEFINITIONS: { [key: string]: string } = {
    NAME: 'Name',
    ADDRESS: 'Physical address',
    EMAIL: 'Email address',
    PHONENUMBER: 'Phone number',
    ID: 'Identifiers, including ID Number, passport number, SSN, driver’s license, taxpayer identification number',
    ONLINEIDENTITY: 'IP address, username, URL, password, key',
    'GEO-LOCATION':
        'Places and locations, such as cities, provinces, countries, international regions, or named infrastructures (bus stops, bridges, etc.)',
    AFFILIATION:
        'Names of organizations, such as public and private companies, schools, universities, public institutions, prisons, healthcare institutions, non-governmental organizations, churches, etc.',
    RACIAL_OR_ETHNIC_ORIGIN: 'Information about a person’s race or ethnicity.',
    POLITICAL_OPINION:
        'Details about a person’s political opinions or affiliations.',
    RELIGIOUS_BELIEF:
        'Information regarding a person’s religious beliefs or affiliations.',
    SEXUAL_ORIENTATION:
        'Details about a person’s sexual orientation or gender identity.',
    TRADE_UNION_MEMBERSHIP:
        'Information about a person’s membership in trade unions.',
    TIME: 'Description of a specific date, time, or duration',
    HEALTHINFORMATION:
        'Details concerning an individual’s health status, medical conditions, treatment records, and health insurance information',
    FINANCIALINFORMATION:
        'Financial details such as bank account numbers, credit card numbers, investment records, salary information, and other financial statuses or activities',
    EDUCATIONALRECORD:
        'Educational background details, including academic records, transcripts, degrees, and certification',
    BIOMETRICDATA:
        'Biometric data such as fingerprints, facial recognition data, retinal scans, etc.',
    // Add other definitions as needed
};

// Function to analyze text sensitivity using OpenAI
async function analyzeSensitivity(query: string): Promise<SensitivityAnalysis> {
    const taxonomy = await getUserSelectedTaxonomy();

    const systemPrompt =
        `You are an expert in cybersecurity and data privacy. You are now tasked to detect PII from the given text, using the following taxonomy:
        ${taxonomy}`;

    const userPrompt =
        `User Search Query: ${query}
        
        Instructions:
        
        - For the given search query that a user sends to a search engine, identify all the personally identifiable information using the above taxonomy only. Note that the information should be related to a real person not in a public context, but okay if not uniquely identifiable. Result should be in its minimum possible unit.
        - For each detected entity, provide:
          - "entity_type": should be selected from the all-caps categories
          - "text": the exact text of the entity in the message
          - "replace": the placeholder in the format "[CATEGORY]"
          - "abstract": an abstracted version of the entity (e.g., generalization)
        
        - Return ONLY a JSON in the following format:
        {
          "isSensitive": true (true only if it matches at least one category) or false,
          "results": [
            {
              "entity_type": "CATEGORY",
              "text": "DETECTED_ENTITY_TEXT",
              "replace": "[CATEGORY]",
              "abstract": "ABSTRACTED_VERSION"
            },
            ...
          ]
        }`;

    try {
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
                            content: systemPrompt,
                        },
                        {
                            role: 'user',
                            content: userPrompt,
                        },
                    ],
                    max_tokens: 10000,
                }),
            }
        );

        if (!completion.ok) {
            throw new Error(`API request failed: ${completion.statusText}`);
        }

        const data = await completion.json();

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid API response format');
        }

        // Remove the backticks if they are present
        const content = data.choices[0].message.content
            .replace(/```json\s*([\s\S]*?)```/g, '$1')
            .trim();
        console.log('Assistant content:', content);

        try {
            const result = JSON.parse(content);
            console.log('Parsed JSON:', result);
            return result as SensitivityAnalysis;
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            throw new Error('Failed to parse JSON content from OpenAI response');
        }
    } catch (error) {
        console.error('Error analyzing sensitivity:', error);
        // Return a safe default in case of error
        return {
            isSensitive: false,
            results: [],
        };
    }
}

async function abstractSensitiveInformation(
    text: string,
    entities: SensitivityTerm[]
): Promise<string> {
    const protectedInfo = entities.map((e) => e.text).join(', ');

    const systemPrompt = `Rewrite the text to abstract the protected information, and don't change other parts, directly return the text in JSON format: {"text": REWRITE_TEXT}`;

    const userPrompt = `[User:] Text: ${text}\nProtected information: ${protectedInfo}`;

    try {
        const completion = await fetch(
            'https://api.openai.com/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPEN_AI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Use an appropriate model
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt,
                        },
                        {
                            role: 'user',
                            content: userPrompt,
                        },
                    ],
                    max_tokens: 10000,
                }),
            }
        );

        if (!completion.ok) {
            throw new Error(`API request failed: ${completion.statusText}`);
        }

        const data = await completion.json();

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid API response format');
        }

        const content = data.choices[0].message.content
            .replace(/```json\n?/g, '')
            .replace(/```$/g, '')
            .trim();

        const result = JSON.parse(content);

        return result.text as string;
    } catch (error) {
        console.error('Error during abstraction:', error);
        return text;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === 'CHECK_SENSITIVITY') {
        console.log('Processing CHECK_SENSITIVITY message', message.query);
        (async () => {
            try {
                const analysis = await analyzeSensitivity(message.query);
                sendResponse({
                    success: true,
                    isSensitive: analysis.isSensitive,
                    analysis: analysis,
                });
            } catch (error) {
                sendResponse({
                    success: false,
                    isSensitive: false,
                    error: 'Error processing request',
                });
            }
        })();
    } else if (message.type === 'ABSTRACT_SENSITIVE_INFO') {
        (async () => {
            try {
                const abstractedText = await abstractSensitiveInformation(
                    message.text,
                    message.entities
                );
                sendResponse({
                    success: true,
                    abstractedText,
                });
            } catch (error) {
                sendResponse({
                    success: false,
                    error: 'Error processing abstraction request',
                });
            }
        })();
    }
    return true; // Keep message channel open for async response
});

async function getUserSelectedTaxonomy(): Promise<string> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['sensitiveCategories'], (result) => {
            const selectedCategories = result.sensitiveCategories || [];

            // Build taxonomy based on selected categories
            let taxonomy = '';
            selectedCategories.forEach((category: string) => {
                const taxonomyCategories = CATEGORY_MAPPING[category];
                if (taxonomyCategories) {
                    taxonomyCategories.forEach((taxCategory) => {
                        const definition = TAXONOMY_DEFINITIONS[taxCategory];
                        taxonomy += `- ${taxCategory}: ${definition}\n`;
                    });
                }
            });

            // If no categories selected, include all
            if (!taxonomy) {
                taxonomy = Object.keys(TAXONOMY_DEFINITIONS)
                    .map((key) => `- ${key}: ${TAXONOMY_DEFINITIONS[key]}`)
                    .join('\n');
            }

            resolve(taxonomy);
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

function isSearchQuery(details) {
  const url = new URL(details.url);

  // Google search query
  if (
      url.hostname.endsWith('google.com') &&
      url.pathname === '/search' &&
      url.searchParams.has('q')
  ) {
    return 'Google';
  }

  // Bing search query
  if (
      url.hostname.endsWith('bing.com') &&
      url.pathname === '/search' &&
      url.searchParams.has('q')
  ) {
    return 'Bing';
  }

  // DuckDuckGo search query
  if (
      url.hostname.endsWith('duckduckgo.com') &&
      url.pathname === '/' &&
      url.searchParams.has('q')
  ) {
    return 'DuckDuckGo';
  }

  return null;
}


chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        if (isSearchQuery(details)) {
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
    {urls: ['*://*.google.com/*', '*://*.bing.com/*', '*://*.duckduckgo.com/*']},
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
    if (['q', 'rlz', 'sxsrf', 'ei', 'geo', 'location'].includes(key)) {

      sensitiveDataPoints.push({
        name: key,
        type: 'parameter',
        value,
        purpose:
            key === 'q' ? 'User query (might contain sensitive data)' :
                key === 'geo' || key === 'location'
                    ? 'Location data' : 'Tracking/Session',
      });
    }
  }

  // Check request headers
  for (const header of requestHeaders) {
    if (
        ['User-Agent', 'sec-ch-ua', 'sec-ch-ua-platform', 'Referer', 'X-Client-Data'].includes(header.name)
    ) {
      sensitiveDataPoints.push({
        type: 'header',
        name: header.name,
        value: header.value || '',
        purpose: header.name === 'Referer'
            ? 'Reveals browsing history'
            : 'Provides user/device information',
      });
    }
  }

  chrome.cookies.getAll({}, (cookies) => {
    cookies.forEach((cookie) => {
      if (['SID', 'HSID', 'SSID', 'NID', 'APISID', 'SAPISID', 'CONSENT'].includes(cookie.name)) {
        sensitiveDataPoints.push({
          type: 'cookie',
          name: cookie.name,
          value: cookie.value,
          purpose: cookie.name === 'CONSENT'
              ? 'Tracks user consent status'
              : 'Authentication/Session tracking',
        });
      }
    });
  });

  if (sensitiveDataPoints.length > 0) {
    chrome.storage.local.set({
      dataMinimizationAlert: sensitiveDataPoints,
      discrepancyCount: sensitiveDataPoints.length,
    });
    // Update badge to show the number of discrepancies
    chrome.action.setBadgeText({text: sensitiveDataPoints.length.toString()});
    chrome.action.setBadgeBackgroundColor({color: '#FFFF00'});
  } else {
    // Clear badge if no discrepancies
    chrome.action.setBadgeText({text: ''});
  }
}
