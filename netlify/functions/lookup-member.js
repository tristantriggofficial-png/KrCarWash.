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
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`,
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
      return fields.some(f => {
        const key = (f.id || f.fieldKey || '').toLowerCase();
        const val = (f.value || '').toString().toUpperCase().replace(/\s/g, '');
        const isPlateField = key.includes('license_plate') || key.includes('license') || key.includes('plate');
        return isPlateField && val === plate;
      });
    });

    if (!match) {
      return {
        statusCode: 200,
        body: JSON.stringify({ found: false })
      };
    }

    const fields = match.customFields || [];
    const getField = (key) => {
      const f = fields.find(f =>
        (f.id || f.fieldKey || '').toLowerCase().includes(key.toLowerCase())
      );
      return f?.value || '';
    };

    const v1 = [getField('vehicle_make'), getField('vehicle_model'), getField('vehicle_year')].filter(Boolean).join(' ');
    const v2 = [getField('vehicle_2_make'), getField('vehicle_2_model'), getField('vehicle_2_year')].filter(Boolean).join(' ');
    const v3 = [getField('vehicle_3_make'), getField('vehicle_3_model'), getField('vehicle_3_year')].filter(Boolean).join(' ');

    return {
      statusCode: 200,
      body: JSON.stringify({
        found: true,
        name: `${match.firstName} ${match.lastName}`,
        status: getField('membership_status') || 'unknown',
        plate: plate,
        vehicle1: v1,
        vehicle2: v2,
        vehicle3: v3,
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Lookup failed', detail: err.message })
    };
  }
};
