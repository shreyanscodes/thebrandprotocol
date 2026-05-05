import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, financialSummary } = req.body || {};

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  const systemPrompt = `You are TBP Finance AI, the financial assistant embedded in TBP Agency's private finance dashboard. TBP Agency is a creative/digital marketing agency run by two partners: Shreyan and Vismeid.

INCOME SPLIT RULES:
- Shared projects (50/50 split): income is divided equally between Shreyan and Vismeid. All agency expenses are also shared 50/50.
- Shreyan-only projects (100% Shreyan): income goes entirely to Shreyan. He still shares 50% of all expenses.

EARNINGS FORMULA:
- Shared net = Shared projects income − Total expenses
- Vismeid's net earnings = Shared net ÷ 2
- Shreyan's net earnings = (Shared net ÷ 2) + Shreyan-only income

CURRENT FINANCIAL SNAPSHOT:
${financialSummary}

RESPONSE STYLE:
- Be concise and direct — one or two short paragraphs max unless the question needs more detail
- Use Indian currency format: ₹ with lakhs (L) for 1,00,000+ and crores (Cr) for 1,00,00,000+
- No markdown bullet lists or headers — plain readable sentences
- If asked for a split/breakdown, present numbers cleanly in a sentence or two
- Be conversational but professional — you know these partners personally`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content: question.trim() }],
    });

    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    return res.status(200).json({ response: responseText });
  } catch (err) {
    console.error('Claude API error:', err);
    return res.status(500).json({ error: err.message || 'AI request failed' });
  }
}
