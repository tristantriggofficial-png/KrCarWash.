exports.handler = async function(event) {
  var plate = (event.queryStringParameters && event.queryStringParameters.plate ? event.queryStringParameters.plate : '').toUpperCase().replace(/\s/g, '');
  var apiKey = process.env.GHL_API_KEY;
  var locationId = process.env.GHL_LOCATION_ID;
  if (!plate) { return { statusCode: 400, body: JSON.stringify({ error: 'No plate provided' }) }; }
  try {
    var response = await fetch('https://services.leadconnectorhq.com/contacts/?locationId=' + locationId + '&limit=100', { headers: { 'Authorization': 'Bearer ' + apiKey, 'Version': '2021-07-28' } });
    var data = await response.json();
    var contacts = data.contacts || [];
    var PLATE_ID = 'i5dJ5scIr0pBROE8nslQ';
    var STATUS_ID = '96LLYXgqD2RuO5287zAb';
    var MAKE_ID = 'DP3tVjiga7PPqKrztB0D';
    var MODEL_ID = 'uJec2Q884qeBQ1lxHJ3U';
    function getVal(fields, id) { var f = fields.find(function(f) { return f.id === id; }); if (!f) return ''; return Array.isArray(f.value) ? f.value[0] : f.value || ''; }
    var match = contacts.find(function(c) { var val = getVal(c.customFields || [], PLATE_ID).toUpperCase().replace(/\s/g, ''); return val === plate; });
    if (!match) { return { statusCode: 200, body: JSON.stringify({ found: false }) }; }
    var fields = match.customFields || [];
    return { statusCode: 200, body: JSON.stringify({ found: true, name: match.firstName + ' ' + match.lastName, status: getVal(fields, STATUS_ID) || 'unknown', plate: plate, vehicle1: (getVal(fields, MAKE_ID) + ' ' + getVal(fields, MODEL_ID)).trim(), vehicle2: '', vehicle3: '' }) };
  } catch (err) { return { statusCode: 500, body: JSON.stringify({ error: err.message }) }; }
};
