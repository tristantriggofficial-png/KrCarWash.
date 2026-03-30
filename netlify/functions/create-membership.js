const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const GHL_API_KEY  = process.env.GHL_API_KEY;
const GHL_LOCATION = process.env.GHL_LOCATION_ID;
const GHL_WEBHOOK  = 'https://services.leadconnectorhq.com/hooks/JavTzRLeF0lXtXbtz1oI/webhook-trigger/ec980ab9-7079-4b48-a531-07256335a30b';

const PRICE_MAIN  = 'price_1TEzTgE552TsCUvBnY48S7Ha';
const PRICE_EXTRA = 'price_1PMbLPE552TsCUvBCoeutYth';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  const { paymentMethodId, firstName, lastName, email, phone, vehicleMake, vehicleModel, licensePlate, extraVehicles = [] } = body;

  if (!paymentMethodId || !firstName || !lastName || !email || !phone || !vehicleMake || !vehicleModel || !licensePlate) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  try {
    // 1. Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: `${firstName} ${lastName}`,
      phone,
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId },
      metadata: {
        license_plate: licensePlate,
        vehicle: `${vehicleMake} ${vehicleModel}`,
        extra_vehicles: extraVehicles.map(v => v.plate).join(', ')
      }
    });

    // 2. Build subscription items
    const items = [{ price: PRICE_MAIN }];
    extraVehicles.forEach(() => items.push({ price: PRICE_EXTRA }));

    // 3. Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items,
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent']
    });

    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice.payment_intent;

    if (paymentIntent && paymentIntent.status === 'requires_action') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          customerId: customer.id,
          subscriptionId: subscription.id
        })
      };
    }

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Payment failed. Please check your card details.' }) };
    }

    // 4. Build GHL custom fields
    const customField = {
      membership_status: 'Active',
      vehicle_make:  vehicleMake,
      vehicle_model: vehicleModel,
      license_plate: licensePlate,
      member_id:     customer.id
    };

    if (extraVehicles[0]) {
      customField.vehicle_2_make  = extraVehicles[0].make  || '';
      customField.vehicle_2_model = extraVehicles[0].model || '';
      customField.vehicle_2_plate = extraVehicles[0].plate || '';
    }
    if (extraVehicles[1]) {
      customField.vehicle_3_make  = extraVehicles[1].make  || '';
      customField.vehicle_3_model = extraVehicles[1].model || '';
      customField.vehicle_3_plate = extraVehicles[1].plate || '';
    }

    // 5. Create GHL contact
    const ghlRes = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GHL_API_KEY}`
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION,
        firstName,
        lastName,
        email,
        phone,
        customField,
        tags: ['active-member', 'unlimited-club']
      })
    });

    const ghlData = await ghlRes.json();
    const contactId = ghlData.contact?.id || customer.id;

    // 6. Fire GHL workflow webhook
    await fetch(GHL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        contactId,
        memberId:      customer.id,
        statusUrl:     `https://krcarwash.com/kr-status?id=${contactId}`,
        vehicleMake,
        vehicleModel,
        licensePlate,
        membershipStatus: 'Active'
      })
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customerId: customer.id,
        subscriptionId: subscription.id,
        contactId,
        statusUrl: `https://krcarwash.com/kr-status?id=${contactId}`
      })
    };

  } catch (err) {
    console.error('Membership creation error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Something went wrong. Please try again.' })
    };
  }
};
