// ui/catalog.js
import { state } from '../state/store.js';
import { formatMoney, escapeHTML, getColorBgClass, renderFooter } from '../app.js';

export function selectCategoryFilter(cat) {
    state.selectedCategory = cat;
    state.searchTerm = '';
    state.visibleProductsCount = 10;
    state.isHomeView = false;
    state.currentView = 'shop';
    window.render();
    window.scrollTo({ top: document.getElementById('catalogo').offsetTop - 80, behavior: 'smooth' });
}

export function loadMoreProducts() {
    state.visibleProductsCount += 10;
    window.render();
}

export function selectVariant(type, value) {
    state.selectedVariant[type] = value;
    
    if (type === 'size') {
        const buttons = document.querySelectorAll('.variant-btn-size');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-size') === value) {
                btn.className = "variant-btn-size w-10 h-10 border border-gray-600 flex items-center justify-center text-xs font-bold transition-all bg-white text-black";
            } else {
                btn.className = "variant-btn-size w-10 h-10 border border-gray-600 flex items-center justify-center text-xs font-bold transition-all text-gray-400 hover:bg-[#1a1a1a] hover:text-white";
            }
        });
        const label = document.getElementById('label-size');
        if(label) label.innerHTML = `Talla : <span class="text-white">${value}</span>`;
        
    } else if (type === 'color') {
        const buttons = document.querySelectorAll('.variant-btn-color');
        buttons.forEach(btn => {
            const bgClass = btn.getAttribute('data-bg');
            const baseClasses = `variant-btn-color w-8 h-8 rounded-full ${bgClass} border-2 border-gray-600 transition-all`;
            
            if (btn.getAttribute('data-color') === value) {
                btn.className = `${baseClasses} ring-2 ring-offset-2 ring-offset-[#0a0a0a] ring-white`;
            } else {
                btn.className = `${baseClasses} hover:scale-110`;
            }
        });
        const label = document.getElementById('label-color');
        if(label) label.innerHTML = `Color : <span class="text-white">${value}</span>`;
    }
}

export function handleSearch(event) {
    state.searchTerm = event.target.value;
    state.visibleProductsCount = 10; 
    
    state.isHomeView = (state.searchTerm === '' && state.selectedCategory === 'Todas');
    
    if (state.currentView !== 'shop') {
        window.navigateTo('shop'); 
        
        setTimeout(() => {
            const inputs = document.querySelectorAll('input[placeholder="Buscar productos..."]');
            inputs.forEach(input => {
                if (input.offsetParent !== null) { 
                    input.focus();
                    const val = input.value;
                    input.value = '';
                    input.value = val; 
                }
            });
        }, 50);
        return;
    }
    
    const gridContainer = document.getElementById('product-grid-container');
    const headerTitle = document.getElementById('shop-header-title');
    const heroSection = document.getElementById('home-hero-section');
    const bannersSection = document.getElementById('home-banners-section');
    
    if (gridContainer) gridContainer.innerHTML = renderProductGrid();
    if (headerTitle) headerTitle.innerText = state.searchTerm ? 'Resultados de búsqueda' : (state.selectedCategory === 'Todas' ? 'Productos Destacados' : state.selectedCategory);
    
    if (heroSection) heroSection.style.display = state.isHomeView ? 'block' : 'none';
    if (bannersSection) bannersSection.style.display = state.isHomeView ? 'block' : 'none';
}

export function renderProductGrid() {
    let filtered = state.products.filter(p => {
        const term = state.searchTerm.toLowerCase();
        return (
            (state.selectedCategory === 'Todas' || p.category === state.selectedCategory) &&
            (
                p.name.toLowerCase().includes(term) ||
                p.category.toLowerCase().includes(term) ||
                (p.brand || '').toLowerCase().includes(term) ||
                (p.description || '').toLowerCase().includes(term)
            )
        );
    });

    const displayProducts = state.isHomeView ? filtered.slice(0, 5) : filtered.slice(0, state.visibleProductsCount);

    let productsHtml = displayProducts.map(p => `
        <div class="group bg-[#0a0a0a] flex flex-col h-full">
            <div class="relative bg-[#e5e5e5] aspect-[4/5] cursor-pointer overflow-hidden" onclick="navigateTo('product_detail', '${p.id}')">
                <img src="${escapeHTML(p.image)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-multiply" />
                ${p.salePrice ? `<div class="absolute top-3 left-3 bg-white text-black text-[10px] font-bold px-2 py-1 uppercase tracking-wider">Oferta</div>` : ''}
                ${p.status === 'Agotado' ? `<div class="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center"><span class="text-black font-black text-lg uppercase tracking-widest border-2 border-black px-4 py-2">Agotado</span></div>` : ''}
            </div>
            
            <div class="pt-4 pb-2 flex-grow flex flex-col">
                <h3 class="text-sm font-bold text-white mb-1 cursor-pointer hover:text-gray-300 line-clamp-1" onclick="navigateTo('product_detail', '${p.id}')">${escapeHTML(p.name)}</h3>
                <p class="text-xs text-gray-500 mb-3">${escapeHTML(p.category)}</p>
                
                <div class="mb-4">
                    ${p.salePrice 
                        ? `<span class="text-sm font-bold text-white">${formatMoney(p.salePrice)}</span> <span class="text-xs text-gray-500 line-through ml-2">${formatMoney(p.price)}</span>`
                        : `<span class="text-sm font-bold text-white">${formatMoney(p.price)}</span>`
                    }
                </div>

                <button onclick="navigateTo('product_detail', '${p.id}')" class="mt-auto w-full border border-gray-600 text-white hover:bg-white hover:text-black py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex justify-center items-center">
                    VER DETALLES <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    `).join('');

    return productsHtml.length > 0 ? productsHtml : '<p class="col-span-full text-center py-12 text-gray-500">No se encontraron productos.</p>';
}

export function renderShop() {
    const isHomePage = state.isHomeView;

    let categoriesHtml = state.categories.map(cat => `
        <button onclick="selectCategoryFilter('${cat}')" class="px-5 py-1.5 rounded-full whitespace-nowrap text-xs font-bold tracking-wider uppercase transition-colors ${state.selectedCategory === cat ? 'bg-gray-800 text-white border border-gray-600' : 'bg-transparent text-gray-400 hover:text-white'}">${cat}</button>
    `).join('');

    let heroHtml = `
    <div class="relative bg-black h-[500px] md:h-[650px] flex items-center overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://brand.assets.adidas.com/image/upload/f_auto,q_auto:best,fl_lossy/if_w_gt_1920,w_1920/6366423_CAM_LAM_DAT_ONSITE_YGT_WORLD_CUP_26_JERSEYS_FW_25_LAM_CO_DELIV_1_STATEMENT_BANNER_D_2880x1240_1535533cbd.jpg')] bg-cover bg-center bg-no-repeat opacity-60"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
        
        <div class="relative max-w-7xl mx-auto px-4 w-full">
            <h1 class="text-5xl md:text-7xl font-black mb-2 tracking-tighter text-white">VISTE TU<span class="text-gray-500"></span><br>PASIÓN<span class="text-gray-500"></span></h1>
            <p class="text-lg md:text-xl text-gray-300 max-w-md mb-8 mt-4 font-medium">Demuestra tu pasión dentro y fuera de la cancha. Viste los colores que te hacen vibrar.</p>
            <button onclick="selectCategoryFilter('Todas'); window.scrollTo(0,0);" class="bg-white text-black font-bold py-3 px-8 text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors flex items-center">
                Comprar Ahora <i class="fas fa-arrow-right ml-2"></i>
            </button>
        </div>
    </div>

    <div class="bg-[#050505] border-y border-gray-800 py-8 hidden md:block">
        <div class="max-w-7xl mx-auto px-4 grid grid-cols-4 gap-4 text-center divide-x divide-gray-800">
            <div>
                <i class="fas fa-shield-alt text-2xl text-white mb-2"></i>
                <h4 class="text-white font-bold text-xs tracking-wider">CALIDAD PREMIUM</h4>
                <p class="text-gray-500 text-xs mt-1">Materiales superiores</p>
            </div>
            <div>
                <i class="fas fa-tshirt text-2xl text-white mb-2"></i>
                <h4 class="text-white font-bold text-xs tracking-wider">DISEÑO FUNCIONAL</h4>
                <p class="text-gray-500 text-xs mt-1">Pensado para moverte</p>
            </div>
            <div>
                <i class="fas fa-tachometer-alt text-2xl text-white mb-2"></i>
                <h4 class="text-white font-bold text-xs tracking-wider">MÁXIMO RENDIMIENTO</h4>
                <p class="text-gray-500 text-xs mt-1">Tecnología en cada detalle</p>
            </div>
            <div>
                <i class="fas fa-star text-2xl text-white mb-2"></i>
                <h4 class="text-white font-bold text-xs tracking-wider">ESTILO QUE INSPIRA</h4>
                <p class="text-gray-500 text-xs mt-1">Sé tu mejor versión</p>
            </div>
        </div>
    </div>`;

    let promoBannersHtml = state.promoBanners.length > 0 ? `
    <div class="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        ${state.promoBanners.map(banner => `
            <div class="relative h-[400px] bg-gray-900 overflow-hidden group flex items-end p-8 border border-gray-800">
                <div class="absolute inset-0 bg-[url('${escapeHTML(banner.image)}')] bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity"></div>
                <div class="relative w-full">
                    <h3 class="text-3xl font-black text-white mb-2 uppercase tracking-wide">${escapeHTML(banner.title)}</h3>
                    <p class="text-gray-400 mb-6 max-w-xs">${escapeHTML(banner.subtitle)}</p>
                    
                    <button onclick="navigateTo('product_detail', '${escapeHTML(banner.productId)}')" class="border border-white text-white px-6 py-2 text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors">
                        ${escapeHTML(banner.buttonText)} <i class="fas fa-arrow-right ml-2"></i>
                    </button>
                </div>
            </div>
        `).join('')}
    </div>` : '';

    let totalFiltered = state.products.filter(p => 
        (state.selectedCategory === 'Todas' || p.category === state.selectedCategory) &&
        p.name.toLowerCase().includes(state.searchTerm.toLowerCase())
    ).length;

    let loadMoreBtn = (!isHomePage && state.visibleProductsCount < totalFiltered) ? `
        <div class="mt-12 flex justify-center">
            <button onclick="loadMoreProducts()" class="border border-gray-600 text-white px-8 py-3 text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors">
                Cargar Más
            </button>
        </div>` : '';

    return `
    ${isHomePage ? heroHtml : ''}
    
    <div id="catalogo" class="max-w-7xl mx-auto px-4 ${isHomePage ? 'pt-16' : 'py-8'}">
        <div class="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-800 pb-4">
            <div class="w-full">
                <h2 id="shop-header-title" class="text-2xl font-black text-white uppercase tracking-wide mb-6">
                    ${isHomePage ? 'Productos Destacados' : (state.searchTerm ? 'Resultados de búsqueda' : state.selectedCategory)}
                </h2>
                <div class="flex space-x-2 overflow-x-auto pb-2 w-full hide-scrollbar">${categoriesHtml}</div>
            </div>
             ${isHomePage ? `<button onclick="selectCategoryFilter('Todas')" class="text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap hidden md:block">Ver todo <i class="fas fa-chevron-right ml-1"></i></button>` : ''}
            </div>

        <div id="product-grid-container" class="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
            ${renderProductGrid()}
        </div>
        
        ${loadMoreBtn}
    </div>
    
    ${isHomePage ? promoBannersHtml : ''}
    ${renderFooter()} `;
}

export function renderProductDetail() {
    const p = state.selectedProduct;
    if(!p) return '';
    const priceHtml = p.salePrice 
        ? `<span class="text-3xl font-bold text-white">${formatMoney(p.salePrice)}</span> <span class="text-xl text-gray-500 line-through ml-2">${formatMoney(p.price)}</span>` 
        : `<span class="text-3xl font-bold text-white">${formatMoney(p.price)}</span>`;

    const sizes = p.sizes && p.sizes.length > 0 ? p.sizes : ['S', 'M', 'L', 'XL'];
    
    const colors = p.colors && p.colors.length > 0 ? p.colors : [
        {name: 'Negro', bg: 'bg-black'}, 
        {name: 'Gris', bg: 'bg-gray-400'}, 
        {name: 'Blanco', bg: 'bg-white'}
    ];

    const sizesHtml = sizes.map(s => `
        <button onclick="selectVariant('size', '${s}')" data-size="${s}" class="variant-btn-size w-10 h-10 border border-gray-600 flex items-center justify-center text-xs font-bold transition-all ${state.selectedVariant.size === s ? 'bg-white text-black' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'}">
            ${s}
        </button>
    `).join('');

    const colorsHtml = colors.map(c => {
        const colorName = typeof c === 'string' ? c : c.name;
        const colorBg = typeof c === 'string' ? getColorBgClass(colorName) : c.bg; 
        
        return `<button onclick="selectVariant('color', '${colorName}')" data-color="${colorName}" data-bg="${colorBg}" class="variant-btn-color w-8 h-8 rounded-full ${colorBg} border-2 border-gray-600 ${state.selectedVariant.color === colorName ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0a] ring-white' : 'hover:scale-110'} transition-all" title="${colorName}"></button>`;
    }).join('');

    return `
    <div class="max-w-7xl mx-auto px-4 py-12">
        <button onclick="navigateTo('shop')" class="text-gray-400 hover:text-white mb-8 font-medium uppercase tracking-wider text-sm"><i class="fas fa-arrow-left mr-2"></i> Volver al catálogo</button>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            <div class="flex flex-col">
                <div class="bg-transparent flex items-center justify-center p-8 aspect-[4/5] border border-gray-800 rounded-lg">
                    <img id="main-product-img" src="${escapeHTML(p.images && p.images.length > 0 ? p.images[0] : p.image)}" class="w-full h-full object-cover transition-opacity duration-300" />
                </div>
                
                ${p.images && p.images.length > 1 ? `
                <div class="flex space-x-3 mt-4 overflow-x-auto hide-scrollbar pb-2">
                    ${p.images.map(img => `
                        <button onclick="document.getElementById('main-product-img').src='${escapeHTML(img)}'" class="flex-shrink-0 w-20 h-24 bg-transparent border border-gray-800 rounded-lg overflow-hidden hover:border-white transition-colors focus:outline-none">
                            <img src="${escapeHTML(img)}" class="w-full h-full object-cover" />
                        </button>
                    `).join('')}
                </div>
                ` : ''}
            </div>

            <div class="flex flex-col justify-center">
                <p class="text-sm text-gray-400 font-bold uppercase tracking-widest mb-2">${escapeHTML(p.category)} • ${escapeHTML(p.brand)}</p>
                <h1 class="text-4xl font-black text-white mb-4 uppercase">${escapeHTML(p.name)}</h1>
                <div class="mb-4">${priceHtml}</div>
                <p class="text-gray-400 mb-8 text-sm leading-relaxed">${escapeHTML(p.description)}</p>
                
                <div class="mb-6">
                    <h3 id="label-color" class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Color ${state.selectedVariant.color ? `: <span class="text-white">${state.selectedVariant.color}</span>` : ''}</h3>
                    <div class="flex space-x-4">
                        ${colorsHtml}
                    </div>
                </div>

                <div class="mb-8">
                    <h3 id="label-size" class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Talla ${state.selectedVariant.size ? `: <span class="text-white">${state.selectedVariant.size}</span>` : ''}</h3>
                    <div class="flex space-x-3">
                        ${sizesHtml}
                    </div>
                </div>

                <p class="text-xs font-bold uppercase tracking-wider mb-8 ${p.stock > 0 ? 'text-gray-400' : 'text-red-500'}">
                    <i class="${p.stock > 0 ? 'fas fa-check' : 'fas fa-times'} mr-1"></i>
                    ${p.stock > 0 ? `${p.stock} unidades en stock` : 'Agotado'}
                </p>
                
                <div class="mt-auto border-t border-gray-800 pt-8">
                    <button onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="w-full py-4 font-bold text-sm uppercase tracking-wider transition-colors ${p.stock > 0 ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed border border-gray-800'}">
                         ${p.stock > 0 ? 'AGREGAR AL CARRITO' : 'AGOTADO'}
                    </button>
                </div>
            </div>
        </div>
    </div>
    ${renderFooter()}`;
}