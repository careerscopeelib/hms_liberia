import { useCurrency } from '../context/CurrencyContext';

export default function CurrencySwitcher() {
  const { currency, setCurrency, options } = useCurrency();
  return (
    <div className="currency-switcher">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          className={`btn-currency ${currency === c ? 'active' : ''}`}
          onClick={() => setCurrency(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
