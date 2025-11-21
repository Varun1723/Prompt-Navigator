// background.js

console.log('[PN] Background service worker loaded.');

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NLP_REQUEST') {
    console.log('[PN-BG] NLP Request received:', message.data);
    
    // Call the function to handle the API request
    handleNLPRequest(message.data)
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      
    // 'return true' tells Chrome to keep the message channel open for an async response
    return true;
  }
});

async function handleNLPRequest(data) {
  const { type, text, apiKey, provider } = data;
  
  if (!apiKey) {
    throw new Error('API key is missing.');
  }

  // Define the prompt for summarization
  const promptText = `Generate a concise, 5-8 word title for the following text. Do not add any other text, just the title. Text: """${text}"""`;
  
  if (provider === 'openai') {
    console.log('[PN-BG] Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // Use the user's key
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Use a fast and cheap model
        messages: [{ role: "user", content: promptText }],
        temperature: 0.3
      })
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('[PN-BG] API request failed:', responseData);
      throw new Error(responseData.error?.message || 'API request failed');
    }
    
    const summary = responseData.choices[0].message.content;
    console.log('[PN-BG] Summary received:', summary);
    
    // We only return the text content of the summary
    return { summary };
  }
  
  throw new Error('Unsupported provider');
}