exports.handler = async function(event) {
  const plate = (event.queryStringParameters?.plate || '').toUpperCase().replace(/\s/g, '');
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!plate) return { statusCode: 400, body: JSON.stringify({ error: 'No plate provided' }) };

  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' }
    });

    const data = await response.json();
    const contacts = data.contacts || [];

    const PLATE_ID  = 'i5dJ5scIr0pBROE8nslQ';
    const STATUS_ID = '96LLYXgqD2RuO5287zAb';
    const MAKE_ID   = 'DP3tVjiga7PPqKrztB0D';
    const MODEL_ID  = 'uJec2Q884qeBQ1lxHJ3U';

    const getVal = (fields, id) => {
      const f = fields.find(f => f.id === id);
      if (!f) return '';
      return Array.isArray(f.value) ? f.value[0] : f.value || '';
    };

    const match = contacts.find(c => {
      const val = getVal(c.customFields || [], PLATE_ID).toUpperCase().replace(/\s/g, '');
      return val === plate;
    });

    if (!match) return { statusCode: 200, body: JSON.stringify({ found: false }) };

    const fields = match.customFields || [];
    const status = getVal(fields, STATUS_ID);
    con
