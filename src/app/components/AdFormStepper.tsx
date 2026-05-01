import { Check } from 'lucide-react';

export type StepDef = { id: string; label: string };

type Props = {
    steps: StepDef[];
    currentIndex: number;
    onStepClick?: (index: number) => void;
};

export function AdFormStepper({ steps, currentIndex, onStepClick }: Props) {
    return (
        <nav aria-label="Etapas do anúncio" className="mb-8">
            <ol className="flex flex-wrap gap-2 md:gap-0 md:flex-nowrap md:justify-between">
                {steps.map((step, index) => {
                    const done = index < currentIndex;
                    const active = index === currentIndex;
                    const clickable = onStepClick && index < currentIndex;
                    return (
                        <li key={step.id} className="flex items-center flex-1 min-w-[120px] md:min-w-0">
                            <button
                                type="button"
                                disabled={!clickable}
                                onClick={() => clickable && onStepClick(index)}
                                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                    active
                                        ? 'border-purple-500 bg-purple-50 text-purple-900 font-semibold'
                                        : done
                                          ? 'border-green-200 bg-green-50 text-green-800'
                                          : 'border-gray-200 bg-white text-gray-500'
                                } ${clickable ? 'cursor-pointer hover:border-purple-300' : ''} disabled:cursor-default disabled:opacity-90`}
                            >
                                <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        active
                                            ? 'bg-purple-600 text-white'
                                            : done
                                              ? 'bg-green-600 text-white'
                                              : 'bg-gray-200 text-gray-600'
                                    }`}
                                >
                                    {done ? <Check className="h-4 w-4" /> : index + 1}
                                </span>
                                <span className="hidden sm:inline">{step.label}</span>
                                <span className="sm:hidden truncate">{step.label.split(' ')[0]}</span>
                            </button>
                            {index < steps.length - 1 && (
                                <span className="mx-1 hidden h-px w-4 shrink-0 bg-gray-200 md:block" aria-hidden />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
