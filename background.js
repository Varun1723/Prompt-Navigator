// background.js - Hybrid Edition (OpenAI + Gemini)
console.log('[PN] Background service worker loaded.');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NLP_REQUEST') {
    handleNLPRequest(message.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleNLPRequest(data) {
  const { text, apiKey, provider } = data; // We now accept a 'provider' param
  
  if (!apiKey) throw new Error('API key is missing.');

  const prompt = `Generate a concise, 5-8 word title for this text. No quotes. Text: """${text}"""`;

  // --- OPTION A: OPENAI ---
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });
    
    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || 'OpenAI Error');
    return { summary: json.choices[0].message.content.replace(/"/g, '') };
  }

  // --- OPTION B: GEMINI ---
  else if (provider === 'gemini') {
    // Attempting to use the standard 'gemini-pro' if flash fails, or vice versa.
    // We'll stick to 1.5-flash for speed, but you can swap to 'gemini-1.0-pro' if needed.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || 'Gemini Error');
    
    const summary = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!summary) throw new Error('Gemini returned no text');
    return { summary: summary.trim() };
  }

  throw new Error('Invalid Provider Selected');
}