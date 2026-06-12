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

    let productsHtml = displayProducts.map(p => {
        // --- LÓGICA DE NOTIFICACIONES / ETIQUETAS ---
        let badgeHtml = '';
        const isOutOfStock = p.status === 'Agotado' || p.stock <= 0;

        if (isOutOfStock) {
            badgeHtml = `<div class="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg flex items-center z-10 tracking-wider uppercase"><i class="fas fa-times-circle mr-1.5 text-white/80"></i> Agotado</div>`;
        } else if (p.status === 'Sobre Pedido') {
            badgeHtml = `<div class="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg flex items-center z-10 tracking-wider uppercase"><i class="fas fa-clock mr-1.5 text-white/80"></i> Sobre Pedido</div>`;
        } else if (p.status === 'Nuevo Lanzamiento') {
            badgeHtml = `<div class="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg flex items-center z-10 tracking-wider uppercase"><i class="fas fa-bolt mr-1.5 text-white/80"></i> Nuevo</div>`;
        } else if (p.salePrice) {
            badgeHtml = `<div class="absolute top-3 right-3 bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded shadow-lg flex items-center z-10 tracking-wider uppercase"><i class="fas fa-tag mr-1.5 text-black/80"></i> Oferta</div>`;
        }

        return `
        <div class="group bg-[#0a0a0a] flex flex-col h-full">
            <div class="relative bg-[#e5e5e5] aspect-[4/5] cursor-pointer overflow-hidden" onclick="navigateTo('product_detail', '${p.id}')">
                <img src="${escapeHTML(p.image)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-multiply" />
                
                ${badgeHtml}
                
                ${isOutOfStock ? `<div class="absolute inset-0 bg-white/20 backdrop-blur-[2px]"></div>` : ''}
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
        `;
    }).join('');

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
    </div>`;

    // DETECTA SI EL BANNER ES NORMAL O DE ENCARGO ESPECIAL
    let promoBannersHtml = state.promoBanners.length > 0 ? `
    <div class="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        ${state.promoBanners.map(banner => `
            <div class="relative h-[400px] bg-gray-900 overflow-hidden group flex items-end p-8 border border-gray-800">
                <div class="absolute inset-0 bg-[url('${escapeHTML(banner.image)}')] bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity"></div>
                <div class="relative w-full">
                    <h3 class="text-3xl font-black text-white mb-2 uppercase tracking-wide">${escapeHTML(banner.title)}</h3>
                    <p class="text-gray-400 mb-6 max-w-xs">${escapeHTML(banner.subtitle)}</p>
                    
                    ${banner.type === 'custom' ? `
                        <button onclick="showCustomRequestModal()" class="border border-white bg-white text-black px-6 py-2 text-sm font-bold uppercase tracking-wider hover:bg-transparent hover:text-white transition-all">
                            ${escapeHTML(banner.buttonText)} <i class="fas fa-camera ml-2"></i>
                        </button>
                    ` : `
                        <button onclick="navigateTo('product_detail', '${escapeHTML(banner.productId)}')" class="border border-white text-white px-6 py-2 text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors">
                            ${escapeHTML(banner.buttonText)} <i class="fas fa-arrow-right ml-2"></i>
                        </button>
                    `}
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

    // VENTANA MODAL PARA SUBIR FOTO DE CAMISETAS NO ENCONTRADAS
    const customRequestModalHtml = `
    <div id="custom-request-modal" class="fixed inset-0 bg-black/90 z-[100] hidden items-center justify-center p-4 backdrop-blur-sm transition-opacity">
        <div class="bg-[#0a0a0a] p-6 md:p-8 border border-gray-800 max-w-md w-full relative shadow-2xl">
            <button onclick="closeCustomRequestModal()" class="absolute top-4 right-4 text-gray-500 hover:text-white text-2xl focus:outline-none">&times;</button>
            <h2 class="text-lg font-black text-white uppercase tracking-wide mb-1 text-center">Encargo Especial</h2>
            <p class="text-[11px] text-gray-500 text-center mb-6 uppercase tracking-wider">Envíanos la foto de la camiseta y te responderemos de inmediato</p>
            
            <form onsubmit="submitCustomRequest(event)" class="space-y-4">
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                    <input id="req_name" required type="text" class="w-full p-2.5 bg-[#1a1a1a] border border-gray-800 text-white text-xs focus:border-white outline-none">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Celular / WhatsApp</label>
                        <input id="req_phone" required type="tel" class="w-full p-2.5 bg-[#1a1a1a] border border-gray-800 text-white text-xs focus:border-white outline-none" placeholder="300...">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Correo</label>
                        <input id="req_email" required type="email" class="w-full p-2.5 bg-[#1a1a1a] border border-gray-800 text-white text-xs focus:border-white outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sube la Imagen de la Camiseta</label>
                    <input id="req_file" required type="file" accept="image/*" class="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-white file:text-black hover:file:bg-gray-200 file:cursor-pointer cursor-pointer bg-[#1a1a1a] border border-gray-800 p-1.5">
                    <p class="text-[9px] text-gray-500 mt-1 uppercase">Sube una foto en formato JPG o PNG (Máx. 800 KB).</p>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Detalles de la Camiseta</label>
                    <textarea id="req_comment" required rows="2" class="w-full p-2.5 bg-[#1a1a1a] border border-gray-800 text-white text-xs focus:border-white outline-none resize-none" placeholder="Ej. Busco talla M, manga larga, versión jugador..."></textarea>
                </div>
                
                <button type="submit" class="w-full bg-white text-black py-3 font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors mt-6">Enviar Solicitud</button>
            </form>
        </div>
    </div>`;

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
    ${customRequestModalHtml}
    ${renderFooter()} `;
}

export function renderProductDetail() {
    const p = state.selectedProduct;
    if(!p) return '';

    // --- CÁLCULO EN TIEMPO REAL DEL PRECIO EN PANTALLA ---
    let livePrice = p.price;
    if (p.category === 'Camisetas') {
        livePrice = state.selectedVariant.version === 'Jugador' ? (p.pricePlayer || p.price) : (p.priceFan || p.price);
    }
    if (p.category === 'Camisetas' && state.selectedVariant.customNameActive) livePrice += 12000;
    if (p.category === 'Camisetas' && state.selectedVariant.patchActive) livePrice += 4000;
    if (state.selectedVariant.size) {
        const su = state.selectedVariant.size.toUpperCase().trim();
        if (['2XL', '3XL', 'XXL', 'XXXL'].includes(su)) livePrice += 4000;
    }

    const priceHtml = `<span class="text-3xl font-black text-white">${formatMoney(livePrice)}</span>`;

    const sizes = p.sizes && p.sizes.length > 0 ? p.sizes : ['S', 'M', 'L', 'XL', '2XL'];
    const colors = p.colors && p.colors.length > 0 ? p.colors : ['Local', 'Visitante'];

    const sizesHtml = sizes.map(s => `
        <button onclick="selectVariant('size', '${s}')" data-size="${s}" class="variant-btn-size w-10 h-10 border border-gray-600 flex items-center justify-center text-xs font-bold transition-all ${state.selectedVariant.size === s ? 'bg-white text-black' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'}">
            ${s}
        </button>
    `).join('');

    // --- CONTROL DE COLORES CONDICIONAL ---
    let colorSectionHtml = '';
    if (p.colors && p.colors.length > 0) {
        const colorsHtml = p.colors.map(c => {
            const colorName = typeof c === 'string' ? c : c.name;
            const colorBg = typeof c === 'string' ? getColorBgClass(colorName) : c.bg; 
            return `<button onclick="selectVariant('color', '${colorName}')" data-color="${colorName}" data-bg="${colorBg}" class="variant-btn-color w-8 h-8 rounded-full ${colorBg} border-2 border-gray-600 ${state.selectedVariant.color === colorName ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0a] ring-white' : 'hover:scale-110'} transition-all" title="${colorName}"></button>`;
        }).join('');

        colorSectionHtml = `
        <div class="mb-4">
            <h3 id="label-color" class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Color ${state.selectedVariant.color ? `: <span class="text-white">${state.selectedVariant.color}</span>` : ''}</h3>
            <div class="flex space-x-4">${colorsHtml}</div>
        </div>`;
    }

    // --- SECCIÓN DE PERSONALIZACIÓN EXCLUSIVA PARA CAMISETAS (CAMISETAS) ---
    let customizationSectionHtml = '';
    if (p.category === 'Camisetas') {
        customizationSectionHtml = `
        <div class="border-t border-gray-800 pt-6 mt-6 space-y-6">
            <h3 class="text-xs font-black text-white uppercase tracking-wider mb-2">Personalización de la Camiseta</h3>
            
            <div>
                <span class="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Selecciona la Versión</span>
                <div class="flex space-x-4">
                    <button onclick="updateCustomizationField('version', {value: 'Fan'})" class="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border transition-colors ${state.selectedVariant.version === 'Fan' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-500'}">
                        Versión Fan ${p.priceFan ? `(${formatMoney(p.priceFan)})` : ''}
                    </button>
                    <button onclick="updateCustomizationField('version', {value: 'Jugador'})" class="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border transition-colors ${state.selectedVariant.version === 'Jugador' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-500'}">
                        Versión Jugador ${p.pricePlayer ? `(${formatMoney(p.pricePlayer)})` : ''}
                    </button>
                </div>
            </div>

            <div class="bg-[#0f0f0f] p-4 border border-gray-800 rounded">
                <label class="flex items-center space-x-3 cursor-pointer select-none">
                    <input type="checkbox" ${state.selectedVariant.customNameActive ? 'checked' : ''} onchange="updateCustomizationField('customNameActive', this, true)" class="w-4 h-4 accent-white bg-black border-gray-800 rounded">
                    <span class="text-xs font-bold uppercase text-white tracking-wide">Estampado Nombre y Número Personalizado (+$12.000 COP)</span>
                </label>
                
                ${state.selectedVariant.customNameActive ? `
                <div class="grid grid-cols-3 gap-4 mt-4 animate-fadeIn">
                    <div class="col-span-2">
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre en Dorsal</label>
                        <input type="text" placeholder="Ej. MESSI" value="${escapeHTML(state.selectedVariant.customName)}" oninput="state.selectedVariant.customName = this.value" required class="w-full px-3 py-2 bg-black border border-gray-800 text-white font-bold uppercase focus:border-white outline-none text-xs">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Número</label>
                        <input type="text" maxlength="3" placeholder="10" value="${escapeHTML(state.selectedVariant.customNumber)}" oninput="state.selectedVariant.customNumber = this.value" required class="w-full px-3 py-2 bg-black border border-gray-800 text-white font-bold text-center focus:border-white outline-none text-xs">
                    </div>
                </div>` : ''}
            </div>

            <div class="bg-[#0f0f0f] p-4 border border-gray-800 rounded">
                <label class="flex items-center space-x-3 cursor-pointer select-none">
                    <input type="checkbox" ${state.selectedVariant.patchActive ? 'checked' : ''} onchange="updateCustomizationField('patchActive', this, true)" class="w-4 h-4 accent-white bg-black border-gray-800 rounded">
                    <span class="text-xs font-bold uppercase text-white tracking-wide">Agregar Parches de Competencia (+$4.000 COP)</span>
                </label>
                
                ${state.selectedVariant.patchActive ? `
                <div class="mt-4 animate-fadeIn">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Especifica el parche deseado</label>
                    <input type="text" placeholder="Ej. Parche Champions League / Mundial de Clubes" value="${escapeHTML(state.selectedVariant.patchDetails)}" oninput="state.selectedVariant.patchDetails = this.value" required class="w-full px-3 py-2 bg-black border border-gray-800 text-white focus:border-white outline-none text-xs">
                </div>` : ''}
            </div>
        </div>`;
    }

    return `
    <div class="max-w-7xl mx-auto px-4 py-12">
        <button onclick="navigateTo('shop')" class="text-gray-400 hover:text-white mb-8 font-medium uppercase tracking-wider text-sm"><i class="fas fa-arrow-left mr-2"></i> Volver al catálogo</button>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
            
            <div class="flex flex-col md:col-span-5 lg:col-span-4">
                <div class="bg-transparent aspect-[4/5] border border-gray-800 rounded-lg overflow-hidden">
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

            <div class="flex flex-col justify-center md:col-span-7 lg:col-span-8">
                <p class="text-sm text-gray-400 font-bold uppercase tracking-widest mb-2">${escapeHTML(p.category)} • ${escapeHTML(p.brand)}</p>
                <h1 class="text-4xl font-black text-white mb-4 uppercase">${escapeHTML(p.name)}</h1>
                
                <div class="mb-4">${priceHtml}</div>
                
                <p class="text-gray-400 mb-6 text-sm leading-relaxed">${escapeHTML(p.description)}</p>
                
                ${colorSectionHtml}

                <div class="mb-4">
                    <h3 id="label-size" class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Talla ${state.selectedVariant.size ? `: <span class="text-white">${state.selectedVariant.size}</span>` : ''}</h3>
                    <div class="flex space-x-3">${sizesHtml}</div>
                </div>

                ${state.selectedVariant.size && ['2XL', '3XL', 'XXL', 'XXXL'].includes(state.selectedVariant.size.toUpperCase().trim()) ? `
                <p class="text-[11px] text-gray-400 uppercase font-black tracking-wide mb-4 animate-fadeIn"><i class="fas fa-info-circle text-white mr-1"></i> Nota: Las tallas 2XL o superiores tienen un recargo automático de +$4.000 COP</p>
                ` : ''}

                <p class="text-xs font-bold uppercase tracking-wider mb-4 ${p.stock > 0 ? 'text-gray-400' : 'text-red-500'}">
                    <i class="${p.stock > 0 ? 'fas fa-check' : 'fas fa-times'} mr-1"></i>
                    ${p.stock > 0 ? `${p.stock} unidades en stock` : 'Agotado'}
                </p>
                
                ${customizationSectionHtml}
                
                <div class="mt-8 border-t border-gray-800 pt-6">
                    <button onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="w-full py-4 font-bold text-sm uppercase tracking-wider transition-colors ${p.stock > 0 ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed border border-gray-800'}">
                         ${p.stock > 0 ? 'AGREGAR AL CARRITO' : 'AGOTADO'}
                    </button>
                </div>
            </div>
        </div>
    </div>
    ${renderFooter()}`;
}