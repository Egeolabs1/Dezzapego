import Link from 'next/link';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';
import { buildWebPageStructuredData } from '../../lib/categorySeo';
import { toAbsoluteUrl } from '../../lib/seo';

export default function About() {
    const canonicalUrl = toAbsoluteUrl('/sobre');

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Sobre o Dezzapego"
                description="Conheça o Dezzapego, uma plataforma brasileira de classificados para comprar, vender e anunciar com segurança."
                canonicalUrl={canonicalUrl}
                structuredData={buildWebPageStructuredData({
                    title: 'Sobre o Dezzapego',
                    description:
                        'Conheça o Dezzapego, uma plataforma brasileira de classificados para comprar, vender e anunciar com segurança.',
                    path: '/sobre',
                })}
            />
            <Header />

            <main className="container mx-auto max-w-4xl px-4 py-10">
                <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Sobre</p>
                    <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">Um marketplace para desapegar com clareza</h1>
                    <p className="mt-4 text-lg leading-relaxed text-gray-600">
                        O Dezzapego conecta pessoas que querem vender, comprar ou encontrar oportunidades em classificados
                        de imóveis, veículos, eletrônicos, serviços, empregos e outros itens do dia a dia.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        ['Anúncios organizados', 'Categorias e filtros ajudam compradores a encontrar o que procuram sem perder tempo.'],
                        ['Segurança em primeiro lugar', 'Termos, denúncia de anúncios e dicas de segurança orientam negociações mais cuidadosas.'],
                        ['Conteúdo útil', 'Guias e páginas informativas ajudam vendedores a criar anúncios melhores e compradores a avaliar ofertas.'],
                    ].map(([title, body]) => (
                        <section key={title} className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                            <h2 className="text-base font-bold text-gray-900">{title}</h2>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
                        </section>
                    ))}
                </div>

                <section className="mt-10 rounded-lg border border-blue-100 bg-blue-50 p-6">
                    <h2 className="text-xl font-bold text-gray-900">Como usamos confiança como parte da experiência</h2>
                    <p className="mt-3 leading-relaxed text-gray-700">
                        O Dezzapego não intermedia pagamentos nem garante produtos, mas oferece páginas públicas, políticas,
                        canais de contato, denúncias e orientações para que cada negociação seja feita com mais informação.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link href="/dicas-seguranca" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                            Ver dicas de segurança
                        </Link>
                        <Link href="/contato" className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                            Fale conosco
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
