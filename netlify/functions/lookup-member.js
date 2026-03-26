exports.handler = async function(event) {
  var apiKey = process.env.GHL_API_KEY;
  var locationId = process.env.GHL_LOCATION_ID;
  var response = await fetch('https://services.leadconnectorhq.com/contacts/?locationId=' + locationId + '&limit=10', { headers: { 'Authorization': 'Bearer ' + apiKey, 'Version': '2021-07-28' } });
  var data = await response.json();
  var contact = (data.contacts || []).find(function(c) { return c.firstName === 'test'; });
  return { statusCode: 200, body: JSON.stringify({ customFields: contact ? contact.customFields : [] }) };
};
