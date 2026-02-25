import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const CurrencyContext = createContext({ currency: 'USD', lrdPerUsd: 193.5, formatMoney: (n) => n });

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');
  const [lrdPerUsd, setLrdPerUsd] = useState(193.5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.uhpcms.getSettings()
      .then((r) => {
        if (r.ok && r.currency) {
          setLrdPerUsd(r.currency.lrdPerUsd ?? 193.5);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatMoney = (amount, forceCurrency) => {
    const curr = forceCurrency || currency;
    const n = Number(amount);
    if (curr === 'LRD') return `LRD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const convertToDisplay = (amount, fromCurrency) => {
    const n = Number(amount);
    if (fromCurrency === 'LRD' && currency === 'USD') return n / lrdPerUsd;
    if (fromCurrency === 'USD' && currency === 'LRD') return n * lrdPerUsd;
    return n;
  };

  const value = {
    currency,
    setCurrency,
    lrdPerUsd,
    formatMoney,
    convertToDisplay,
    loading,
    options: ['USD', 'LRD'],
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
