// POST /api/checkout -> { clientSecret } for Stripe embedded Checkout.
// One fixed price, once (README "## Price"). The buyer's password is minted here so it
// can ride in the invoice footer (Stripe's own invoice email is a second copy of it).
const { SITE, PRODUCT, PRICE_USD, NAME, stripe, newPassword } = require("./_lib");
const DESC = "Run sheets for every truck on your own days: the stop order, the arrival times, the fix in your own numbers, and a CSV. Every day you run, not one.";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { nonce, password } = newPassword();
    const s = await stripe("checkout/sessions", {
      method: "POST",
      form: {
        ui_mode: "embedded_page",
        mode: "payment",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": String(PRICE_USD * 100),
        "line_items[0][price_data][product_data][name]": NAME,
        "line_items[0][price_data][product_data][description]": DESC,
        "payment_method_types[0]": "card",
        "payment_method_types[1]": "link",
        customer_creation: "always",
        "invoice_creation[enabled]": "true",
        "invoice_creation[invoice_data][description]": NAME,
        "invoice_creation[invoice_data][custom_fields][0][name]": "Password",
        "invoice_creation[invoice_data][custom_fields][0][value]": password,
        "invoice_creation[invoice_data][custom_fields][1][name]": "Run your day",
        "invoice_creation[invoice_data][custom_fields][1][value]": SITE.replace("https://", "") + "/day/",
        "invoice_creation[invoice_data][footer]": `Your password: ${password}. Run your own day at ${SITE}/day/?pw=${password}. Brick & Mortar · hello@brickandmortar.dev`,
        "invoice_creation[invoice_data][metadata][product]": PRODUCT,
        "metadata[product]": PRODUCT,
        "metadata[pw_nonce]": nonce,
        "metadata[password]": password,
        "payment_intent_data[metadata][product]": PRODUCT,
        "payment_intent_data[metadata][pw_nonce]": nonce,
        "payment_intent_data[description]": NAME,
        return_url: `${SITE}/day/?paid={CHECKOUT_SESSION_ID}`,
      },
    });
    res.status(200).json({ clientSecret: s.client_secret });
  } catch (e) {
    console.error("[checkout]", e.message);
    res.status(502).json({ error: "Checkout could not start. Please try again in a minute." });
  }
};
