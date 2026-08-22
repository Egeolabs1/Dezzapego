import { describe, expect, it } from 'vitest';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/adFormHelpers';

describe('formatCurrencyInput', () => {
    it('permite digitar um preço inteiro sem inserir centavos entre as teclas', () => {
        expect(formatCurrencyInput('2')).toBe('2');
        expect(formatCurrencyInput('25')).toBe('25');
        expect(formatCurrencyInput('2500')).toBe('2.500');
        expect(parseCurrencyInput(formatCurrencyInput('2500'))).toBe(2500);
    });

    it('preserva a parte decimal apenas quando a vírgula foi informada', () => {
        expect(formatCurrencyInput('2500,')).toBe('2.500,');
        expect(formatCurrencyInput('2500,5')).toBe('2.500,5');
        expect(formatCurrencyInput('2500,50')).toBe('2.500,50');
        expect(parseCurrencyInput(formatCurrencyInput('2500,50'))).toBe(2500.5);
    });
});
