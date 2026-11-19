import { useEffect, useState } from 'react';
import { DEFAULT_PRICING, pricingForClient } from '../shared/catalog.js';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

// Cennik z serwera (admin dostaje koszty, klient – ceny z marżą).
export function usePricing() {
  const { user, ready } = useAuth();
  const [pricing, setPricing] = useState(() => pricingForClient(DEFAULT_PRICING));
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api('/api/pricing')
      .then((r) => alive && setPricing(r.pricing))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ready, user?.id]);
  return pricing;
}
