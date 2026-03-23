#!/usr/bin/env node

// Test script for Modal API
const MODAL_API_URL = "https://kalerempel--booked-demo-analysis-fastapi-app.modal.run/analyze";

async function testModalAPI() {
  console.log("🧪 Testing Modal API...");
  console.log(`📍 URL: ${MODAL_API_URL}\n`);

  try {
    const response = await fetch(MODAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'staples.com'
      }),
    });

    console.log(`📊 Status: ${response.status}`);

    const text = await response.text();
    console.log(`📄 Raw response:\n${text}\n`);

    try {
      const json = JSON.parse(text);
      console.log('✅ Parsed JSON:');
      console.log(JSON.stringify(json, null, 2));

      if (json.success) {
        console.log(`\n🎉 Success! Generated persona for: ${json.data.persona.companyName}`);
        console.log(`📱 Initial Message: ${json.data.persona.initialMessage.substring(0, 80)}...`);
      } else {
        console.log(`\n❌ API returned error: ${json.error}`);
      }
    } catch (e) {
      console.log(`⚠️  Could not parse JSON: ${e.message}`);
    }

  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
  }
}

testModalAPI();
