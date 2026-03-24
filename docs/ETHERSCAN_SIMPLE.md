# Etherscan API V2 Integration System

## সহজ ব্যাখ্যা (Simple Explanation)

### চেইন চেঞ্জ নেই! শুধুমাত্র একটি API Key দরকার

Etherscan API V2 একটি API Key দিয়ে 60+টি EVM চেইন সাপোর্ট করে। তাই শুধু `ETHERSCAN_API_KEY` দিলেই হবে!

```
BSC = BNB Smart Chain (BEP-20)
Ethereum = ETH (ERC-20)
Polygon = MATIC
Arbitrum = ETH
Optimism = ETH
```

সবগুলো একই API Key দিয়ে কাজ করবে।

---

## কী কী ফাইল তৈরি হয়েছে

### Library ফাইল (Backend)
- `src/lib/etherscan.ts` - কনফিগারেশন
- `src/lib/etherscan-client.ts` - API ক্লায়েন্ট
- `src/lib/etherscan-payment.ts` - পেমেন্ট ভেরিফিকেশন
- `src/lib/etherscan-webhook.ts` - ওয়েবহুক
- `src/lib/etherscan-access.ts` - প্ল্যান অ্যাক্সেস কন্ট্রোল

### API রাউট
- `src/app/api/etherscan/verify/` - ট্রানজেকশন ভেরিফাই
- `src/app/api/etherscan/balance/` - ওয়ালেট ব্যালেন্স

---

## কীভাবে ব্যবহার করবেন

### ১. Environment Variables (.env তে দিন)

```bash
ETHERSCAN_API_KEY=আপনার_API_Key
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0x...আপনার_ওয়ালেট
NEXT_PUBLIC_MIN_CONFIRMATIONS=12
```

### ২. Frontend থেকে ব্যবহার

```javascript
// ট্রানজেকশন ভেরিফাই
const result = await fetch('/api/etherscan/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txHash: '0x...ট্রানজেকশন_হ্যাশ',
    network: 'bsc',  // বা 'ethereum', 'polygon'
    token: 'USDT',
    expectedAmount: 100,
    expectedRecipient: '0x...অ্যাডমিন_ওয়ালেট'
  })
});

const data = await result.json();
// data.data.valid = true যদি ভেরিফাই হয়
```

### ৩. Wallet Balance চেক

```javascript
const balance = await fetch('/api/etherscan/balance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '0x...ওয়ালেট_অ্যাড্রেস',
    network: 'bsc'
  })
});
```

---

## সাপোর্টেড নেটওয়ার্ক

| Network | Symbol | উদাহরণ |
|---------|--------|--------|
| Ethereum | ETH | `network: 'ethereum'` |
| BSC | BNB | `network: 'bsc'` |
| Polygon | MATIC | `network: 'polygon'` |
| Arbitrum | ETH | `network: 'arbitrum'` |
| Optimism | ETH | `network: 'optimism'` |

---

## কোন প্ল্যানে কী কী পাবেন

| ফিচার | Free | Pro | Enterprise |
|-------|------|-----|------------|
| API Calls/মাস | 1,000 | 25,000 | Unlimited |
| Networks | 2টা | 5টা | সব |
| Webhooks | ❌ | ✅ | ✅ |
| Real-time Notif | ❌ | ✅ | ✅ |

---

## কাজ হবে কিনা?

**হ্যাঁ, কাজ হবে!** 

Etherscan API V2 তে একটি API Key দিয়ে সব EVM চেইনের ডাটা পাওয়া যায়। আপনার Key যদি Pro বা তার বেশি প্ল্যানের হয়, তাহলে:

- ✅ Ethereum - কাজ করবে
- ✅ BSC (BEP-20 USDT) - কাজ করবে  
- ✅ Polygon - কাজ করবে
- ✅ Arbitrum - কাজ করবে
- ✅ Optimism - কাজ করবে

শুধু `ETHERSCAN_API_KEY` দিন, বাকি সিস্টেম নিজে থেকে handle করবে।

---

## Error হলে কী করবেন

1. **"Invalid API Key"** → Key চেক করুন
2. **"Rate Limit"** → ৫ সেকেন্ড পরে চেষ্টা করুন
3. **"Transaction Not Found"** → Hash সঠিক কিনা দেখুন

---

## সার্ভিস চালু করার জন্য

```bash
# যদি ইতিমধ্যে চালু থাকে
npm run dev

# নতুন কম্পোনেন্ট ব্যবহার করতে
import { AutoVerifyPayment } from '@/components/payment/auto-verify-payment';
```

সবকিছু তৈরি! শুধু API Key দিন এবং ব্যবহার করুন।
