/** Dicas visuais para o anunciante melhorar título e descrição (SEO orgânico). */

type Props = {
    titleLen: number;
    descriptionLen: number;
};

export function AdSeoHints({ titleLen, descriptionLen }: Props) {
    const titleOk = titleLen >= 45 && titleLen <= 70;
    const descWarn = descriptionLen > 0 && descriptionLen < 120;
    const descOk = descriptionLen >= 120;

    return (
        <div className="col-span-2 rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 space-y-2">
            <p className="font-medium text-amber-900">Dicas para seu anúncio aparecer melhor na busca</p>
            <ul className="list-disc list-inside space-y-1 text-amber-900/90">
                <li>
                    Título: {titleLen} caracteres — ideal entre 45 e 65
                    {!titleOk && titleLen > 0 ? (
                        <span className="text-amber-800"> (ajuste para ficar mais claro)</span>
                    ) : null}
                    {titleOk ? <span className="text-green-700"> — ótimo</span> : null}
                </li>
                <li>
                    Descrição: {descriptionLen} caracteres — descreva estado, medidas, entrega e o que está incluso
                    {descWarn ? (
                        <span className="text-amber-800"> (ideal pelo menos ~120 caracteres)</span>
                    ) : null}
                    {descOk ? <span className="text-green-700"> — boa densidade de detalhes</span> : null}
                </li>
            </ul>
        </div>
    );
}
