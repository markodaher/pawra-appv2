// Pawra — Pawla AI concierge (Claude with tool use).
//
// v2 changes:
//   • Moved off the client. Anthropic key never ships in the app bundle.
//   • Tool loop: Pawla can search providers/products, read the user's pets,
//     addresses and recent activity, and DRAFT bookings/orders/cancellations.
//   • Pawla never mutates user data. Write actions return a structured
//     `action` payload that the client renders as a Confirm card; the user
//     taps Confirm and the existing AppContext mutation runs client-side —
//     same RLS path as the regular UI, no new attack surface.
//
// Required Supabase Edge Function secrets:
//   ANTHROPIC_API_KEY
//
// Headers expected:
//   Authorization: Bearer <user JWT>  — used to scope all DB queries via RLS.
//
// Request body:
//   { messages: { role: 'user' | 'assistant'; content: string }[] }
//
// Response body (matches types/pawla.ts → PawlaResponse):
//   { reply: string; action?: PawlaAction }

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL       = 'claude-sonnet-4-6';
const MAX_TURNS   = 6;     // hard cap on tool-use rounds per request
const MAX_TOKENS  = 1500;

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Pawla, the warm, brilliant pet concierge for Pawra — Lebanon's pet services super-app. 🐾

YOU ARE A CONCIERGE, NOT A GUIDE.
When a user wants something, DO IT. Don't just describe steps. Use your tools to:
  • Look up providers, products, the user's pets, addresses and recent activity
  • Recommend the best fit based on what you find
  • Draft bookings and orders for the user to confirm with one tap

CONFIRMATION FLOW (critical):
For any write action (booking, order, cancellation, reorder), use the matching propose_*
tool. The tool returns a draft. Reply with a short, warm summary of what you're about to
do — DO NOT enumerate every field, the user sees a Confirm card. End with something like
"Tap Confirm if that looks right!". Never claim a booking/order is created until the user
confirms. If you didn't call a propose_* tool, no card will appear, so don't promise one.

DEFAULTS & GAPS:
  • Always use get_my_addresses + get_my_pets + get_my_payment_methods before proposing.
    If the user has none → tell them and offer to open the right screen via open_screen.
  • If a key detail is missing (date/time, pet, address) ask ONE focused question first.
  • If the user has multiple addresses/payment methods and didn't say which, pick the first
    one and mention it in your reply so they can correct you.
  • For bookings, default sharePassport=true unless the user says otherwise.

TONE:
Warm, concise, pet-loving. 2–4 sentences max for normal replies. Use emojis lightly.
Sign off with "🐾" only when finishing a topic, not every message.

ESCALATION:
If the user is frustrated or asks for a human, include the literal tag [ESCALATE_TO_AGENT]
at the end of your reply. The client renders a "Connect with our team" button.

YOU CANNOT:
  • Modify another user's data
  • See provider-side info (inbox, schedule)
  • Process payments yourself — payment selection happens in the Confirm card
`;

// ─── Tool catalogue ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'search_providers',
    description: 'Find providers near the user. Filter by service category and/or max distance. Returns up to `limit` matches sorted by distance.',
    input_schema: {
      type: 'object',
      properties: {
        category:  { type: 'string', enum: ['walk', 'groom', 'vet', 'board', 'taxi', 'funeral'], description: 'Service category id' },
        max_km:    { type: 'number', description: 'Max distance in km from the user' },
        limit:     { type: 'number', description: 'Max results (default 5, hard cap 10)' },
      },
    },
  },
  {
    name: 'get_provider_detail',
    description: 'Full info on one provider: rating, reviews, hours, contact.',
    input_schema: { type: 'object', properties: { provider_id: { type: 'string' } }, required: ['provider_id'] },
  },
  {
    name: 'get_provider_services',
    description: 'List the bookable services + prices a provider offers.',
    input_schema: { type: 'object', properties: { provider_id: { type: 'string' } }, required: ['provider_id'] },
  },
  {
    name: 'search_products',
    description: 'Search the shop. Filter by category id, vendor, or fuzzy query string.',
    input_schema: {
      type: 'object',
      properties: {
        query:     { type: 'string' },
        category:  { type: 'string' },
        vendor_id: { type: 'string' },
        limit:     { type: 'number' },
      },
    },
  },
  {
    name: 'get_my_pets',
    description: "List the current user's pets (id, name, species, breed, age, weight).",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_my_addresses',
    description: "List the current user's saved addresses (id, label, area).",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_my_payment_methods',
    description: "List the current user's saved payment methods. Cash on delivery (id='cash') is always available even if no rows return.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_my_recent_activity',
    description: 'Recent bookings and orders for the current user (last 10 of each).',
    input_schema: { type: 'object', properties: { limit: { type: 'number' } } },
  },
  {
    name: 'propose_booking',
    description: 'DRAFT a booking — does NOT create it. The client renders a Confirm card; the user taps Confirm to actually book. Always call get_provider_services first so you know the right service_ids and prices.',
    input_schema: {
      type: 'object',
      required: ['provider_id', 'service_ids', 'pet_ids', 'when_iso'],
      properties: {
        provider_id:       { type: 'string' },
        service_ids:       { type: 'array', items: { type: 'string' } },
        pet_ids:           { type: 'array', items: { type: 'string' } },
        when_iso:          { type: 'string', description: 'ISO 8601 timestamp of the requested slot' },
        address_id:        { type: 'string', description: 'Saved address id; omit to default to first' },
        payment_method_id: { type: 'string', description: "Saved method id or 'cash'; defaults to cash" },
        note:              { type: 'string' },
        share_passport:    { type: 'boolean', description: 'Default true' },
      },
    },
  },
  {
    name: 'propose_order',
    description: 'DRAFT a shop order — does NOT place it. All items must come from a single vendor (Pawra cart rule).',
    input_schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['product_id', 'qty'],
            properties: {
              product_id: { type: 'string' },
              qty:        { type: 'integer', minimum: 1 },
            },
          },
        },
        address_id:        { type: 'string' },
        payment_method_id: { type: 'string' },
        note:              { type: 'string' },
      },
    },
  },
  {
    name: 'propose_cancel_booking',
    description: 'DRAFT a cancellation of a pending/confirmed booking. The client shows a Confirm card.',
    input_schema: {
      type: 'object',
      required: ['booking_id'],
      properties: {
        booking_id: { type: 'string' },
        reason:     { type: 'string' },
      },
    },
  },
  {
    name: 'propose_reorder',
    description: 'DRAFT a re-order of all items from a past order. Card lets the user confirm.',
    input_schema: { type: 'object', required: ['order_id'], properties: { order_id: { type: 'string' } } },
  },
  {
    name: 'open_review',
    description: 'Opens the leave-a-review sheet for a completed booking.',
    input_schema: { type: 'object', required: ['booking_id'], properties: { booking_id: { type: 'string' } } },
  },
  {
    name: 'open_screen',
    description: 'Navigate the user to one of the main screens. Useful when they need to set something up first (e.g., add an address) before you can draft an action.',
    input_schema: {
      type: 'object',
      required: ['screen'],
      properties: {
        screen: {
          type: 'string',
          enum: ['home', 'browse', 'favorites', 'activity', 'shop', 'profile', 'pawpoints', 'referral', 'emergency'],
        },
      },
    },
  },
];

// ─── Tool implementations ───────────────────────────────────────────────────

type SB = ReturnType<typeof createClient>;

async function runTool(name: string, input: Record<string, unknown>, sb: SB, userId: string) {
  switch (name) {
    case 'search_providers':       return await tSearchProviders(input, sb);
    case 'get_provider_detail':    return await tGetProviderDetail(input, sb);
    case 'get_provider_services':  return await tGetProviderServices(input, sb);
    case 'search_products':        return await tSearchProducts(input, sb);
    case 'get_my_pets':            return await tGetMyPets(sb, userId);
    case 'get_my_addresses':       return await tGetMyAddresses(sb, userId);
    case 'get_my_payment_methods': return await tGetMyPaymentMethods(sb, userId);
    case 'get_my_recent_activity': return await tGetMyRecentActivity(input, sb, userId);
    case 'propose_booking':        return await tProposeBooking(input, sb, userId);
    case 'propose_order':          return await tProposeOrder(input, sb, userId);
    case 'propose_cancel_booking': return await tProposeCancelBooking(input, sb, userId);
    case 'propose_reorder':        return await tProposeReorder(input, sb, userId);
    case 'open_review':            return { ok: true, _action: { kind: 'open_review', bookingId: String(input.booking_id) } };
    case 'open_screen':            return { ok: true, _action: { kind: 'open_screen', screen: String(input.screen) } };
    default:                       return { error: `unknown tool ${name}` };
  }
}

async function tSearchProviders(input: Record<string, unknown>, sb: SB) {
  const limit = Math.min(Number(input.limit ?? 5), 10);
  let q = sb.from('providers').select('id, name, type, rating, reviews, distance_km, categories, price').eq('published', true);
  if (input.category) q = q.contains('categories', [input.category]);
  const { data, error } = await q.order('distance_km', { ascending: true }).limit(limit);
  if (error) return { error: error.message };
  const filtered = (data ?? []).filter(p => {
    if (input.max_km != null && p.distance_km != null && p.distance_km > Number(input.max_km)) return false;
    return true;
  });
  return {
    providers: filtered.map(p => ({
      id: p.id, name: p.name, type: p.type,
      rating: p.rating, reviews: p.reviews,
      distanceKm: p.distance_km,
      categories: p.categories ?? [],
      priceFrom: parsePriceFrom(p.price),
    })),
  };
}

function parsePriceFrom(s: string | null | undefined): number | undefined {
  if (!s) return undefined;
  const m = String(s).match(/\$?\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : undefined;
}

async function tGetProviderDetail(input: Record<string, unknown>, sb: SB) {
  const { data, error } = await sb.from('providers').select('*').eq('id', input.provider_id).single();
  if (error) return { error: error.message };
  return {
    provider: {
      id: data.id, name: data.name, type: data.type,
      area: data.area, distanceKm: data.distance_km,
      rating: data.rating, reviews: data.reviews,
      hours: data.hours, staff: data.staff,
      categories: data.categories ?? [],
      bio: data.bio, whatsapp: data.whatsapp,
      emergency: data.emergency, verified: data.verified,
    },
  };
}

async function tGetProviderServices(input: Record<string, unknown>, sb: SB) {
  const { data, error } = await sb
    .from('provider_services')
    .select('id, category, name, price, unit, description, active')
    .eq('provider_id', input.provider_id)
    .eq('active', true);
  if (error) return { error: error.message };
  return { services: data ?? [] };
}

async function tSearchProducts(input: Record<string, unknown>, sb: SB) {
  const limit = Math.min(Number(input.limit ?? 8), 15);
  let q = sb.from('products').select('id, name, subtitle, price, category, vendor_id, stock_count, image_url, description');
  if (input.category)  q = q.eq('category', input.category);
  if (input.vendor_id) q = q.eq('vendor_id', input.vendor_id);
  if (input.query) {
    const term = `%${String(input.query).replace(/[%_]/g, '')}%`;
    q = q.or(`name.ilike.${term},subtitle.ilike.${term},description.ilike.${term}`);
  }
  const { data, error } = await q.gt('stock_count', 0).limit(limit);
  if (error) return { error: error.message };

  // Pull vendor names for display.
  const vendorIds = Array.from(new Set((data ?? []).map(p => p.vendor_id).filter(Boolean)));
  let vendorMap: Record<string, string> = {};
  if (vendorIds.length) {
    const { data: vs } = await sb.from('providers').select('id, name').in('id', vendorIds);
    vendorMap = Object.fromEntries((vs ?? []).map(v => [v.id, v.name]));
  }
  return {
    products: (data ?? []).map(p => ({
      id: p.id, name: p.name, subtitle: p.subtitle ?? '',
      price: p.price, category: p.category,
      vendorId: p.vendor_id, vendorName: vendorMap[p.vendor_id] ?? '',
      stockCount: p.stock_count,
      imageUrl: p.image_url ?? undefined,
    })),
  };
}

async function tGetMyPets(sb: SB, userId: string) {
  const { data, error } = await sb.from('pets').select('*').eq('owner_id', userId);
  if (error) return { error: error.message };
  return {
    pets: (data ?? []).map(p => ({
      id: p.id, name: p.name, species: p.species, breed: p.breed,
      age: p.age, weight: p.weight, sex: p.sex,
    })),
  };
}

async function tGetMyAddresses(sb: SB, userId: string) {
  const { data, error } = await sb.from('addresses').select('*').eq('owner_id', userId);
  if (error) return { error: error.message };
  return {
    addresses: (data ?? []).map(a => ({
      id: a.id, label: a.label, area: a.area, line1: a.line1,
    })),
  };
}

async function tGetMyPaymentMethods(sb: SB, userId: string) {
  const { data, error } = await sb.from('payment_methods').select('id, kind, label').eq('owner_id', userId);
  if (error) return { error: error.message };
  const methods = (data ?? []).map(m => ({ id: m.id, kind: m.kind, label: m.label }));
  // Cash is always available.
  return { methods: [...methods, { id: 'cash', kind: 'cash', label: 'Pay in cash' }] };
}

async function tGetMyRecentActivity(input: Record<string, unknown>, sb: SB, userId: string) {
  const limit = Math.min(Number(input.limit ?? 5), 10);
  const [{ data: bookings }, { data: orders }] = await Promise.all([
    sb.from('bookings').select('id, provider_name, service, when_text, status, amount, created_at')
      .eq('owner_id', userId).order('created_at', { ascending: false }).limit(limit),
    sb.from('orders').select('id, vendor_name, item_count, total, status, created_at, when_text')
      .eq('owner_id', userId).order('created_at', { ascending: false }).limit(limit),
  ]);
  return { bookings: bookings ?? [], orders: orders ?? [] };
}

// ─── Propose tools (draft assemblers) ───────────────────────────────────────

async function tProposeBooking(input: Record<string, unknown>, sb: SB, userId: string) {
  const providerId  = String(input.provider_id);
  const serviceIds  = (input.service_ids as string[]) ?? [];
  const petIds      = (input.pet_ids as string[]) ?? [];
  const whenIso     = String(input.when_iso);
  const addressId   = input.address_id ? String(input.address_id) : null;
  const paymentId   = input.payment_method_id ? String(input.payment_method_id) : 'cash';
  const note        = (input.note as string) ?? '';
  const sharePass   = input.share_passport != null ? Boolean(input.share_passport) : true;

  const [{ data: provider }, { data: services }, { data: pets }, { data: addresses }, { data: methods }] = await Promise.all([
    sb.from('providers').select('id, name, type').eq('id', providerId).single(),
    sb.from('provider_services').select('id, name, price, unit').in('id', serviceIds).eq('provider_id', providerId),
    sb.from('pets').select('id, name').eq('owner_id', userId).in('id', petIds),
    addressId ? sb.from('addresses').select('id, label, area').eq('id', addressId).single() : Promise.resolve({ data: null }),
    paymentId !== 'cash' ? sb.from('payment_methods').select('id, label').eq('id', paymentId).single() : Promise.resolve({ data: null }),
  ]);

  if (!provider)      return { error: 'provider not found' };
  if (!services?.length) return { error: 'no matching services for provider' };
  if (!pets?.length)  return { error: 'no matching pets found' };

  const estTotal = services.reduce((s, svc) => {
    const includesPerDog = (svc.unit ?? '').includes('/dog');
    const mult = includesPerDog ? pets.length : 1;
    return s + Number(svc.price) * mult;
  }, 0);

  const draft = {
    providerId, providerName: provider.name, providerType: provider.type,
    serviceIds: services.map(s => s.id),
    serviceLabels: services.map(s => `${s.name} (${formatMoney(Number(s.price))}${s.unit ?? ''})`),
    petIds: pets.map(p => p.id),
    petNames: pets.map(p => p.name),
    whenIso,
    whenLabel: formatWhen(whenIso),
    addressId,
    addressLabel: addresses ? `${addresses.label}${addresses.area ? ' — ' + addresses.area : ''}` : 'No address selected',
    paymentMethodId: paymentId,
    paymentLabel: methods?.label ?? 'Pay in cash',
    note,
    estTotal,
    sharePassport: sharePass,
  };
  return { ok: true, draft, _action: { kind: 'booking_draft', data: draft } };
}

async function tProposeOrder(input: Record<string, unknown>, sb: SB, userId: string) {
  const rawItems    = (input.items as { product_id: string; qty: number }[]) ?? [];
  if (!rawItems.length) return { error: 'no items provided' };
  const addressId   = input.address_id ? String(input.address_id) : null;
  const paymentId   = input.payment_method_id ? String(input.payment_method_id) : 'cash';
  const note        = (input.note as string) ?? '';
  const productIds  = rawItems.map(i => i.product_id);

  const [{ data: products }, { data: address }, { data: method }] = await Promise.all([
    sb.from('products').select('id, name, price, vendor_id, stock_count').in('id', productIds),
    addressId ? sb.from('addresses').select('id, label, area').eq('id', addressId).single() : Promise.resolve({ data: null }),
    paymentId !== 'cash' ? sb.from('payment_methods').select('id, label').eq('id', paymentId).single() : Promise.resolve({ data: null }),
  ]);

  if (!products?.length) return { error: 'no matching products found' };
  const vendorIds = Array.from(new Set(products.map(p => p.vendor_id)));
  if (vendorIds.length > 1) return { error: 'Pawra carts are single-vendor. Pick items from one shop.' };

  const { data: vendor } = await sb.from('providers').select('id, name').eq('id', vendorIds[0]).single();

  const items = rawItems.map(i => {
    const p = products.find(pp => pp.id === i.product_id);
    if (!p) return null;
    return {
      productId: p.id, productName: p.name,
      qty: Math.max(1, Math.min(i.qty, p.stock_count || i.qty)),
      unitPrice: Number(p.price),
    };
  }).filter(Boolean) as { productId: string; productName: string; qty: number; unitPrice: number }[];

  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const draft = {
    vendorId: vendorIds[0],
    vendorName: vendor?.name ?? '',
    items,
    addressId,
    addressLabel: address ? `${address.label}${address.area ? ' — ' + address.area : ''}` : 'No address selected',
    paymentMethodId: paymentId,
    paymentLabel: method?.label ?? 'Pay in cash',
    note,
    total,
  };
  return { ok: true, draft, _action: { kind: 'order_draft', data: draft } };
}

async function tProposeCancelBooking(input: Record<string, unknown>, sb: SB, userId: string) {
  const bookingId = String(input.booking_id);
  const { data, error } = await sb.from('bookings')
    .select('id, status, provider_name, service, when_text, owner_id')
    .eq('id', bookingId).single();
  if (error) return { error: error.message };
  if (data.owner_id !== userId) return { error: 'not your booking' };
  if (['completed', 'cancelled', 'declined'].includes(data.status)) {
    return { error: `booking is already ${data.status}` };
  }
  return {
    ok: true,
    booking: { id: data.id, providerName: data.provider_name, service: data.service, when: data.when_text },
    _action: { kind: 'cancel_booking', bookingId, reason: input.reason ? String(input.reason) : undefined },
  };
}

async function tProposeReorder(input: Record<string, unknown>, sb: SB, userId: string) {
  const orderId = String(input.order_id);
  const { data, error } = await sb.from('orders')
    .select('id, owner_id, vendor_name, item_count, total')
    .eq('id', orderId).single();
  if (error) return { error: error.message };
  if (data.owner_id !== userId) return { error: 'not your order' };
  return {
    ok: true,
    order: { id: data.id, vendorName: data.vendor_name, itemCount: data.item_count, total: Number(data.total) },
    _action: { kind: 'reorder', orderId },
  };
}

// ─── Format helpers (Deno-safe) ─────────────────────────────────────────────

function formatMoney(n: number) { return '$' + n.toFixed(2); }
function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// ─── Main handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ reply: "I'm not fully wired up yet — Pawra admin needs to set ANTHROPIC_API_KEY. In the meantime, email support@pawra.app! 🐾" });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ reply: "I need you to be signed in to do that. Sign in and ask me again! 🐾" }, 401);
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) {
      return json({ reply: "Your session looks off. Try signing out and back in! 🐾" }, 401);
    }

    const body = await req.json() as { messages: { role: 'user' | 'assistant'; content: string }[] };
    const messages: any[] = body.messages.map(m => ({ role: m.role, content: m.content }));

    let lastAction: unknown | undefined;
    let finalText = '';

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
        },
        body: JSON.stringify({
          model: MODEL, max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          tools: TOOLS, messages,
        }),
      });
      if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        console.error('[pawla] anthropic', res.status, errTxt);
        return json({ reply: 'Hmm, I hit a snag reaching my brain. Try again? 🐾' });
      }
      const data = await res.json();

      // Append the assistant turn to messages exactly as returned.
      messages.push({ role: 'assistant', content: data.content });

      const toolUses = (data.content ?? []).filter((b: { type: string }) => b.type === 'tool_use');
      const textBlocks = (data.content ?? []).filter((b: { type: string }) => b.type === 'text');
      finalText = textBlocks.map((b: { text: string }) => b.text).join('\n').trim();

      if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
        break;
      }

      // Execute every tool the model asked for and append a single user message
      // containing the tool_result blocks (Anthropic format).
      const toolResultBlocks: unknown[] = [];
      for (const t of toolUses) {
        const result = await runTool(t.name, t.input ?? {}, sb, user.id);
        // Capture the most recent action (from a propose_* / open_* tool).
        if (result && typeof result === 'object' && '_action' in result) {
          lastAction = (result as { _action: unknown })._action;
        }
        // Strip _action before showing the tool result to the LLM — it doesn't
        // need to see the action envelope.
        const visible = (() => {
          if (result && typeof result === 'object' && '_action' in result) {
            const { _action, ...rest } = result as Record<string, unknown>;
            return rest;
          }
          return result;
        })();
        toolResultBlocks.push({
          type:        'tool_result',
          tool_use_id: t.id,
          content:     JSON.stringify(visible),
        });
      }
      messages.push({ role: 'user', content: toolResultBlocks });
    }

    return json({ reply: finalText || '...', action: lastAction });

  } catch (err) {
    console.error('[pawla] fatal', err);
    return json({ reply: "Something went wrong on my end. Try again or email support@pawra.app 🐾" });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
