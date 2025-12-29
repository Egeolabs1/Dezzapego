import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, Mail } from 'lucide-react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-gray-200 pt-12 pb-24 md:pb-12 mt-auto">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 block">
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
                            <li><Link to="/" className="hover:text-blue-600 transition-colors">Home</Link></li>
                            <li><Link to="/anunciar" className="hover:text-blue-600 transition-colors">Anunciar Grátis</Link></li>
                            <li><Link to="/favoritos" className="hover:text-blue-600 transition-colors">Meus Favoritos</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="col-span-1">
                        <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>
                                <Link to="/termos" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Termos de Uso
                                </Link>
                            </li>
                            <li>
                                <Link to="/privacidade" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Política de Privacidade
                                </Link>
                            </li>
                            <li><span className="text-gray-400 cursor-not-allowed">Dicas de Segurança</span></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="col-span-1">
                        <h3 className="font-semibold text-gray-900 mb-4">Contato</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-purple-600" />
                                <span>suporte@dezzapego.com.br</span>
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
