import Link from 'next/link';
import { ShieldCheck, Heart, Mail, Cookie } from 'lucide-react';
import { openConsentPreferences } from '../../lib/privacyConsent';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-gray-200 pt-12 pb-24 md:pb-12 mt-auto">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 block">
                            Dezzapego
                        </Link>
                        <p className="text-gray-500 text-sm mb-4">
                            A melhor plataforma para comprar e vender desapegos. Simples, rápido e seguro.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="col-span-1">
                        <h3 className="font-semibold text-gray-900 mb-4">Plataforma</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/" className="hover:text-blue-600 transition-colors">Home</Link></li>
                            <li><Link href="/anunciar" className="hover:text-blue-600 transition-colors">Anunciar Grátis</Link></li>
                            <li><Link href="/favoritos" className="hover:text-blue-600 transition-colors">Meus Favoritos</Link></li>
                            <li><Link href="/planos" className="hover:text-blue-600 transition-colors">Planos e Preços</Link></li>
                            <li><Link href="/sobre" className="hover:text-blue-600 transition-colors">Sobre o Dezzapego</Link></li>
                            <li><Link href="/mapa-do-site" className="hover:text-blue-600 transition-colors">Mapa do Site</Link></li>
                            <li><Link href="/contato" className="hover:text-blue-600 transition-colors">Fale Conosco</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="col-span-1">
                        <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>
                                <Link href="/termos" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Termos de Uso
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacidade" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Política de Privacidade
                                </Link>
                            </li>
                            <li>
                                <Link href="/dicas-seguranca" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Dicas de Segurança
                                </Link>
                            </li>
                            <li>
                                <Link href="/guias/como-vender-com-seguranca" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Guias de compra e venda
                                </Link>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    onClick={() => openConsentPreferences()}
                                    className="hover:text-blue-600 transition-colors flex items-center gap-1 text-left"
                                >
                                    <Cookie className="w-3 h-3 shrink-0" />
                                    Cookies e preferências
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="col-span-1">
                        <h3 className="font-semibold text-gray-900 mb-4">Contato</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>
                                <Link href="/contato" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                                    <Mail className="w-4 h-4 text-purple-600" />
                                    <span>Entre em contato</span>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                    <p>&copy; {currentYear} Dezzapego. Todos os direitos reservados.</p>
                    <div className="flex items-center gap-1">
                        <span>Feito com</span>
                        <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                        <span>para a comunidade</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
