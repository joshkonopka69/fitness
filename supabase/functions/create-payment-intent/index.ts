// Supabase Edge Function for Stripe Payment Processing
// Deploy with: supabase functions deploy create-payment-intent

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Suppress Deno compatibility warnings
globalThis.process = globalThis.process || { nextTick: (fn: Function) => setTimeout(fn, 0) } as any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { coachId, priceId, email, plan } = await req.json()

    console.log('Received payment request:', { coachId, priceId, email, plan })

    // Check if Stripe key is set
    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      console.error('STRIPE_SECRET_KEY not set!')
      throw new Error('Stripe configuration error: Secret key not configured')
    }

    if (!coachId || !priceId || !email) {
      console.error('Missing parameters:', { coachId: !!coachId, priceId: !!priceId, email: !!email })
      throw new Error('Missing required parameters: coachId, priceId, or email')
    }

    console.log(`Creating payment for coach: ${coachId}, plan: ${plan}`)

    // 1. Create or retrieve Stripe customer
    let customer
    try {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
        console.log(`Found existing customer: ${customer.id}`)
      } else {
        customer = await stripe.customers.create({
          email: email,
          metadata: {
            coach_id: coachId,
            app: 'fitnessguru',
          },
        })
        console.log(`Created new customer: ${customer.id}`)
      }
    } catch (stripeError: any) {
      console.error('Stripe customer error:', stripeError.message)
      throw new Error(`Stripe customer error: ${stripeError.message}`)
    }

    // 2. Create ephemeral key for Payment Sheet
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2023-10-16' }
    )

    // 3. Create subscription
    let subscription
    try {
      console.log(`Attempting to create subscription with price: ${priceId}`)
      subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'], // Card payments (Apple Pay, Google Pay included automatically)
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          coach_id: coachId,
          plan: plan,
        },
      })

      console.log(`Created subscription: ${subscription.id}`)
    } catch (stripeError: any) {
      console.error('Stripe subscription error:', stripeError.message)
      if (stripeError.message.includes('No such price')) {
        throw new Error(`Price ID not found in Stripe: ${priceId}. Please create this price in your Stripe dashboard.`)
      }
      throw new Error(`Stripe subscription error: ${stripeError.message}`)
    }

    const invoice = subscription.latest_invoice as Stripe.Invoice
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent

    if (!paymentIntent) {
      throw new Error('No payment intent created. Check subscription configuration.')
    }

    console.log(`Payment intent: ${paymentIntent.id}`)

    // 4. Return data for Payment Sheet
    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        customerId: customer.id,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        ephemeralKey: {
          id: ephemeralKey.id,
          secret: ephemeralKey.secret,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Payment intent creation error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
