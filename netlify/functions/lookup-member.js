exports.handler = async function(event) {
  const plate = (event.queryStringParameters?.plate || '').toUpperCase().replace(/\s/g, '');

  if (!plate) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No plate provided' })
    };
  }

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${plate}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    const contacts = data.contacts || [];

    const match = contacts.find(c => {
      const fields = c.customFields || [];
      return fields.some(f =>
        f.value?.toString().toUpperCase().replace(/\s/g, '') === plate
      );
    });

    if (!match) {
      return {
        statusCode: 200,
        body: JSON.stringify({ found: false })
      };
    }

    const fields = match.customFields || [];
    const getField = (key) => fields.find(f => f.id === key || f.fieldKey?.includes(key))?.value || '';

    return {
      statusCode: 200,
      body: JSON.stringify({
        found: true,
        name: `${match.firstName} ${match.lastName}`,
        status: getField('membership_status') || 'unknown',
        plate: plate,
        vehicle1: `${getField('vehicle_make')} ${getField('vehicle_model')} ${getField('vehicle_year')}`.trim(),
        vehicle2: `${getField('vehicle_2_make')} ${getField('vehicle_2_model')} ${getField('vehicle_2_year')}`.trim(),
        vehicle3: `${getField('vehicle_3_make')} ${getField('vehicle_3_model')} ${getField('vehicle_3_year')}`.trim(),
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lookup failed', detail: err.message })
    };
  }
};
