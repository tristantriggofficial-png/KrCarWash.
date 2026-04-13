exports.handler = async function(event) {
  var contactId = event.queryStringParameters && event.queryStringParameters.id
    ? event.queryStringParameters.id.trim() : '';
  var apiKey = process.env.GHL_API_KEY;

  if (!contactId) {
    return { statusCode: 200, body: JSON.stringify({ found: false, reason: 'no id' }) };
  }

  try {
    // Fetch contact directly by ID instead of searching through a list of 100
    var response = await fetch('https://services.leadconnectorhq.com/contacts/' + contactId, {
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Version': '2021-07-28'
      }
    });

    var data = await response.json();
    var contact = data.contact || data; // GHL v1 wraps response in { contact: {} }

    if (!contact || !contact.id) {
      return { statusCode: 200, body: JSON.stringify({ found: false, reason: 'contact not found' }) };
    }

    var fields = contact.customFields || [];

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

    function getVal(id) {
      var f = fields.find(function(f) { return f.id === id; });
      if (!f) return '';
      return Array.isArray(f.value) ? f.value[0] : (f.value || '');
    }

    // Check tags — matches what create-membership actually sets ('active-member')
    var tags = contact.tags || [];
    var status = tags.includes('active-member') ? 'active' : 'inactive';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        found: true,
        name: (contact.firstName || '') + ' ' + (contact.lastName || ''),
        phone: contact.phone || '',
        status: status,
        memberId: getVal(MEMBER_ID),
        vehicle1: { make: getVal(V1_MAKE), model: getVal(V1_MODEL), plate: getVal(V1_PLATE) },
        vehicle2: { make: getVal(V2_MAKE), model: getVal(V2_MODEL), plate: getVal(V2_PLATE) },
        vehicle3: { make: getVal(V3_MAKE), model: getVal(V3_MODEL), plate: getVal(V3_PLATE) }
      })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
