// ui/admin.js
import { state } from '../state/store.js';
import { formatMoney, escapeHTML } from '../app.js';

export function renderAdminLogin() {
    return `
    <div class="min-h-screen flex items-center justify-center bg-black px-4">
        <div class="max-w-md w-full bg-[#0a0a0a] p-8 border border-gray-800">
            <div class="flex justify-center mb-6">
                <i class="fas fa-bolt text-3xl text-white"></i>
            </div>
            <h2 class="text-xl font-black text-center mb-2 text-white uppercase tracking-widest">Portal Admin</h2>
            <p class="text-center text-gray-500 mb-8 text-xs uppercase tracking-wider">Acceso Restringido</p>
            <form onsubmit="loginAdmin(event)" class="space-y-4">
                <input id="admin_user" required type="text" placeholder="Usuario" class="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm">
                <input id="admin_pass" required type="password" placeholder="Contraseña" class="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm">
                <button type="submit" class="w-full bg-white text-black py-3 font-bold uppercase tracking-wider text-sm hover:bg-gray-200 transition-colors mt-4">Ingresar</button>
            </form>
            <button onclick="navigateTo('shop')" class="block w-full text-center mt-6 text-gray-500 hover:text-white font-bold text-xs uppercase tracking-wider">Volver a la tienda</button>
        </div>
    </div>`;
}

export function renderAdminNav() {
    return `
    <div class="fixed w-64 bg-[#0a0a0a] border-r border-gray-800 text-white h-full z-40 hidden lg:block">
        <div class="p-6 text-xl font-black tracking-widest border-b border-gray-800 flex items-center"><i class="fas fa-bolt mr-2"></i> ADMIN</div>
        <nav class="p-4 space-y-2 mt-4">
            <button onclick="navigateTo('admin_dashboard')" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase ${state.currentView === 'admin_dashboard' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}"><i class="fas fa-chart-bar mr-3 w-5"></i> Dashboard</button>
            <button onclick="navigateTo('admin_products')" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase ${state.currentView === 'admin_products' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}"><i class="fas fa-box mr-3 w-5"></i> Productos</button>
            <button onclick="navigateTo('admin_orders')" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase ${state.currentView === 'admin_orders' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}"><i class="fas fa-clipboard-list mr-3 w-5"></i> Pedidos</button>
            <div class="pt-8 border-t border-gray-800 mt-8">
            <button onclick="navigateTo('admin_banners')" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase ${state.currentView === 'admin_banners' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}"><i class="fas fa-image mr-3 w-5"></i> Banners</button>
                <button onclick="logoutAdmin()" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase text-red-500 hover:bg-[#1a1a1a]"><i class="fas fa-sign-out-alt mr-3 w-5"></i> Salir</button>
            </div>
        </nav>
    </div>

    <div class="lg:hidden bg-[#0a0a0a] text-white p-4 flex justify-between items-center fixed top-0 w-full z-50 border-b border-gray-800">
        <b class="text-lg font-black tracking-widest"><i class="fas fa-bolt mr-2"></i> ADMIN</b>
        <button onclick="toggleAdminMenu()" class="text-white p-2 focus:outline-none">
            <i class="fas ${state.showAdminMenu ? 'fa-times' : 'fa-bars'} text-xl"></i>
        </button>
    </div>

    ${state.showAdminMenu ? `
    <div class="lg:hidden fixed inset-0 bg-black/95 backdrop-blur-md z-40 flex flex-col pt-20">
        <nav class="p-4 space-y-4 mt-4 flex-grow">
            <button onclick="navigateTo('admin_dashboard')" class="w-full text-left px-6 py-4 text-sm font-bold tracking-wider uppercase ${state.currentView === 'admin_dashboard' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'} border border-gray-800"><i class="fas fa-chart-bar mr-4 w-5"></i> Dashboard</button>
            <button onclick="navigateTo('admin_products')" class="w-full text-left px-6 py-4 text-sm font-bold tracking-wider uppercase ${state.currentView === 'admin_products' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'} border border-gray-800"><i class="fas fa-box mr-4 w-5"></i> Productos</button>
            <button onclick="navigateTo('admin_orders')" class="w-full text-left px-6 py-4 text-sm font-bold tracking-wider uppercase ${state.currentView === 'admin_orders' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'} border border-gray-800"><i class="fas fa-clipboard-list mr-4 w-5"></i> Pedidos</button>
            
            <div class="pt-8 mt-8 border-t border-gray-800">
            <button onclick="navigateTo('admin_banners')" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase ${state.currentView === 'admin_banners' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}"><i class="fas fa-image mr-3 w-5"></i> Banners</button>
                <button onclick="logoutAdmin()" class="w-full text-left px-6 py-4 text-sm font-bold tracking-wider uppercase text-red-500 hover:text-red-400"><i class="fas fa-sign-out-alt mr-4 w-5"></i> Cerrar Sesión</button>
            </div>
        </nav>
    </div>` : ''}
    `;
}

export function renderAdminDashboard() {
    const total = state.orders.reduce((s,o)=>s+o.total,0);
    const pending = state.orders.filter(o=>o.status==='Pendiente').length;
    return `
    <div class="p-6 md:p-8 bg-black min-h-screen text-white">
        <h1 class="text-2xl font-black mb-8 uppercase tracking-wide">Resumen General</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-[#0a0a0a] p-6 border border-gray-800 relative overflow-hidden">
                <div class="absolute right-0 top-0 w-16 h-16 bg-[#1a1a1a] rounded-bl-full flex items-start justify-end p-3 text-white"><i class="fas fa-dollar-sign"></i></div>
                <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Ventas Totales</p>
                <p class="text-3xl font-black text-white">${formatMoney(total)}</p>
            </div>
            <div class="bg-[#0a0a0a] p-6 border border-gray-800 relative overflow-hidden">
                <div class="absolute right-0 top-0 w-16 h-16 bg-[#1a1a1a] rounded-bl-full flex items-start justify-end p-3 text-white"><i class="fas fa-clock"></i></div>
                <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Pendientes</p>
                <p class="text-3xl font-black text-white">${pending}</p>
            </div>
            <div class="bg-[#0a0a0a] p-6 border border-gray-800 relative overflow-hidden">
                <div class="absolute right-0 top-0 w-16 h-16 bg-[#1a1a1a] rounded-bl-full flex items-start justify-end p-3 text-white"><i class="fas fa-box"></i></div>
                <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Productos</p>
                <p class="text-3xl font-black text-white">${state.products.length}</p>
            </div>
        </div>
        <div class="bg-[#0a0a0a] border border-gray-800 p-6">
            <h2 class="font-black text-lg mb-4 uppercase tracking-wide">Últimos Pedidos</h2>
            <ul class="divide-y divide-gray-800">
                ${state.orders.slice(0,5).map(o => `
                    <li class="py-4 flex justify-between items-center">
                        <div>
                            <p class="font-bold text-sm text-white">${o.id} <span class="font-normal text-gray-400 ml-2">${formatMoney(o.total)}</span></p>
                            <p class="text-xs text-gray-500 mt-1 uppercase tracking-wider"><i class="far fa-user mr-1"></i> ${escapeHTML(o.customer.name)}</p>
                        </div>
                        <span class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${o.status === 'Entregado' ? 'border-gray-500 text-gray-300' : (o.status === 'Pendiente' ? 'border-white text-white' : 'border-red-500 text-red-500')}">${o.status}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    </div>`;
}

export function renderAdminProducts() {
    let html = state.products.map((p, idx) => `
        <tr class="border-b border-gray-800 hover:bg-[#1a1a1a] transition-colors">
            <td class="p-4 flex items-center">
                <div class="w-12 h-12 bg-[#e5e5e5] p-1 mr-4 hidden sm:block">
                    <img src="${escapeHTML(p.image)}" class="w-full h-full object-cover mix-blend-multiply">
                </div>
                <div>
                    <span class="block text-white font-bold text-sm uppercase">${escapeHTML(p.name)}</span>
                    <span class="text-xs text-gray-500 uppercase tracking-wider">${escapeHTML(p.category)}</span>
                </div>
            </td>
            <td class="p-4">
                <span class="text-xs font-bold uppercase tracking-wider ${p.stock > 0 ? 'text-gray-300' : 'text-red-500'}">${p.stock} UNID.</span>
            </td>
            <td class="p-4 font-bold text-white text-sm">${formatMoney(p.price)}</td>
            <td class="p-4 text-right space-x-3">
                <button onclick="openEditProduct('${p.id}')" class="text-gray-500 hover:text-white transition-colors" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="deleteProduct('${p.id}')" class="text-gray-500 hover:text-white transition-colors" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    let formHtml = '';
    if (state.showProductForm) {
        const ep = state.editingProductId ? state.products.find(p => p.id === state.editingProductId) : null;

        formHtml = `
        <div class="mb-8 bg-[#0a0a0a] p-8 border border-gray-800">
            <h2 class="text-lg font-black mb-6 text-white uppercase tracking-wide">${ep ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onsubmit="${ep ? 'saveEditProduct(event)' : 'saveNewProduct(event)'}" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Nombre</label><input id="${ep ? 'edit_p_name' : 'new_p_name'}" value="${ep ? escapeHTML(ep.name) : ''}" required type="text" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm"></div>
                <div><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Marca</label><input id="${ep ? 'edit_p_brand' : 'new_p_brand'}" value="${ep ? escapeHTML(ep.brand) : ''}" required type="text" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm"></div>
                <div>
                    <label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Categoría</label>
                    <select id="${ep ? 'edit_p_cat' : 'new_p_cat'}" required class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm">
                        ${state.categories.filter(c => c !== 'Todas').map(c => `<option value="${c}" ${ep && ep.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Precio (Sin formato)</label><input id="${ep ? 'edit_p_price' : 'new_p_price'}" value="${ep ? ep.price : ''}" required type="number" step="0.01" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm"></div>
                <div><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Stock</label><input id="${ep ? 'edit_p_stock' : 'new_p_stock'}" value="${ep ? ep.stock : ''}" required type="number" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm"></div>
                
                <div class="md:col-span-2">
                    <label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">URLs de Imágenes (Separadas por coma)</label>
                    <input id="${ep ? 'edit_p_images' : 'new_p_images'}" value="${ep ? escapeHTML(ep.images ? ep.images.join(', ') : ep.image) : ''}" type="text" placeholder="https://img1.jpg, https://img2.jpg" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm">
                    <p class="text-[10px] text-gray-500 mt-1">La primera imagen será la principal del catálogo.</p>
                </div>                
                <div>
                    <label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Tallas (Separadas por coma)</label>
                    <input id="${ep ? 'edit_p_sizes' : 'new_p_sizes'}" value="${ep ? escapeHTML(ep.sizes ? ep.sizes.join(', ') : '') : ''}" type="text" placeholder="S, M, L, XL" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm">
                </div>
                <div>
                    <label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Colores (Separados por coma)</label>
                    <input id="${ep ? 'edit_p_colors' : 'new_p_colors'}" value="${ep ? escapeHTML(ep.colors ? ep.colors.map(c => typeof c === 'string' ? c : c.name).join(', ') : '') : ''}" type="text" placeholder="Negro, Blanco, Rojo, Azul" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm">
                </div>

                <div class="md:col-span-2"><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Descripción</label><textarea id="${ep ? 'edit_p_desc' : 'new_p_desc'}" required class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm" rows="3">${ep ? escapeHTML(ep.description) : ''}</textarea></div>
                
                <div class="md:col-span-2 flex justify-end space-x-4 mt-4">
                    <button type="button" onclick="toggleProductForm()" class="px-6 py-3 border border-gray-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors">Cancelar</button>
                    <button type="submit" class="px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors">Guardar</button>
                </div>
            </form>
        </div>`;
    }

    return `
    <div class="p-6 md:p-8 bg-black min-h-screen text-white">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
            <h1 class="text-2xl font-black text-white uppercase tracking-wide">Catálogo</h1>
            <button onclick="toggleProductForm()" class="bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors">
                ${state.showProductForm ? 'Cerrar Formulario' : '+ Agregar Producto'}
            </button>
        </div>
        
        ${formHtml}

        <div class="bg-[#0a0a0a] border border-gray-800 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-[#1a1a1a] text-gray-400 uppercase text-xs font-bold tracking-wider border-b border-gray-800">
                        <tr><th class="p-4">Producto</th><th class="p-4">Inventario</th><th class="p-4">Precio</th><th class="p-4 text-right">Acción</th></tr>
                    </thead>
                    <tbody>${html.length > 0 ? html : '<tr><td colspan="4" class="p-8 text-center text-gray-500 uppercase tracking-wider text-xs">Sin productos</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}

export function renderAdminOrders() {
    let html = state.orders.map((o, idx) => `
        <tr class="border-b border-gray-800 hover:bg-[#1a1a1a] transition-colors">
            <td class="p-4 font-bold text-white text-sm">${o.id}</td>
            <td class="p-4">
                <span class="block text-white font-bold text-sm uppercase">${escapeHTML(o.customer.name)}</span>
                <span class="text-xs text-gray-500 block mb-2">${escapeHTML(o.customer.email)}</span>
                
                <div class="text-[11px] text-gray-400 space-y-1 bg-[#111111] p-3 border border-gray-800 rounded mt-2">
                    ${o.items ? o.items.map(item => `
                        <div>• ${escapeHTML(item.name)} <span class="text-gray-500">(${item.size}/${item.color})</span> x${item.quantity} - <span class="text-gray-300">${formatMoney(item.price)}</span></div>
                    `).join('') : '<span class="text-gray-600">Sin detalles de artículos</span>'}
                </div>
            </td>
            <td class="p-4 font-bold text-white text-sm">${formatMoney(o.total)}</td>
            <td class="p-4">
                <select onchange="updateOrderStatus('${o.firebaseId}', this.value)" class="bg-[#1a1a1a] border border-gray-700 p-2 text-xs font-bold uppercase tracking-wider text-white focus:border-white outline-none cursor-pointer">
                    <option value="Pendiente" ${o.status==='Pendiente'?'selected':''}>Pendiente</option>
                    <option value="Entregado" ${o.status==='Entregado'?'selected':''}>Entregado</option>
                    <option value="Cancelado" ${o.status==='Cancelado'?'selected':''}>Cancelado</option>
                </select>
            </td>
        </tr>
    `).join('');

    return `
    <div class="p-6 md:p-8 bg-black min-h-screen text-white">
        <h1 class="text-2xl font-black mb-8 text-white uppercase tracking-wide">Pedidos</h1>
        <div class="bg-[#0a0a0a] border border-gray-800 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-[#1a1a1a] text-gray-400 uppercase text-xs font-bold tracking-wider border-b border-gray-800">
                        <tr><th class="p-4">ID</th><th class="p-4">Cliente</th><th class="p-4">Total</th><th class="p-4">Estado</th></tr>
                    </thead>
                    <tbody>${html.length > 0 ? html : '<tr><td colspan="4" class="p-8 text-center text-gray-500 uppercase tracking-wider text-xs">Sin pedidos</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}

export function renderAdminBanners() {
    let html = state.promoBanners.map(b => `
        <tr class="border-b border-gray-800 hover:bg-[#1a1a1a] transition-colors">
            <td class="p-4 flex items-center">
                <div class="w-20 h-12 bg-[#e5e5e5] mr-4 hidden sm:block overflow-hidden">
                    <img src="${escapeHTML(b.image)}" class="w-full h-full object-cover">
                </div>
                <div>
                    <span class="block text-white font-bold text-sm uppercase">${escapeHTML(b.title)}</span>
                    <span class="text-xs text-gray-500">${escapeHTML(b.subtitle)}</span>
                </div>
            </td>
            <td class="p-4 text-xs text-gray-400 font-bold uppercase tracking-wider">${escapeHTML(b.buttonText)}</td>
            <td class="p-4 text-xs text-gray-400 truncate max-w-[100px]">${escapeHTML(b.productId)}</td>
            <td class="p-4 text-right space-x-3">
                <button onclick="openEditBanner('${b.id}')" class="text-gray-500 hover:text-white transition-colors" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="deleteBanner('${b.id}')" class="text-gray-500 hover:text-white transition-colors" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    let formHtml = '';
    if (state.showBannerForm) {
        const eb = state.editingBannerId ? state.promoBanners.find(b => b.id === state.editingBannerId) : null;

        const productOptions = state.products.map(p => 
            `<option value="${p.id}" ${eb && eb.productId === p.id ? 'selected' : ''}>${escapeHTML(p.name)}</option>`
        ).join('');

        formHtml = `
        <div class="mb-8 bg-[#0a0a0a] p-8 border border-gray-800">
            <h2 class="text-lg font-black mb-6 text-white uppercase tracking-wide">${eb ? 'Editar Banner' : 'Nuevo Banner'}</h2>
            <form onsubmit="${eb ? 'saveEditBanner(event)' : 'saveNewBanner(event)'}" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Título Principal</label><input id="${eb ? 'edit_b_title' : 'new_b_title'}" value="${eb ? escapeHTML(eb.title) : ''}" required type="text" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm" placeholder="Ej. Nueva Colección"></div>
                <div><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Subtítulo</label><input id="${eb ? 'edit_b_sub' : 'new_b_sub'}" value="${eb ? escapeHTML(eb.subtitle) : ''}" required type="text" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm" placeholder="Ej. Perfecta para apoyar a tu equipo"></div>
                <div><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Texto del Botón</label><input id="${eb ? 'edit_b_btn' : 'new_b_btn'}" value="${eb ? escapeHTML(eb.buttonText) : 'Descubrir Más'}" required type="text" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm"></div>
                <div>
                    <label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Enlazar al Producto</label>
                    <select id="${eb ? 'edit_b_prod' : 'new_b_prod'}" required class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm">
                        <option value="">Selecciona un producto...</option>
                        ${productOptions}
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">URL de la Imagen de Fondo</label>
                    <input id="${eb ? 'edit_b_img' : 'new_b_img'}" value="${eb ? escapeHTML(eb.image) : ''}" required type="url" placeholder="https://..." class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm">
                </div>
                
                <div class="md:col-span-2 flex justify-end space-x-4 mt-4">
                    <button type="button" onclick="toggleBannerForm()" class="px-6 py-3 border border-gray-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors">Cancelar</button>
                    <button type="submit" class="px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors">Guardar</button>
                </div>
            </form>
        </div>`;
    }

    return `
    <div class="p-6 md:p-8 bg-black min-h-screen text-white">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
            <h1 class="text-2xl font-black text-white uppercase tracking-wide">Gestión de Banners</h1>
            <button onclick="toggleBannerForm()" class="bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors">
                ${state.showBannerForm ? 'Cerrar Formulario' : '+ Agregar Banner'}
            </button>
        </div>
        
        ${formHtml}

        <div class="bg-[#0a0a0a] border border-gray-800 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-[#1a1a1a] text-gray-400 uppercase text-xs font-bold tracking-wider border-b border-gray-800">
                        <tr><th class="p-4">Banner</th><th class="p-4">Botón</th><th class="p-4">ID Producto</th><th class="p-4 text-right">Acción</th></tr>
                    </thead>
                    <tbody>${html.length > 0 ? html : '<tr><td colspan="4" class="p-8 text-center text-gray-500 uppercase tracking-wider text-xs">Sin banners configurados</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}