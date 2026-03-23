import { GoogleGenAI, Type } from "@google/genai";

// The master template for the system instructions
const MASTER_PROMPT_TEMPLATE = `
You are GPT.

# GPT Prompter Knowledge Instructions:

# BACKGROUND INFO:
- You are [BOT_NAME], a cheerful, warm, and professional Virtual Receptionist for [BUSINESS_NAME].

# CONVERSATION OBJECTIVES:
1. Collect Caller's name, email, and specific inquiry according to **CONVERSATION FLOW**.
2. VITAL: At the end of the demo, always attempt to schedule a [CONSULT/APPOINTMENT/DISCOVERY CALL].
3. Use the appropriate tool when a Caller's query matches a configured tool trigger.

# RULES FOR HANDLING CALLER QUERIES:
- If Caller asks a question, offer confirmation that you will answer their question, then immediately ask for their first name. After you have gathered their first name, then move on to gather their email address.
- ONLY once you have gathered both first name, and email address, or they have declined to provide that information twice, may you proceed to answer.
- If the Caller asks a question, check whether the question matches a tool's trigger condition.
1. If the question matches a tool's trigger condition:
- Use the tool immediately, but first gather their first name and email address before continuing.
2. If no tools are available OR the question does not match a tool's trigger condition:
- Politely inform the Caller that a team member will reach out to them with an answer.
- Redirect the conversation back to gathering the remaining contact info, without engaging in further details about the question.

# CONVERSATION RULES:
- CRITICAL: Ask ONLY One Question at a Time. Never ask two questions in the same message. Wait for the user's answer before proceeding to the next question.
- Collect one piece of info before moving on.
- Sales Methods: Use Challenger Sale and NEPQ strategies to persuade leads and handle objections.
- Proactive Tone: Lead the conversation, ending with a question or next step.
- Active Listening: Address Caller's needs based on the information they provide.
- Tone and Style: Be warm, friendly, and professional. Use natural, conversational language but maintain a helpful and competent demeanor. Avoid slang or overly casual phrases. Do not be robotic or stiff.
- Take a breath and think before you speak.
- Stay Focused: Respond succinctly with provided info. Do not confirm/infer/guess any details that are not explicitly stated.
- Spam Callers: For sales or spam offers, say, "Thanks, but we're not interested. Take us off your list immediately," and END CALL.

# CALL CONCLUSION:
- Instruction: End the call once Caller's questions are answered and details collected. Thank them, and wish them a pleasant day.

# CONVERSATION FLOW
Agent's initial message: "[INITIAL_MESSAGE]"
After Caller response, politely request Caller's First and Last Name.
Greet Caller by first name.
If you know the reason for the call SKIP THIS STEP, otherwise request a detailed description of the issue.
Request their email.
Engage with Discovery Questions:
- Ask these questions ONE BY ONE. Do not group them:
- [DISCOVERY_QUESTIONS]
- Would you like to schedule a [CONSULT/APPOINTMENT] or would you prefer to be transferred to a team member?

# COMPANY INFO:
- Company Name: [BUSINESS_NAME]
- Company Email: [BUSINESS_EMAIL]
- Company Phone: [BUSINESS_PHONE]
- Company Website: [BUSINESS_WEBSITE]
- Company Address: [BUSINESS_ADDRESS]
- Company Hours: [BUSINESS_HOURS]
- Company Services: [COMPANY_SERVICES]

# ANSWERING QUESTIONS ABOUT SERVICES:
If the caller has questions about our services or products, provide accurate information based on [BUSINESS_NAME]'s website.
`;

/**
 * Robust URL cleaning to handle mobile pastes, tracking params, and incomplete strings.
 */
const cleanWebsiteUrl = (url) => {
  let cleaned = url.trim();
  // Remove trailing slashes and common tracking parameters
  cleaned = cleaned.split('?')[0].replace(/\/$/, '');

  if (!cleaned.startsWith('http')) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
};

/**
 * Firecrawl Scrape Fallback
 * Used when Google Search grounding is insufficient or blocked.
 */
const firecrawlScrape = async (url) => {
  const apiKey = process.env.firecrawl_key;
  if (!apiKey) {
    console.warn("[Firecrawl] No API key found in environment.");
    return null;
  }

  try {
    console.log(`[Firecrawl] Initiating deep scrape for ${url}...`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000
      })
    });

    if (!response.ok) {
      console.error(`[Firecrawl] Scrape failed with status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data?.markdown || null;
  } catch (e) {
    console.error("[Firecrawl] Network error during scrape:", e);
    return null;
  }
};

/**
 * Main analysis function
 */
export const analyzeWebsite = async (url) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanedUrl = cleanWebsiteUrl(url);
  let attempt = 0;
  const maxRetries = 1;

  while (attempt <= maxRetries) {
    try {
      console.log(`[Analysis] Attempt ${attempt + 1} for ${cleanedUrl}`);

      // STEP 1: GATHER RAW DATA (Primary: Search Tool)
      const searchResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Search for this business website: ${cleanedUrl}.
                   Identify their official company name, services, contact details (email/phone),
                   operating hours, and brand personality. Also identify 2 discovery questions.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      let rawInfo = searchResponse.text;
      const sourcesFound = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.length || 0;

      // CHECK: If Google Search returned very little, trigger FIRECRAWL
      if (sourcesFound < 2 || (rawInfo && rawInfo.length < 300)) {
        console.log("[Analysis] Search grounding insufficient. Activating Firecrawl Deep Scrape...");
        const crawlData = await firecrawlScrape(cleanedUrl);
        if (crawlData) {
          rawInfo = `PRIMARY SOURCE DATA (WEB SCRAPE):\n${crawlData}\n\nSEARCH METADATA:\n${rawInfo}`;
        }
      }

      if (!rawInfo) throw new Error("No data gathered from search or crawl");

      // STEP 2: STRUCTURE DATA (Strict JSON Schema)
      const structResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on this research data, generate a complete persona for an AI Employee.
                   The business URL is ${cleanedUrl}.
                   DATA:\n${rawInfo}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING },
              botName: { type: Type.STRING },
              services: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              address: { type: Type.STRING },
              hours: { type: Type.STRING },
              discoveryQuestions: { type: Type.STRING },
              initialMessage: { type: Type.STRING },
              brandColor: { type: Type.STRING, description: "Hex color code e.g. #2563EB" }
            },
            required: ["companyName", "botName", "initialMessage", "services", "discoveryQuestions"]
          }
        }
      });

      const data = JSON.parse(structResponse.text || '{}');

      // Populate Template
      const systemInstruction = MASTER_PROMPT_TEMPLATE
        .replace(/\[BOT_NAME\]/g, data.botName || 'Jessica')
        .replace(/\[BUSINESS_NAME\]/g, data.companyName || 'the business')
        .replace(/\[INITIAL_MESSAGE\]/g, data.initialMessage || `Hi! Thanks for reaching out to ${data.companyName}. How can I help?`)
        .replace(/\[BUSINESS_EMAIL\]/g, data.email || '')
        .replace(/\[BUSINESS_PHONE\]/g, data.phone || '')
        .replace(/\[BUSINESS_WEBSITE\]/g, cleanedUrl)
        .replace(/\[BUSINESS_ADDRESS\]/g, data.address || 'Online')
        .replace(/\[BUSINESS_HOURS\]/g, data.hours || '24/7')
        .replace(/\[COMPANY_SERVICES\]/g, data.services || '')
        .replace(/\[DISCOVERY_QUESTIONS\]/g, data.discoveryQuestions || '');

      const persona = {
        companyName: data.companyName || 'New Partner',
        systemInstruction,
        initialMessage: data.initialMessage || `Hi! I'm ${data.botName}, how can I help you today?`,
        brandColor: data.brandColor || '#EAB308'
      };

      const sources = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => chunk.web)
        .filter(web => !!web)
        .map(web => ({ title: web.title || 'Source', uri: web.uri || '#' })) || [];

      return { persona, sources };

    } catch (error) {
      console.warn(`[Analysis] Step failed on attempt ${attempt + 1}:`, error);
      attempt++;
      if (attempt > maxRetries) break;
      await new Promise(res => setTimeout(res, 1500 * attempt));
    }
  }

  // STEP 3: FINAL FALLBACK (Last Resort)
  console.warn("[Analysis] All steps failed. Using fallback generation.");
  const domain = cleanedUrl.replace(/^https?:\/\/(www\.)?/, '').split('.')[0];
  const companyName = domain.charAt(0).toUpperCase() + domain.slice(1);

  return {
    persona: {
      companyName,
      initialMessage: `Hi there! Thanks for visiting ${companyName}. I'm your AI assistant, how can I help you today?`,
      brandColor: '#EAB308',
      systemInstruction: MASTER_PROMPT_TEMPLATE
        .replace(/\[BOT_NAME\]/g, 'Assistant')
        .replace(/\[BUSINESS_NAME\]/g, companyName)
        .replace(/\[INITIAL_MESSAGE\]/g, `Hello! Welcome to ${companyName}.`)
        .replace(/\[BUSINESS_WEBSITE\]/g, cleanedUrl)
        .replace(/\[COMPANY_SERVICES\]/g, 'our products and services')
        .replace(/\[DISCOVERY_QUESTIONS\]/g, 'What brings you to our site today?')
    },
    sources: []
  };
};
