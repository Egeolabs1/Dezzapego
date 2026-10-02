import { describe, expect, it } from 'vitest';
import { isLowQualityPublicAd } from '@/lib/marketplaceQuality';

describe('isLowQualityPublicAd', () => {
  it('flags repeated test text in a public listing', () => {
    expect(isLowQualityPublicAd({ title: 'wewewewewewewewe', description: 'teste teste teste teste' })).toBe(true);
  });

  it('allows normal listing copy and missing optional description', () => {
    expect(isLowQualityPublicAd({ title: 'Samsung Galaxy S24 Ultra 256 GB', description: 'Aparelho conservado, acompanha carregador e caixa.' })).toBe(false);
    expect(isLowQualityPublicAd({ title: 'Sofá retrátil de três lugares' })).toBe(false);
  });
});
