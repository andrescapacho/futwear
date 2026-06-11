// state/store.js

export const state = {
    products: [],
    orders: [],
    cart: [],
    categories: ['Todas', 'Playeras', 'Shorts', 'Pants', 'Accesorios', 'Sudaderas'],
    selectedVariant: { size: null, color: null },
    isHomeView: true,
    promoBanners: [],
    showBannerForm: false,
    editingBannerId: null,
    currentView: 'shop',
    isAdminAuth: false,
    selectedProduct: null,
    searchTerm: '',
    selectedCategory: 'Todas',
    showProductForm: false,
    showAdminMenu: false,
    visibleProductsCount: 10,
    savedScrollPosition: 0,
    editingProductId: null
};

// Como el carrito interactúa directamente con el estado, es buena idea mudar esta función aquí también
export const saveCart = () => {
    localStorage.setItem('futwear_cart', JSON.stringify(state.cart));
};