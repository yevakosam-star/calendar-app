// Vercel serverless function. Runs server-side only — this is the one place
// the Anthropic API key is allowed to exist, since anything shipped to the
// client bundle is visible to anyone who opens the deployed site.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI is not set up yet — ANTHROPIC_API_KEY is missing on the server.' });
    return;
  }

  try {
    const { message, imageBase64, imageMediaType, today } = req.body ?? {};

    if (!message?.trim() && !imageBase64) {
      res.status(400).json({ error: 'Provide a message or a photo.' });
      return;
    }

    const content: any[] = [];
    if (imageBase64) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: imageMediaType || 'image/jpeg', data: imageBase64 },
      });
      content.push({
        type: 'text',
        text: message?.trim()
          ? `Read this photo of a schedule and extract every event/class/task visible in it. Extra instructions from the user: ${message.trim()}`
          : 'Read this photo of a schedule and extract every event/class/task visible in it.',
      });
    } else {
      content.push({ type: 'text', text: message.trim() });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2048,
        system: `Today is ${today ?? new Date().toISOString().slice(0, 10)}. Extract calendar events (things with a specific time, or all-day dated things like holidays/deadlines) and tasks (things to do with no fixed time) from what the user gives you — text, a photo of a schedule, or both. Resolve relative dates ("tomorrow", "next Friday") against today's date. Keep titles short and clean, without repeating the date/time in the title. If nothing extractable is found, call the tool with an empty items array — never explain in plain text instead.`,
        tools: [
          {
            name: 'extract_calendar_items',
            description: 'Extract calendar events and tasks found in the input',
            input_schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      kind: { type: 'string', enum: ['event', 'task'] },
                      title: { type: 'string' },
                      date: { type: 'string', description: 'yyyy-MM-dd' },
                      allDay: { type: 'boolean' },
                      startTime: { type: 'string', description: 'HH:mm 24-hour; omit for all-day events or tasks' },
                      endTime: { type: 'string', description: 'HH:mm 24-hour; omit for all-day events or tasks' },
                      category: {
                        type: 'string',
                        enum: ['work', 'personal', 'content'],
                        description: 'only set for kind=task',
                      },
                    },
                    required: ['kind', 'title', 'date'],
                  },
                },
              },
              required: ['items'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'extract_calendar_items' },
        messages: [{ role: 'user', content }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      res.status(502).json({ error: `Claude API error: ${errText.slice(0, 300)}` });
      return;
    }

    const data = await anthropicRes.json();
    const toolUse = data.content?.find((block: any) => block.type === 'tool_use');
    const items = toolUse?.input?.items ?? [];
    res.status(200).json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Something went wrong' });
  }
}
