exports.handler = async function(event) {
  var query = (event.queryStringParameters && event.queryStringParameters.plate ? event.queryStringParameters.plate : '').toUpperCase().replace(/\s/g, '');
  var apiKey = process.env.GHL_API_KEY;
  var locationId = process.env.GHL_LOCATION_ID;
  if (!query) { return { statusCode: 400, body: JSON.stringify({ error: 'No query provided' }) }; }
  try {
    var response = await fetch('https://services.leadconnectorhq.com/contacts/?locationId=' + locationId + '&limit=100', { headers: { 'Authorization': 'Bearer ' + apiKey, 'Version': '2021-07-28' } });
    var data = await response.json();
    var contacts = data.contacts || [];
    var STATUS_ID  = '96LLYXgqD2RuO5287zAb';
    var V1_MAKE    = 'DP3tVjiga7PPqKrztB0D';
    var V1_MODEL   = 'uJec2Q884qeBQ1lxHJ3U';
    var V1_PLATE   = 'i5dJ5scIr0pBROE8nslQ';
    var V2_MAKE    = 'BGc2BxNWQCBEeuYgI8wE';
    var V2_MODEL   = 'DAAiZk2v9dt2lWHFistw';
    var V2_PLATE   = '1FUbhp6qXLo2iDcOOpfb';
    var V3_MAKE    = 'I5ESEXncfU7JPRO5cCDY';
    var V3_MODEL   = '727yuempYIr4WCmOnhVA';
    var V3_PLATE   = 'RgF1p5wAa0nTCRJs7mbr';
    var MEMBER_ID  = 'iZwskCCXzlSXh2xsPYU4';
    function getVal(fields, id) { var f = fields.find(function(f) { return f.id === id; }); if (!f) return ''; return Array.isArray(f.value) ? f.value[0] : (f.value || ''); }
    var match = contacts.find(function(c) {
      var fields = c.customFields || [];
      var p1 = getVal(fields, V1_PLATE).toUpperCase().replace(/\s/g, '');
      var p2 = getVal(fields, V2_PLATE).toUpperCase().replace(/\s/g, '');
      var p3 = getVal(fields, V3_PLATE).toUpperCase().replace(/\s/g, '');
      var mid = getVal(fields, MEMBER_ID).toUpperCase().replace(/\s/g, '');
      return p1 === query || p2 === query || p3 === query || mid === query;
    });
    if (!match) { return { statusCode: 200, body: JSON.stringify({ found: false }) }; }
    var fields = match.customFields || [];
    var v1 = (getVal(fields, V1_MAKE) + ' ' + getVal(fields, V1_MODEL)).trim();
    var v2 = (getVal(fields, V2_MAKE) + ' ' + getVal(fields, V2_MODEL)).trim();
    var v3 = (getVal(fields, V3_MAKE) + ' ' + getVal(fields, V3_MODEL)).trim();
    return { statusCode: 200, body: JSON.stringify({ found: true, name: match.firstName + ' ' + match.lastName, status: getVal(fields, STATUS_ID) || 'unknown', plate: getVal(fields, V1_PLATE), vehicle1: v1, vehicle2: v2, vehicle3: v3 }) };
  } catch (err) { return { statusCode: 500, body: JSON.stringify({ error: err.message }) }; }
};
