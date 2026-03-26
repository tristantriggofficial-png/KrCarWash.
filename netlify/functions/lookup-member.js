exports.handler = async function(event) {
  const plate = (event.queryStringParameters?.plate || '').toUpperCase().replace(/\s/g, '');
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=10`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' }
    });
    const data = await response.json();
    const contacts = data.contacts || [];
    const debug = contacts.map(c => ({ name: `${c.firstName} ${c.lastName}`, customFields: c.customFields || [] }));
    return { statusCode: 200, body: JSON.stringify({ plate, totalContacts: contacts.length, debug }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
