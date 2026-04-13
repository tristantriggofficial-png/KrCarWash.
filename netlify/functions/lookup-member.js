exports.handler = async function(event) {
  var params = event.queryStringParameters || {};
  var plate    = (params.plate || '').toUpperCase().replace(/\s/g, '');
  var contact  = (params.contact || '').trim();
  var apiKey    = process.env.GHL_API_KEY;
  var locationId = process.env.GHL_LOCATION_ID;

  var V1_MAKE   = 'DP3tVjiga7PPqKrztB0D';
  var V1_MODEL  = 'uJec2Q884qeBQ1lxHJ3U';
  var V1_PLATE  = 'i5dJ5scIr0pBROE8nslQ';
  var V2_MAKE   = 'BGc2BxNWQCBEeuYgI8wE';
  var V2_MODEL  = 'DAAiZk2v9dt2lWHFistw';
  var V2_PLATE  = '1FUbhp6qXLo2iDcOOpfb';
  var V3_MAKE   = 'I5ESEXncfU7JPRO5cCDY';
  var V3_MODEL  = '727yuempYIr4WCmOnhVA';
  var V3_PLATE  = 'RgF1p5wAa0nTCRJs7mbr';
  var MEMBER_ID = 'iZwskCCXzlSXh2xsPYU4';

  function getVal(fields, id) {
    var f = fields.find(function(f) { return f.id === id; });
    if (!f) return '';
    return Array.isArray(f.value) ? f.value[0] : (f.value || '');
  }

  function formatResult(c) {
    var fields = c.customFields || [];
    var tags = c.tags || [];
    var status = tags.includes('active-member') ? 'active' : 'inactive';
    var v1 = (getVal(fields, V1_MAKE) + ' ' + getVal(fields, V1_MODEL)).trim();
    var v2 = (getVal(fields, V2_MAKE) + ' ' + getVal(fields, V2_MODEL)).trim();
    var v3 = (getVal(fields, V3_MAKE) + ' ' + getVal(fields, V3_MODEL)).trim();
    return {
      found: true,
      name: (c.firstName || '') + ' ' + (c.lastName || ''),
      status: status,
      plate: getVal(fields, V1_PLATE),
      vehicle1: v1,
      vehicle2: v2,
      vehicle3: v3,
      memberId: getVal(fields, MEMBER_ID)
    };
  }

  try {
    // QR scan — fetch contact directly by ID
    if (contact) {
      var res = await fetch('https://services.leadconnectorhq.com/contacts/' + contact, {
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Version': '2021-07-28' }
      });
      var data = await res.json();
      var c = data.contact || data;
      if (!c || !c.id) return { statusCode: 200, body: JSON.stringify({ found: false }) };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formatResult(c)) };
    }

    if (!plate) return { statusCode: 400, body: JSON.stringify({ error: 'No query provided' }) };

    // Plate search — paginate through ALL contacts to check all vehicle plate custom fields
    var match = null;
    var page = 1;
    var limit = 100;

    while (!match) {
      var url = 'https://services.leadconnectorhq.com/contacts/?locationId=' + locationId +
                '&limit=' + limit + '&page=' + page;

      var pageRes = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Version': '2021-07-28' }
      });
      var pageData = await pageRes.json();
      var contacts = pageData.contacts || [];

      // No more contacts to search
      if (contacts.length === 0) break;

      match = contacts.find(function(c) {
        var fields = c.customFields || [];
        var p1 = getVal(fields, V1_PLATE).toUpperCase().replace(/\s/g, '');
        var p2 = getVal(fields, V2_PLATE).toUpperCase().replace(/\s/g, '');
        var p3 = getVal(fields, V3_PLATE).toUpperCase().replace(/\s/g, '');
        return p1 === plate || p2 === plate || p3 === plate;
      });

      // If we got fewer than the limit, we've reached the last page
      if (contacts.length < limit) break;

      page++;
    }

    if (!match) return { statusCode: 200, body: JSON.stringify({ found: false }) };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formatResult(match)) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
