'use client'

import React, { useState } from 'react'
import { VirtualTryOnModal } from '@/components/VirtualTryOn/VirtualTryOnModal'
import { CATALOG_CLOTHES } from '@/lib/constants/products'
import { ShoppingBag, Zap } from 'lucide-react'

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const clothes = Object.values(CATALOG_CLOTHES)

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="text-orange-500" size={32} />
              <h1 className="text-3xl font-bold text-white">TryOnIA</h1>
            </div>
            <nav className="flex items-center gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition">
                Inicio
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                Tienda
              </a>
              <button className="relative px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2">
                <ShoppingBag size={20} />
                <span>Carrito</span>
                <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-red-600 rounded-full text-xs font-bold">
                  0
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Pruébate la Ropa en Tiempo Real
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Con nuestro probador virtual impulsado por IA, visualiza cómo lucen las prendas
            directamente desde tu cámara web. Tecnología de Virtual Try-On de próxima generación.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 text-lg"
          >
            <Zap size={24} />
            Abrir Probador Virtual
          </button>
        </div>

        {/* Catálogo de prendas */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-white mb-12 text-center">Prendas Disponibles</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {clothes.map(clothing => (
              <div
                key={clothing.id}
                className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 hover:border-orange-500 transition-all group cursor-pointer transform hover:scale-105"
              >
                {/* Imagen placeholder */}
                <div
                  className="h-48 bg-gradient-to-br flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundImage: `linear-gradient(135deg, #1e40af, #7c3aed)`,
                  }}
                >
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">{clothing.category.toUpperCase()}</p>
                    <p className="text-gray-300 text-sm mt-2">{clothing.color}</p>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-4">
                  <h4 className="font-semibold text-white mb-2 line-clamp-2">{clothing.name}</h4>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{clothing.description}</p>

                  {/* Info */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-orange-500 font-bold text-lg">
                      ${clothing.price.toFixed(2)}
                    </span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      Talla {clothing.size}
                    </span>
                  </div>

                  {/* Botones */}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Zap size={18} />
                    Probarte
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <section className="mt-24 py-16 border-t border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-orange-500" size={32} />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">En Tiempo Real</h4>
              <p className="text-gray-400">
                Visualiza los cambios instantáneamente sin latencia perceptible
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="text-orange-500" size={32} />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Compra Confiada</h4>
              <p className="text-gray-400">
                Reduce devoluciones viendo exactamente cómo luce la prenda en ti
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-500 text-2xl font-bold">AI</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Potenciado por IA</h4>
              <p className="text-gray-400">
                Tecnología de difusión de vídeo de última generación para resultados realistas
              </p>
            </div>
          </div>
        </section>
      </section>

      {/* Virtual Try-On Modal */}
      <VirtualTryOnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-24 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>© 2024 TryOnIA - Probador Virtual con IA. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
