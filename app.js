// app.js

// 1. Importamos nuestra base de datos y autenticación ya configuradas
import { db, auth } from './firebase/config.js';
import { state, saveCart } from './state/store.js';
import { selectCategoryFilter, loadMoreProducts, selectVariant, handleSearch, renderShop, renderProductDetail } from './ui/catalog.js';
import { renderAdminLogin, renderAdminNav, renderAdminDashboard, renderAdminProducts, renderAdminOrders, renderAdminBanners } from './ui/admin.js';
// 3. Importamos solo las funciones operativas que app.js necesita por ahora
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Observador en tiempo real: Firebase nos dice automáticamente si hay un admin logueado
onAuthStateChanged(auth, (user) => {
    if (user) {
        state.isAdminAuth = true;
    } else {
        state.isAdminAuth = false;
    }
    render(); // Refresca la interfaz dependiendo del estado
});

// --- UTILIDADES ---
// Actualizado a formato MXN para igualar tu imagen
export const formatMoney = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
const generateId = (prefix) => {
    // crypto.randomUUID() genera algo como "36b8f84d-df4e-4d49-..."
    // Tomamos el primer bloque (8 caracteres) y lo pasamos a mayúsculas
    // para crear un número de orden seguro y profesional.
    return prefix + '-' + crypto.randomUUID().split('-')[0].toUpperCase();
};

export const escapeHTML = (str) => {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
};

export const getColorBgClass = (colorName) => {
    const name = colorName.toLowerCase().trim();
    const map = {
        'negro': 'bg-black',
        'gris': 'bg-gray-500',
        'blanco': 'bg-white',
        'rojo': 'bg-red-600',
        'azul': 'bg-blue-600',
        'verde': 'bg-green-600',
        'amarillo': 'bg-yellow-400',
        'naranja': 'bg-orange-500',
        'morado': 'bg-purple-600',
        'rosa': 'bg-pink-500'
    };
    return map[name] || 'bg-gray-400'; // Si escribes un color raro, se pondrá gris
};

// --- FUNCIONES CORE ---
function toggleAdminMenu() {
    state.showAdminMenu = !state.showAdminMenu;
    render();
}

function navigateTo(view, dataId = null, pushToHistory = true) {
    // 1. Guardamos el scroll exacto si salimos de la tienda para ver un producto
    if (state.currentView === 'shop' && view === 'product_detail') {
        state.savedScrollPosition = window.scrollY;
    }

    // 2. Solo reiniciamos a 10 productos si NO estamos regresando de un detalle de producto
    if (view === 'shop' && state.currentView !== 'product_detail') {
        state.visibleProductsCount = 10; 
        state.isHomeView = true; // Por defecto al navegar a la tienda, mostramos el Home
    }
    
    const previousView = state.currentView; // Recordamos de dónde venimos
    state.currentView = view;
    state.showAdminMenu = false;
    
    if (dataId) {
        state.selectedProduct = state.products.find(p => p.id === dataId);
        state.selectedVariant = { size: null, color: null }; 
    }
    
    if (state.isAdminAuth && view.startsWith('admin_')) {
        loadOrdersFromFirebase();
        loadProductsFromFirebase();
    }
    
    // --- MAGIA DEL HISTORY API AQUÍ ---
    if (pushToHistory) {
        // Creamos un identificador para la URL (ej. #product_detail/123 o #cart)
        const hash = dataId ? `#${view}/${dataId}` : `#${view}`;
        window.history.pushState({ view: view, dataId: dataId }, '', hash);
    }
    
    render();

    // 3. Restauramos la posición de lectura o vamos hacia arriba
    if (view === 'shop' && previousView === 'product_detail') {
        setTimeout(() => window.scrollTo(0, state.savedScrollPosition), 10);
    } else {
        window.scrollTo(0, 0);
    }
}

function goHome() {
    state.selectedCategory = 'Todas';
    state.searchTerm = '';
    state.isHomeView = true;
    state.visibleProductsCount = 10;
    
    // Si ya estamos en la tienda, simplemente repintamos y subimos. 
    // Si no, navegamos a la tienda.
    if (state.currentView === 'shop') {
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        navigateTo('shop');
    }
}

async function loadProductsFromFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        state.products = querySnapshot.docs.map(doc => {
            return { id: doc.id, ...doc.data() };
        });
        render();
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

async function loadBannersFromFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "banners"));
        state.promoBanners = querySnapshot.docs.map(doc => {
            return { id: doc.id, ...doc.data() };
        });
        render(); // Refresca la vista una vez que llegan los datos
    } catch (error) {
        console.error("Error cargando banners:", error);
    }
}

async function loadOrdersFromFirebase() {
    try {
        // Creamos una consulta ordenada por el campo "date" de forma descendente (desc)
        const q = query(collection(db, "orders"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        
        state.orders = querySnapshot.docs.map(doc => {
            return { firebaseId: doc.id, ...doc.data() };
        });
        render();
    } catch (error) {
        console.error("Error cargando pedidos:", error);
    }
}

function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    // 1. Validaciones obligatorias
    if (!state.selectedVariant.size) {
        showToast('Por favor, selecciona una talla antes de agregar al carrito.', 'error');
        return;
    }
    if (!state.selectedVariant.color) {
        showToast('Por favor, selecciona un color antes de agregar al carrito.', 'error');
        return;
    }

    // 2. Buscamos si EXACTAMENTE el mismo producto (con la misma talla y color) ya está en el carrito
    const existingItemIndex = state.cart.findIndex(item => 
        item.product.id === product.id && 
        item.size === state.selectedVariant.size && 
        item.color === state.selectedVariant.color
    );

    if (existingItemIndex !== -1) {
        // Si ya existe, aumentamos la cantidad validando el stock
        if (state.cart[existingItemIndex].quantity < product.stock) {
            state.cart[existingItemIndex].quantity += 1;
            saveCart();
            showToast('Cantidad actualizada en el carrito', 'success');
            render(); // Actualizamos la vista (burbuja del navbar)
        } else {
            showToast('Límite de stock alcanzado para este producto.', 'error');
        }
    } else {
        // Si no existe, lo agregamos como un item nuevo
        if (product.stock > 0) {
            state.cart.push({
                product: product,
                size: state.selectedVariant.size,
                color: state.selectedVariant.color,
                quantity: 1
            });
            saveCart();
            showToast('Producto agregado al carrito', 'success');
            render(); // Actualizamos la vista (burbuja del navbar)
        } else {
            showToast('Este producto se encuentra agotado.', 'error');
        }
    }
}

function removeFromCart(index) {
    state.cart.splice(index, 1);
    saveCart();
    render();
}

function updateCartQuantity(index, delta) {
    const item = state.cart[index];
    const newQty = item.quantity + delta;
    if (newQty > 0 && newQty <= item.product.stock) {
        item.quantity = newQty;
        saveCart();
        render();
    }
}

async function placeOrder(event) {
    event.preventDefault();
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerText;
    btnSubmit.innerText = "PROCESANDO...";
    btnSubmit.disabled = true;

    const total = state.cart.reduce((sum, item) => sum + ((item.product.salePrice || item.product.price) * item.quantity), 0);
    const customer = {
        name: document.getElementById('c_name').value,
        email: document.getElementById('c_email').value,
        phone: document.getElementById('c_phone').value,
        address: document.getElementById('c_address').value
    };
    
    const items = state.cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.salePrice || item.product.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color
    }));
    
    const newOrder = { 
        id: generateId('ORD'), 
        customer, 
        items,
        total, 
        status: 'Pendiente', 
        date: new Date().toISOString() 
    };
    
    try {
        // 1. Guarda el pedido en la base de datos de Firebase
        await addDoc(collection(db, "orders"), newOrder);
        window.lastOrder = newOrder;
        
        // 2. Prepara los datos para la plantilla de EmailJS
        const templateParams = {
            customer_name: customer.name,
            customer_email: customer.email,
            order_id: newOrder.id,
            total: formatMoney(total)
        };

        // 3. Envía el correo (Asegúrate de poner tu Template ID real aquí)
        await emailjs.send('service_teppqxy', 'template_lt5np1t', templateParams);

        // 4. Limpia el carrito local y en la memoria
        state.cart = [];
        saveCart();
        
        // 5. Manda al usuario a la vista de éxito
        navigateTo('order_success'); 
        
    } catch (error) {
        console.error("Error al procesar el pedido:", error);
        showToast("Hubo un error al procesar tu pedido.", 'error');
    } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
    }
}

async function loginAdmin(event) {
    event.preventDefault();
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "VERIFICANDO...";
    btnSubmit.disabled = true;

    const email = document.getElementById('admin_user').value; // Ahora debe ser un email
    const pass = document.getElementById('admin_pass').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        navigateTo('admin_dashboard');
    } catch (error) {
        console.error("Error de autenticación:", error);
        showToast('Credenciales incorrectas o no autorizadas.', 'error');
    } finally {
        btnSubmit.innerText = "Ingresar";
        btnSubmit.disabled = false;
    }
}

async function logoutAdmin() {
    try {
        await signOut(auth);
        navigateTo('shop');
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}

function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    
    // Colores e íconos minimalistas dependiendo de si es éxito o error
    const borderColor = type === 'error' ? 'border-red-500' : 'border-white';
    const icon = type === 'error' ? '<i class="fas fa-times text-red-500 mr-3 text-lg"></i>' : '<i class="fas fa-check text-white mr-3 text-lg"></i>';

    // Diseño del toast flotante
    toast.className = `fixed bottom-5 left-1/2 transform -translate-x-1/2 md:left-auto md:translate-x-0 md:bottom-10 md:right-10 z-[100] bg-[#0a0a0a] text-white px-6 py-4 border ${borderColor} shadow-2xl flex items-center transition-all duration-300 translate-y-10 opacity-0 uppercase tracking-wider text-xs font-bold w-max max-w-[90vw]`;
    toast.innerHTML = `${icon} <span>${message}</span>`;

    document.body.appendChild(toast);

    // Animación de entrada
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    // Animación de salida y limpieza
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- FUNCIONES DE ADMIN ---
function toggleProductForm() {
    state.showProductForm = !state.showProductForm;
    if (!state.showProductForm) state.editingProductId = null; // Si se cierra, limpia el producto en edición
    render();
}

async function saveNewProduct(event) {
    event.preventDefault();
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerText;
    btnSubmit.innerText = "GUARDANDO...";
    btnSubmit.disabled = true;

    const newStock = parseInt(document.getElementById('new_p_stock').value);
    
    // Obtener los valores de los inputs
    const sizesInput = document.getElementById('new_p_sizes').value;
    const colorsInput = document.getElementById('new_p_colors').value;
    const imagesInput = document.getElementById('new_p_images').value; // <-- NUEVO INPUT
    
    // Convertir textos separados por coma a arreglos
    const sizes = sizesInput ? sizesInput.split(',').map(s => s.trim()).filter(s => s !== '') : [];
    const colors = colorsInput ? colorsInput.split(',').map(c => c.trim()).filter(c => c !== '') : [];
    const imagesArray = imagesInput ? imagesInput.split(',').map(i => i.trim()).filter(i => i !== '') : [];

    // Definir imagen principal (si no hay, usa una por defecto)
    const mainImage = imagesArray.length > 0 ? imagesArray[0] : 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=600&q=80';

    const newProduct = {
        name: document.getElementById('new_p_name').value,
        description: document.getElementById('new_p_desc').value,
        category: document.getElementById('new_p_cat').value,
        brand: document.getElementById('new_p_brand').value,
        price: parseFloat(document.getElementById('new_p_price').value),
        salePrice: null,
        stock: newStock,
        status: newStock > 0 ? 'Disponible' : 'Agotado',
        image: mainImage,          // Mantiene compatibilidad con el catálogo
        images: imagesArray,       // Guarda toda la galería
        sizes: sizes,
        colors: colors
    };

    try {
        await addDoc(collection(db, "products"), newProduct);
        state.showProductForm = false;
        await loadProductsFromFirebase();
    } catch (error) {
        console.error("Error guardando el producto: ", error);
        showToast('Hubo un error al guardar el producto.', 'error');
    } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
    }
}

// --- FUNCIONES PARA BANNERS ---
function toggleBannerForm() {
    state.showBannerForm = !state.showBannerForm;
    if (!state.showBannerForm) state.editingBannerId = null;
    render();
}

async function saveNewBanner(event) {
    event.preventDefault();
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerText;
    btnSubmit.innerText = "GUARDANDO...";
    btnSubmit.disabled = true;

    const newBanner = {
        title: document.getElementById('new_b_title').value,
        subtitle: document.getElementById('new_b_sub').value,
        buttonText: document.getElementById('new_b_btn').value,
        image: document.getElementById('new_b_img').value,
        productId: document.getElementById('new_b_prod').value
    };

    try {
        await addDoc(collection(db, "banners"), newBanner);
        state.showBannerForm = false;
        showToast('Banner creado exitosamente.', 'success');
        await loadBannersFromFirebase();
    } catch (error) {
        console.error("Error guardando el banner: ", error);
        showToast('Hubo un error al guardar el banner.', 'error');
    } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
    }
}

function openEditBanner(bannerId) {
    state.editingBannerId = bannerId;
    state.showBannerForm = true;
    render();
}

async function saveEditBanner(event) {
    event.preventDefault();
    if (!state.editingBannerId) return;

    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerText;
    btnSubmit.innerText = "GUARDANDO...";
    btnSubmit.disabled = true;

    const updatedBanner = {
        title: document.getElementById('edit_b_title').value,
        subtitle: document.getElementById('edit_b_sub').value,
        buttonText: document.getElementById('edit_b_btn').value,
        image: document.getElementById('edit_b_img').value,
        productId: document.getElementById('edit_b_prod').value
    };

    try {
        await updateDoc(doc(db, "banners", state.editingBannerId), updatedBanner);
        state.showBannerForm = false;
        state.editingBannerId = null;
        showToast('Banner actualizado exitosamente.', 'success');
        await loadBannersFromFirebase();
    } catch (error) {
        console.error("Error actualizando el banner: ", error);
        showToast('Hubo un error al actualizar.', 'error');
    } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
    }
}

async function deleteBanner(bannerId) {
    if(confirm('¿Seguro que deseas eliminar este banner?')) {
        try {
            await deleteDoc(doc(db, "banners", bannerId));
            showToast('Banner eliminado exitosamente.', 'success');
            await loadBannersFromFirebase();
        } catch (error) {
            console.error("Error al eliminar:", error);
            showToast('Hubo un error al eliminar.', 'error');
        }
    }
}

async function deleteProduct(productId) {
    if(confirm('¿Seguro que deseas eliminar este producto de forma permanente?')) {
        try {
            // Borramos directamente usando el ID de Firebase
            await deleteDoc(doc(db, "products", productId));
            
            showToast('Producto eliminado exitosamente.', 'success');
            await loadProductsFromFirebase(); // Recarga la tabla
        } catch (error) {
            console.error("Error al eliminar:", error);
            showToast('Hubo un error al eliminar el producto.', 'error');
        }
    }
}

function openEditProduct(productId) {
    state.editingProductId = productId;
    state.showProductForm = true; // Abre el formulario
    render();
}

async function saveEditProduct(event) {
    event.preventDefault();
    if (!state.editingProductId) return;

    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerText;
    btnSubmit.innerText = "GUARDANDO...";
    btnSubmit.disabled = true;

    const newStock = parseInt(document.getElementById('edit_p_stock').value);
    
    // Obtener los valores de los inputs de edición
    const sizesInput = document.getElementById('edit_p_sizes').value;
    const colorsInput = document.getElementById('edit_p_colors').value;
    const imagesInput = document.getElementById('edit_p_images').value;
    
    // Convertir textos separados por coma a arreglos
    const sizes = sizesInput ? sizesInput.split(',').map(s => s.trim()).filter(s => s !== '') : [];
    const colors = colorsInput ? colorsInput.split(',').map(c => c.trim()).filter(c => c !== '') : [];
    const imagesArray = imagesInput ? imagesInput.split(',').map(i => i.trim()).filter(i => i !== '') : [];

    const mainImage = imagesArray.length > 0 ? imagesArray[0] : 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=600&q=80';

    const updatedProduct = {
        name: document.getElementById('edit_p_name').value,
        description: document.getElementById('edit_p_desc').value,
        category: document.getElementById('edit_p_cat').value,
        brand: document.getElementById('edit_p_brand').value,
        price: parseFloat(document.getElementById('edit_p_price').value),
        stock: newStock,
        status: newStock > 0 ? 'Disponible' : 'Agotado',
        image: mainImage,
        images: imagesArray,
        sizes: sizes,
        colors: colors
    };

    try {
        // Actualizamos en Firebase usando el documento específico
        await updateDoc(doc(db, "products", state.editingProductId), updatedProduct);
        state.showProductForm = false;
        state.editingProductId = null;
        showToast('Producto actualizado exitosamente.', 'success');
        await loadProductsFromFirebase();
    } catch (error) {
        console.error("Error actualizando el producto: ", error);
        showToast('Hubo un error al actualizar el producto.', 'error');
    } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
    }
}

async function updateOrderStatus(orderFirebaseId, newStatus) {
    try {
        // Actualizamos en Firebase directamente usando su ID único
        await updateDoc(doc(db, "orders", orderFirebaseId), { status: newStatus });
        
        // Actualizamos el estado localmente para reflejarlo en la interfaz sin recargar todo de Firebase
        const orderIndex = state.orders.findIndex(o => o.firebaseId === orderFirebaseId);
        if (orderIndex !== -1) {
            state.orders[orderIndex].status = newStatus;
        }
        
        render();
        showToast('Estado del pedido actualizado.', 'success');
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        showToast('Error al actualizar el estado en la nube.', 'error');
    }
}

// --- RENDERIZADO HTML ---
function render() {
    const app = document.getElementById('app');
    let html = '';

    if (state.isAdminAuth && state.currentView.startsWith('admin_')) {
        html += renderAdminNav();
    } else if (state.currentView !== 'admin_login') {
        html += renderNavbar();
    }

    html += `<main class="${state.isAdminAuth && state.currentView.startsWith('admin_') ? 'lg:ml-64' : ''} transition-all duration-300">`;
    
    switch (state.currentView) {
        case 'shop': html += renderShop(); break;
        case 'product_detail': html += renderProductDetail(); break;
        case 'cart': html += renderCart(); break;
        case 'checkout': html += renderCheckout(); break;
        case 'order_success': html += renderOrderSuccess(); break; // <-- NUEVA LÍNEA AGREGADA
        case 'admin_login': html += renderAdminLogin(); break;
        case 'admin_dashboard': html += renderAdminDashboard(); break;
        case 'admin_products': html += renderAdminProducts(); break;
        case 'admin_orders': html += renderAdminOrders(); break;
        case 'admin_banners': html += renderAdminBanners(); break;
        
    }
    
    html += `</main>`;
    app.innerHTML = html;
}

// --- Vistas Cliente ---
function renderNavbar() {
    const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    return `
    <div class="bg-[#050505] border-b border-gray-800 text-gray-400 text-[10px] sm:text-xs py-2 hidden md:block">
        <div class="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <div class="flex space-x-6">
                <span><i class="fas fa-truck mr-1"></i> Envío contra entrega todo Colombia</span>
                <span><i class="fas fa-undo mr-1"></i> Cambios fáciles y rápidos</span>
                <span><i class="fas fa-credit-card mr-1"></i> Pagos 100% seguros</span>
                <span><i class="fas fa-undo mr-1"></i> Soporte 24/7</span>
            </div>
            <div>
                <span>Colombia | COP <i class="fas fa-chevron-down ml-1"></i></span>
            </div>
        </div>
    </div>

    <header class="bg-[#050505] text-white sticky top-0 z-50 border-b border-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                
                <div class="flex items-center cursor-pointer" onclick="goHome()">
                    <img src="./logos/logo.png" alt="FutWear Logo" class="h-8 md:h-8 object-contain">
                </div>

                <nav class="hidden lg:flex space-x-8 text-sm font-bold tracking-wide">
                    <button onclick="selectCategoryFilter('Todas'); state.searchTerm=''; navigateTo('shop')" class="hover:text-gray-400 transition-colors">HOMBRE</button>
                    <button onclick="showToast('Colección de mujer próximamente', 'success')" class="hover:text-gray-400 transition-colors">MUJER</button>
                    <button onclick="selectCategoryFilter('Accesorios'); state.searchTerm=''; navigateTo('shop')" class="hover:text-gray-400 transition-colors">ACCESORIOS</button>
                    <button onclick="showToast('Zona de ofertas en construcción', 'success')" class="hover:text-gray-400 transition-colors">OFERTAS</button>
                    <button onclick="showToast('Nuevos lanzamientos muy pronto', 'success')" class="hover:text-gray-400 transition-colors">NUEVOS</button>
                </nav>

                <div class="flex items-center space-x-4">
                    <div class="hidden md:block relative">
                        <input type="text" placeholder="Buscar productos..." value="${escapeHTML(state.searchTerm)}" oninput="if(state.currentView==='shop'){handleSearch(event)}else{state.searchTerm=this.value; navigateTo('shop');}" class="w-48 lg:w-64 pl-10 pr-4 py-2 bg-[#1a1a1a] border border-gray-800 text-white rounded-lg focus:border-white outline-none text-sm transition-colors"/>
                        <i class="fas fa-search absolute left-4 top-2.5 text-gray-500"></i>
                    </div>
                    
                    <button onclick="navigateTo('admin_login')" class="p-2 hover:text-gray-400"><i class="far fa-user text-lg"></i></button>
                    <button class="p-2 hover:text-gray-400 hidden sm:block"><i class="far fa-heart text-lg"></i></button>
                    <button onclick="navigateTo('cart')" class="relative p-2 hover:text-gray-400">
                        <i class="fas fa-shopping-bag text-lg"></i>
                        ${cartCount > 0 ? `<span class="absolute top-0 right-0 px-1.5 py-0.5 text-[10px] font-bold text-black bg-white rounded-full transform translate-x-1/4 -translate-y-1/4">${cartCount}</span>` : ''}
                    </button>
                </div>
            </div>
            
            <div class="md:hidden pb-4">
                <div class="relative">
                    <input type="text" placeholder="Buscar productos..." value="${escapeHTML(state.searchTerm)}" oninput="if(state.currentView==='shop'){handleSearch(event)}else{state.searchTerm=this.value; navigateTo('shop');}" class="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-gray-800 text-white rounded-lg focus:border-white outline-none text-sm transition-colors"/>
                    <i class="fas fa-search absolute left-4 top-3 text-gray-500"></i>
                </div>
            </div>
            
        </div>
    </header>`;
}

export function renderFooter() {
    return `
    
    <footer class="bg-[#050505] pt-16 pb-8 border-t border-black text-sm">
        <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
            <div class="md:col-span-2">
                <div class="flex items-center mb-6">
                    <img src="./logos/logo.png" alt="FutWear Logo" class="h-10 md:h-8 object-contain">
                </div>
                <p class="text-gray-400 mb-6 max-w-xs">Ropa deportiva diseñada para el rendimiento, creada para inspirar tu mejor versión.</p>
                <div class="flex space-x-4">
                    <a href="#" class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"><i class="fab fa-tiktok"></i></a>
                    <a href="#" class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"><i class="fab fa-youtube"></i></a>
                </div>
            </div>
            <div>
                <h5 class="text-white font-bold mb-6 tracking-wider">COMPRAR</h5>
                <ul class="space-y-4 text-gray-400">
                    <li><a href="#" class="hover:text-white transition-colors">Hombre</a></li>
                    <li><a href="#" class="hover:text-white transition-colors">Mujer</a></li>
                    <li><a href="#" class="hover:text-white transition-colors">Ofertas</a></li>
                </ul>
            </div>
            <div>
                <h5 class="text-white font-bold mb-6 tracking-wider">AYUDA</h5>
                <ul class="space-y-4 text-gray-400">
                    <li><a href="#" class="hover:text-white transition-colors">Envíos</a></li>
                    <li><a href="#" class="hover:text-white transition-colors">Guía de tallas</a></li>
                    <li><a href="#" class="hover:text-white transition-colors">Contacto</a></li>
                </ul>
            </div>
            <div>
                <h5 class="text-white font-bold mb-6 tracking-wider">SUSCRÍBETE</h5>
                <p class="text-gray-400 mb-4">Recibe ofertas exclusivas y lanzamientos antes que nadie.</p>
                <div class="relative">
                    <input type="email" placeholder="Tu correo electrónico" class="w-full bg-[#1a1a1a] border border-gray-800 text-white px-4 py-3 rounded outline-none focus:border-gray-500 pr-12">
                    <button class="absolute right-4 top-3.5 text-gray-400 hover:text-white"><i class="fas fa-envelope"></i></button>
                </div>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-4 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
            <p>&copy; 2026 Futwear. Todos los derechos reservados.</p>
            <div class="flex space-x-6 mt-4 md:mt-0">
                <a href="legal/terminos_y_condiciones.html">Términos y condiciones</a>
                <a href="legal/politica_privacidad.html">Política de privacidad</a>
                <a href="legal/tratamiento_datos.html">Tratamiento de datos</a>
            </div>
        </div>
    </footer>`;
}

function renderCart() {
    if(state.cart.length === 0) return `
        <div class="max-w-7xl mx-auto px-4 py-24 text-center min-h-[60vh] flex flex-col justify-center">
            <div class="w-24 h-24 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800">
                <i class="fas fa-shopping-bag text-4xl text-gray-600"></i>
            </div>
            <h2 class="text-2xl font-black text-white mb-4 uppercase tracking-wide">Tu carrito está vacío</h2>
            <p class="text-gray-500 mb-8 text-sm">Parece que aún no has agregado nada.</p>
            <button onclick="navigateTo('shop')" class="bg-white text-black px-8 py-3 font-bold text-sm uppercase tracking-wider hover:bg-gray-200 transition-colors mx-auto w-max">Descubrir Colección</button>
        </div>
        ${renderFooter()}`;

    let subtotal = state.cart.reduce((sum, item) => sum + ((item.product.salePrice || item.product.price) * item.quantity), 0);
    let html = state.cart.map((item, idx) => `
        <div class="flex items-center bg-[#0a0a0a] p-4 border border-gray-800 mb-4 relative">
            <button onclick="removeFromCart(${idx})" class="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"><i class="fas fa-times"></i></button>
            <div class="w-20 h-24 bg-[#e5e5e5] p-2 flex items-center justify-center mr-4">
                <img src="${escapeHTML(item.product.image)}" class="w-full h-full object-cover mix-blend-multiply">
            </div>
            <div class="flex-grow pr-4">
                <h3 class="font-bold text-white text-sm uppercase">${escapeHTML(item.product.name)}</h3>
                <p class="text-xs text-gray-400 mt-1 uppercase tracking-wider">Talla: <span class="text-white">${item.size}</span> | Color: <span class="text-white">${item.color}</span></p>
                <span class="text-white font-bold block mt-2 text-sm">${formatMoney(item.product.salePrice || item.product.price)}</span>
            </div>
            <div class="flex items-center border border-gray-700 mr-8 bg-black">
                <button onclick="updateCartQuantity(${idx}, -1)" class="px-3 py-1 text-gray-400 hover:text-white transition-colors">-</button>
                <span class="px-3 font-bold text-white py-1 border-x border-gray-700 text-sm">${item.quantity}</span>
                <button onclick="updateCartQuantity(${idx}, 1)" class="px-3 py-1 text-gray-400 hover:text-white transition-colors">+</button>
            </div>
        </div>
    `).join('');

    return `
    <div class="max-w-5xl mx-auto px-4 py-12 min-h-[60vh]">
        <h1 class="text-2xl font-black mb-8 text-white uppercase tracking-wide">Tu Carrito</h1>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2">${html}</div>
            <div class="bg-[#0a0a0a] p-6 border border-gray-800 h-fit sticky top-24">
                <h2 class="text-lg font-bold mb-4 border-b border-gray-800 pb-4 text-white uppercase tracking-wider">Resumen</h2>
                <div class="flex justify-between text-gray-400 mb-2 text-sm">
                    <span>Subtotal</span>
                    <span>${formatMoney(subtotal)}</span>
                </div>
                <div class="flex justify-between text-gray-400 mb-4 text-sm">
                    <span>Envío</span>
                    <span class="text-white font-bold uppercase">Gratis</span>
                </div>
                <div class="flex justify-between font-black text-lg mb-6 pt-4 border-t border-gray-800 text-white">
                    <span>TOTAL</span>
                    <span>${formatMoney(subtotal)}</span>
                </div>
                <button onclick="navigateTo('checkout')" class="w-full bg-white text-black py-4 font-bold text-sm uppercase tracking-wider hover:bg-gray-200 transition-colors">Finalizar Compra</button>
            </div>
        </div>
    </div>
    ${renderFooter()}`;
}

function renderCheckout() {
    return `
    <div class="max-w-2xl mx-auto px-4 py-12 min-h-[60vh]">
        <div class="bg-[#0a0a0a] p-8 border border-gray-800">
            <h1 class="text-2xl font-black mb-2 text-white uppercase tracking-wide">Datos de Envío</h1>
            <p class="text-gray-500 mb-8 text-sm">Completa la información para entregar tu pedido.</p>
            <form onsubmit="placeOrder(event)" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Nombre Completo</label>
                    <input id="c_name" required type="text" class="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none transition-colors text-sm">
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Correo</label>
                        <input id="c_email" required type="email" class="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none transition-colors text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Teléfono</label>
                        <input id="c_phone" required type="tel" class="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none transition-colors text-sm">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Dirección Completa</label>
                    <input id="c_address" required type="text" class="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none transition-colors text-sm">
                </div>
                <button type="submit" class="w-full bg-white text-black py-4 font-bold text-sm uppercase tracking-wider mt-8 hover:bg-gray-200 transition-colors">Confirmar y Pagar</button>
            </form>
            <button onclick="navigateTo('cart')" class="w-full text-center mt-6 text-gray-500 hover:text-white font-bold text-xs uppercase tracking-wider"><i class="fas fa-arrow-left mr-2"></i> Regresar</button>
        </div>
    </div>
    ${renderFooter()}`;
}

function renderOrderSuccess() {
    const order = window.lastOrder;
    // Si alguien entra a esta vista por error sin tener un pedido, lo regresamos a la tienda
    if(!order) {
        setTimeout(() => navigateTo('shop'), 100);
        return ''; 
    }

    return `
    <div class="max-w-3xl mx-auto px-4 py-16 min-h-[60vh] flex flex-col items-center">
        <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6">
            <i class="fas fa-check text-black text-4xl"></i>
        </div>
        <h1 class="text-3xl font-black text-white mb-2 uppercase tracking-wide text-center">¡Pedido Registrado!</h1>
        <p class="text-gray-400 mb-8 text-center text-sm">Tu número de orden es <span class="text-white font-bold">${order.id}</span></p>

        <div class="w-full bg-[#0a0a0a] border border-gray-800 p-8 mb-8">
            <h2 class="text-xl font-black text-white uppercase tracking-wider mb-6 text-center border-b border-gray-800 pb-4">
                Total a pagar: ${formatMoney(order.total)}
            </h2>

            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Métodos de Pago Disponibles</h3>
            <div class="space-y-4">
                
                <div class="bg-[#1a1a1a] p-4 border border-gray-800 flex items-start space-x-4">
                    <i class="fas fa-university text-2xl text-white mt-1"></i>
                    <div>
                        <h4 class="text-white font-bold text-sm uppercase tracking-wider">Cuenta Bancolombia</h4>
                        <p class="text-xs text-gray-400 mt-2 leading-relaxed">
                            Ahorros: <span class="text-white">123-456789-00</span><br>
                            Titular: <span class="text-white">FutWear S.A.S.</span>
                        </p>
                    </div>
                </div>

                <div class="bg-[#1a1a1a] p-4 border border-gray-800 flex items-start space-x-4">
                    <i class="fas fa-mobile-alt text-2xl text-white mt-1"></i>
                    <div>
                        <h4 class="text-white font-bold text-sm uppercase tracking-wider">Transferencia Nequi</h4>
                        <p class="text-xs text-gray-400 mt-2">Envía tu pago a nuestro número oficial:</p>
                        <span class="text-white font-black text-lg tracking-widest mt-1 block">300 123 4567</span>
                    </div>
                </div>

                <div class="bg-[#1a1a1a] p-4 border border-gray-800 flex items-start space-x-4">
                    <i class="fas fa-qrcode text-2xl text-white mt-1"></i>
                    <div>
                        <h4 class="text-white font-bold text-sm uppercase tracking-wider">Pago con Código QR</h4>
                        <p class="text-xs text-gray-400 mt-2 leading-relaxed">
                            Solicita nuestra imagen de código QR oficial de Bancolombia/Nequi a través de WhatsApp para realizar tu pago en segundos de forma segura.
                        </p>
                    </div>
                </div>

            </div>

            <div class="mt-8 bg-[#111111] p-4 border-l-4 border-white text-xs text-gray-400 leading-relaxed">
                <p>Una vez realizado el pago, envía tu comprobante por WhatsApp al <strong>+57 300 123 4567</strong> indicando tu número de orden (<strong>${order.id}</strong>) para confirmar tu compra y procesar el envío.</p>
            </div>
        </div>

        <button onclick="navigateTo('shop')" class="border border-white text-white px-8 py-3 font-bold text-sm uppercase tracking-wider hover:bg-white hover:text-black transition-colors w-max">
            Volver a la Tienda
        </button>
    </div>
    ${renderFooter()}`;
}

// --- INICIAR APP ---
document.addEventListener("DOMContentLoaded", () => {
    // Intentamos recuperar el carrito guardado
    const savedCart = localStorage.getItem('futwear_cart');
    if (savedCart) {
        state.cart = JSON.parse(savedCart);
    }
    
    loadProductsFromFirebase();
    loadBannersFromFirebase(); 
    render();

    // Registramos la vista inicial en el historial (para que pueda volver a ella)
    window.history.replaceState({ view: 'shop', dataId: null }, '', '#shop');
});

// Escuchamos cuando el usuario presiona el botón de "Atrás" o "Adelante" del navegador
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.view) {
        // Navegamos a la vista guardada, pero le decimos (false) que no vuelva a crear historial
        navigateTo(event.state.view, event.state.dataId, false);
    } else {
        // Si por alguna razón se queda sin historial, lo mandamos al inicio de forma segura
        navigateTo('shop', null, false);
    }
});

// --- EXPORTAR AL WINDOW ---
window.navigateTo = navigateTo;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.placeOrder = placeOrder;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.toggleProductForm = toggleProductForm;
window.saveNewProduct = saveNewProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.render = render;
window.handleSearch = handleSearch;
window.selectVariant = selectVariant;
window.showToast = showToast;
window.toggleAdminMenu = toggleAdminMenu;
window.openEditProduct = openEditProduct;
window.saveEditProduct = saveEditProduct;
window.selectCategoryFilter = selectCategoryFilter;
window.loadMoreProducts = loadMoreProducts;
window.toggleBannerForm = toggleBannerForm;
window.saveNewBanner = saveNewBanner;
window.openEditBanner = openEditBanner;
window.saveEditBanner = saveEditBanner;
window.deleteBanner = deleteBanner;
window.goHome = goHome;