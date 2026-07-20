# n8n automation workflows

Import each `.json` into your self-hosted n8n (Workflows → Import from file),
then set two credentials:

1. **Webhook secret** — every workflow's trigger checks the `x-rasi-secret`
   header against `N8N_WEBHOOK_SECRET` (same value as the site's env var).
2. **WhatsApp BSP** — HTTP Request nodes are pre-shaped for AiSensy's campaign
   API (`https://backend.aisensy.com/campaign/t1/api/v2`). For Interakt, swap
   the URL to `https://api.interakt.ai/v1/public/message/` and the auth header.
   ⚠️ Template messages must be approved in the BSP dashboard first —
   the `templateName` values below are the names to create there.

## Event → workflow map

| Site event               | Workflow file                     | WhatsApp template      |
| ------------------------ | --------------------------------- | ---------------------- |
| `order.placed` / `order.paid` | `01-order-confirmation.json` | `order_confirmed_{en,ta}` |
| `order.out_for_delivery` | `02-out-for-delivery.json`        | `out_for_delivery_{en,ta}` |
| (cron, 2h after cart event) | `03-cart-abandoned.json`      | `cart_reminder_{en,ta}` |
| `wishlist.notify_restock` + stock update | `04-back-in-stock.json` | `back_in_stock_{en,ta}` |
| `order.delivered` +7d    | `05-review-request.json`          | `review_request_{en,ta}` |
| (daily cron on baby_dob) | `06-milestone-suggestions.json`   | `milestone_{en,ta}`    |

All customer-facing messages respect the customer's stored language (`ta`/`en`)
and the `whatsapp_opt_in` flag. Marketing sends (03, 06) must respect the
2-promos/week cap — both workflows check the `events` table for prior sends
before messaging.

The site keeps working if n8n is down: events are queued in the `events` table
and `/api/cron/drain-events` retries delivery every 5 minutes.
