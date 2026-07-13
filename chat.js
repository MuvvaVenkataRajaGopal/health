const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

const SYSTEM_PROMPT = `You are NutriSense AI, an expert nutrition and health assistant. You provide personalized advice about:
- Meal planning and nutrition
- Weight management (loss/gain)
- Diet recommendations based on health conditions
- Exercise suggestions
- Food nutrition information
- Healthy recipe ideas

Always give practical, actionable advice. When suggesting meal plans, include approximate calories and macros. Format responses clearly with sections. Keep responses concise but helpful. If a user mentions a medical condition, remind them to consult a healthcare professional.`;

router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      const fallbackResponse = generateFallbackResponse(message);
      return res.json({ reply: fallbackResponse });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nUser: ' + message }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const data = await response.json();
    if (data.candidates && data.candidates[0]) {
      const reply = data.candidates[0].content.parts[0].text;
      return res.json({ reply });
    }

    res.json({ reply: generateFallbackResponse(message) });
  } catch (error) {
    console.error('AI Error:', error.message);
    res.json({ reply: generateFallbackResponse(req.body.message) });
  }
});

function generateFallbackResponse(message) {
  const lower = message.toLowerCase();
  if (lower.includes('lose') || lower.includes('weight loss')) {
    return `Based on your query, here's a weight loss plan:\n\n**Daily Calorie Target:** ~1,500-1,800 kcal (depending on your stats)\n\n**Meal Plan:**\n- Breakfast: Oatmeal with berries (350 kcal)\n- Lunch: Grilled chicken salad (450 kcal)\n- Snack: Greek yogurt (150 kcal)\n- Dinner: Fish with vegetables (500 kcal)\n\n**Tips:**\n- Drink 3L water daily\n- Walk 10,000 steps\n- Sleep 7-8 hours\n- Avoid processed foods\n\nConsult a healthcare professional for personalized advice.`;
  }
  if (lower.includes('gain') || lower.includes('muscle')) {
    return `Here's a muscle building nutrition plan:\n\n**Daily Calorie Target:** ~2,500-3,000 kcal\n\n**Meal Plan:**\n- Breakfast: Eggs + toast + banana (500 kcal)\n- Lunch: Chicken breast + rice + veggies (650 kcal)\n- Snack: Protein shake + nuts (400 kcal)\n- Dinner: Salmon + sweet potato (600 kcal)\n\n**Key Macros:**\n- Protein: 1.6-2g per kg bodyweight\n- Carbs: 4-6g per kg\n- Fats: 0.8-1g per kg`;
  }
  return `Thanks for your question! Here are some general nutrition tips:\n\n1. Eat a balanced diet with protein, carbs, and healthy fats\n2. Stay hydrated - aim for 8 glasses of water daily\n3. Include fruits and vegetables in every meal\n4. Control portion sizes\n5. Limit processed foods and added sugars\n\nFor personalized advice, tell me about your goals, current weight, and any dietary restrictions!`;
}

module.exports = router;
