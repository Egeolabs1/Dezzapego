import { categoriesData } from '../data/categories';

type CategoriesProps = {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  selectedSubcategory?: string;
  onSubcategorySelect?: (subcategory: string) => void;
  selectedTransactionType?: 'venda' | 'aluguel' | '';
  onTransactionTypeSelect?: (type: 'venda' | 'aluguel' | '') => void;
};

export function Categories({
  selectedCategory,
  onCategorySelect,
  selectedSubcategory = '',
  onSubcategorySelect,
  selectedTransactionType = '',
  onTransactionTypeSelect
}: CategoriesProps) {
  const selectedCategoryData = categoriesData.find(cat => cat.id === selectedCategory);
  const isRealEstate = selectedCategory === 'imoveis';

  return (
    <section className="bg-white border-b border-gray-200">
      {/* Main Categories */}
      <div className="py-4 md:py-6 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Categorias</h2>
            {selectedCategory && (
              <button
                onClick={() => onCategorySelect('')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex overflow-x-auto pt-4 pb-4 gap-2 md:grid md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-10 md:gap-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {categoriesData.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => onCategorySelect(isSelected ? '' : category.id)}
                  className={`flex flex-col items-center gap-2 w-[85px] shrink-0 md:w-auto md:shrink transition-all ${isSelected ? 'scale-105' : 'hover:scale-105'}`}
                >
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-sm border-2 ${isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                    : 'bg-white text-gray-600 border-gray-100 hover:border-blue-200 hover:shadow-md'
                    }`}>
                    <Icon className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <span className={`text-[11px] md:text-sm font-medium text-center leading-3 line-clamp-2 h-7 flex items-start justify-center ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transaction Type - shown when a real estate category is selected */}
      {isRealEstate && (
        <div className="py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm text-gray-600">Tipo de Transação:</h3>
              {selectedTransactionType && onTransactionTypeSelect && (
                <button
                  onClick={() => onTransactionTypeSelect('')}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onTransactionTypeSelect?.('venda')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${selectedTransactionType === 'venda'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                  }`}
              >
                <span>💰 Venda</span>
              </button>
              <button
                onClick={() => onTransactionTypeSelect?.('aluguel')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${selectedTransactionType === 'aluguel'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                  }`}
              >
                <span>🏠 Aluguel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategories - shown when a category is selected */}
      {selectedCategoryData && selectedCategoryData.subcategories.length > 0 && (
        <div className="py-4 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm text-gray-600">Subcategorias de {selectedCategoryData.name}:</h3>
              {selectedSubcategory && onSubcategorySelect && (
                <button
                  onClick={() => onSubcategorySelect('')}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedCategoryData.subcategories.map((subcategory) => {
                const isSelected = selectedSubcategory === subcategory.id;

                return (
                  <button
                    key={subcategory.id}
                    onClick={() => onSubcategorySelect?.(isSelected ? '' : subcategory.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm ${isSelected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                  >
                    <span>{subcategory.name}</span>
                    <span className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                      ({subcategory.count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
