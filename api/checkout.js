const Stripe = require('stripe');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  if (req.method === 'POST') {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: process.env.STRIPE_PRICE_CA, quantity: 1 }],
        mode: 'payment',
        success_url: `${process.env.BASE_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}`,
      });
      return res.json({ url: session.url });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const session_id = req.query.session_id;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      return res.json({ paid: session.payment_status === 'paid' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
