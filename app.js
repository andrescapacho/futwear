// --- IMPORTACIONES DE FIREBASE ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA2waUUjLLsqRLP9FzrfDVOEAwVI2gQZQ0",
  authDomain: "bgafutwear.firebaseapp.com",
  projectId: "bgafutwear",
  storageBucket: "bgafutwear.firebasestorage.app",
  messagingSenderId: "49919867573",
  appId: "1:49919867573:web:11a461045b4f966acb1cfc"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const auth = getAuth(app);

// Observador en tiempo real: Firebase nos dice automáticamente si hay un admin logueado
onAuthStateChanged(auth, (user) => {
    if (user) {
        isAdminAuth = true;
    } else {
        isAdminAuth = false;
    }
    render(); // Refresca la interfaz dependiendo del estado
});

// --- ESTADO Y DATOS ---
let products = [];
let orders = [];
let cart = [];
const categories = ['Todas', 'Playeras', 'Shorts', 'Pants', 'Accesorios', 'Sudaderas'];
let selectedVariant = { size: null, color: null };
let isHomeView = true; // Controla si mostramos los banners o el catálogo completo

let currentView = 'shop';
let isAdminAuth = false;
let selectedProduct = null;
let searchTerm = '';
let selectedCategory = 'Todas';
let showProductForm = false;
let showAdminMenu = false; // Controla si el menú hamburguesa está abierto
let visibleProductsCount = 10; // Cuántos productos cargar inicialmente en el catálogo
let savedScrollPosition = 0; // Guardará la altura de la pantalla
let editingProductId = null; // Guardará el ID del producto que se está editando

// --- UTILIDADES ---
// Actualizado a formato MXN para igualar tu imagen
const formatMoney = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
const generateId = (prefix) => {
    // crypto.randomUUID() genera algo como "36b8f84d-df4e-4d49-..."
    // Tomamos el primer bloque (8 caracteres) y lo pasamos a mayúsculas
    // para crear un número de orden seguro y profesional.
    return prefix + '-' + crypto.randomUUID().split('-')[0].toUpperCase();
};

const saveCart = () => {
    localStorage.setItem('futwear_cart', JSON.stringify(cart));
};

const escapeHTML = (str) => {
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

const getColorBgClass = (colorName) => {
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
    showAdminMenu = !showAdminMenu;
    render();
}

function selectCategoryFilter(cat) {
    selectedCategory = cat;
    searchTerm = '';
    visibleProductsCount = 10;
    isHomeView = false; // Al tocar cualquier filtro o "Ver todo", salimos del Home
    currentView = 'shop'; // Aseguramos estar en la vista de tienda
    render();
    window.scrollTo({ top: document.getElementById('catalogo').offsetTop - 80, behavior: 'smooth' });
}

function loadMoreProducts() {
    visibleProductsCount += 10;
    render();
}

function navigateTo(view, dataId = null) {
    // 1. Guardamos el scroll exacto si salimos de la tienda para ver un producto
    if (currentView === 'shop' && view === 'product_detail') {
        savedScrollPosition = window.scrollY;
    }

    // 2. Solo reiniciamos a 10 productos si NO estamos regresando de un detalle de producto
    if (view === 'shop' && currentView !== 'product_detail') {
        visibleProductsCount = 10; 
        isHomeView = true; // Por defecto al navegar a la tienda, mostramos el Home
    }
    
    const previousView = currentView; // Recordamos de dónde venimos
    currentView = view;
    showAdminMenu = false;
    
    if (dataId) {
        selectedProduct = products.find(p => p.id === dataId);
        selectedVariant = { size: null, color: null }; 
    }
    
    if (isAdminAuth && view.startsWith('admin_')) {
        loadOrdersFromFirebase();
        loadProductsFromFirebase();
    }
    
    render();

    // 3. Restauramos la posición de lectura o vamos hacia arriba
    if (view === 'shop' && previousView === 'product_detail') {
        // Si regresamos del producto, esperamos un microsegundo a que pinte el HTML y bajamos
        setTimeout(() => window.scrollTo(0, savedScrollPosition), 10);
    } else {
        // En cualquier otra navegación normal (carrito, categorías, etc.), vamos al tope
        window.scrollTo(0, 0);
    }
}

function selectVariant(type, value) {
    // 1. Guardamos el estado
    selectedVariant[type] = value;
    
    // 2. Manipulamos el DOM según el tipo seleccionado
    if (type === 'size') {
        // Actualizamos los botones de talla
        const buttons = document.querySelectorAll('.variant-btn-size');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-size') === value) {
                // Clases para el botón SELECCIONADO
                btn.className = "variant-btn-size w-10 h-10 border border-gray-600 flex items-center justify-center text-xs font-bold transition-all bg-white text-black";
            } else {
                // Clases para el botón INACTIVO
                btn.className = "variant-btn-size w-10 h-10 border border-gray-600 flex items-center justify-center text-xs font-bold transition-all text-gray-400 hover:bg-[#1a1a1a] hover:text-white";
            }
        });
        
        // Actualizamos el texto indicativo
        const label = document.getElementById('label-size');
        if(label) label.innerHTML = `Talla : <span class="text-white">${value}</span>`;
        
    } else if (type === 'color') {
        // Actualizamos los botones de color
        const buttons = document.querySelectorAll('.variant-btn-color');
        buttons.forEach(btn => {
            const bgClass = btn.getAttribute('data-bg'); // Recuperamos el color de fondo
            const baseClasses = `variant-btn-color w-8 h-8 rounded-full ${bgClass} border-2 border-gray-600 transition-all`;
            
            if (btn.getAttribute('data-color') === value) {
                // Clases para el color SELECCIONADO
                btn.className = `${baseClasses} ring-2 ring-offset-2 ring-offset-[#0a0a0a] ring-white`;
            } else {
                // Clases para el color INACTIVO
                btn.className = `${baseClasses} hover:scale-110`;
            }
        });
        
        // Actualizamos el texto indicativo
        const label = document.getElementById('label-color');
        if(label) label.innerHTML = `Color : <span class="text-white">${value}</span>`;
    }
}

async function loadProductsFromFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        products = querySnapshot.docs.map(doc => {
            return { id: doc.id, ...doc.data() };
        });
        render();
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

async function loadOrdersFromFirebase() {
    try {
        // Creamos una consulta ordenada por el campo "date" de forma descendente (desc)
        const q = query(collection(db, "orders"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        
        orders = querySnapshot.docs.map(doc => {
            return { firebaseId: doc.id, ...doc.data() };
        });
        render();
    } catch (error) {
        console.error("Error cargando pedidos:", error);
    }
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // 1. Validaciones obligatorias
    if (!selectedVariant.size) {
        showToast('Por favor, selecciona una talla antes de agregar al carrito.', 'error');
        return;
    }
    if (!selectedVariant.color) {
        showToast('Por favor, selecciona un color antes de agregar al carrito.', 'error');
        return;
    }

    // 2. Buscamos si EXACTAMENTE el mismo producto (con la misma talla y color) ya está en el carrito
    const existingItemIndex = cart.findIndex(item => 
        item.product.id === product.id && 
        item.size === selectedVariant.size && 
        item.color === selectedVariant.color
    );

    if (existingItemIndex !== -1) {
        // Si ya existe, aumentamos la cantidad validando el stock
        if (cart[existingItemIndex].quantity < product.stock) {
            cart[existingItemIndex].quantity += 1;
            saveCart();
            showToast('Cantidad actualizada en el carrito', 'success');
            render(); // Actualizamos la vista (burbuja del navbar)
        } else {
            showToast('Límite de stock alcanzado para este producto.', 'error');
        }
    } else {
        // Si no existe, lo agregamos como un item nuevo
        if (product.stock > 0) {
            cart.push({
                product: product,
                size: selectedVariant.size,
                color: selectedVariant.color,
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
    cart.splice(index, 1);
    saveCart();
    render();
}

function updateCartQuantity(index, delta) {
    const item = cart[index];
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

    const total = cart.reduce((sum, item) => sum + ((item.product.salePrice || item.product.price) * item.quantity), 0);
    const customer = {
        name: document.getElementById('c_name').value,
        email: document.getElementById('c_email').value,
        phone: document.getElementById('c_phone').value,
        address: document.getElementById('c_address').value
    };
    
    const items = cart.map(item => ({
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
        await addDoc(collection(db, "orders"), newOrder);
        window.lastOrder = newOrder;
        cart = []; // Vacías el carrito local
        saveCart(); // <--- AGREGA ESTA LÍNEA PARA BORRARLO DEL NAVEGADOR
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
    showProductForm = !showProductForm;
    if (!showProductForm) editingProductId = null; // Si se cierra, limpia el producto en edición
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
        showProductForm = false;
        await loadProductsFromFirebase();
    } catch (error) {
        console.error("Error guardando el producto: ", error);
        showToast('Hubo un error al guardar el producto.', 'error');
    } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
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
    editingProductId = productId;
    showProductForm = true; // Abre el formulario
    render();
}

async function saveEditProduct(event) {
    event.preventDefault();
    if (!editingProductId) return;

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
        await updateDoc(doc(db, "products", editingProductId), updatedProduct);
        showProductForm = false;
        editingProductId = null;
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
        const orderIndex = orders.findIndex(o => o.firebaseId === orderFirebaseId);
        if (orderIndex !== -1) {
            orders[orderIndex].status = newStatus;
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

    if (isAdminAuth && currentView.startsWith('admin_')) {
        html += renderAdminNav();
    } else if (currentView !== 'admin_login') {
        html += renderNavbar();
    }

    html += `<main class="${isAdminAuth && currentView.startsWith('admin_') ? 'lg:ml-64' : ''} transition-all duration-300">`;
    
    switch (currentView) {
        case 'shop': html += renderShop(); break;
        case 'product_detail': html += renderProductDetail(); break;
        case 'cart': html += renderCart(); break;
        case 'checkout': html += renderCheckout(); break;
        case 'order_success': html += renderOrderSuccess(); break; // <-- NUEVA LÍNEA AGREGADA
        case 'admin_login': html += renderAdminLogin(); break;
        case 'admin_dashboard': html += renderAdminDashboard(); break;
        case 'admin_products': html += renderAdminProducts(); break;
        case 'admin_orders': html += renderAdminOrders(); break;
    }
    
    html += `</main>`;
    app.innerHTML = html;
}

// --- Vistas Cliente ---
function renderNavbar() {
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
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
                
                <div class="flex items-center cursor-pointer" onclick="selectedCategory='Todas'; searchTerm=''; navigateTo('shop')">
                    <img src="./logo.png" alt="FutWear Logo" class="h-8 md:h-8 object-contain">
                </div>
                
                <nav class="hidden lg:flex space-x-8 text-sm font-bold tracking-wide">
                    <button onclick="selectedCategory='Todas'; searchTerm=''; navigateTo('shop')" class="hover:text-gray-400 transition-colors">HOMBRE</button>
                    <button onclick="showToast('Colección de mujer próximamente', 'success')" class="hover:text-gray-400 transition-colors">MUJER</button>
                    <button onclick="selectedCategory='Accesorios'; searchTerm=''; navigateTo('shop')" class="hover:text-gray-400 transition-colors">ACCESORIOS</button>
                    <button onclick="showToast('Zona de ofertas en construcción', 'success')" class="hover:text-gray-400 transition-colors">OFERTAS</button>
                    <button onclick="showToast('Nuevos lanzamientos muy pronto', 'success')" class="hover:text-gray-400 transition-colors">NUEVOS</button>
                </nav>

                <div class="flex items-center space-x-4">
                    <div class="hidden md:block relative">
                        <input type="text" placeholder="Buscar productos..." value="${escapeHTML(searchTerm)}" oninput="if(currentView==='shop'){handleSearch(event)}else{searchTerm=this.value; navigateTo('shop');}" class="w-48 lg:w-64 pl-10 pr-4 py-2 bg-[#1a1a1a] border border-gray-800 text-white rounded-lg focus:border-white outline-none text-sm transition-colors"/>
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
                    <input type="text" placeholder="Buscar productos..." value="${escapeHTML(searchTerm)}" oninput="if(currentView==='shop'){handleSearch(event)}else{searchTerm=this.value; navigateTo('shop');}" class="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-gray-800 text-white rounded-lg focus:border-white outline-none text-sm transition-colors"/>
                    <i class="fas fa-search absolute left-4 top-3 text-gray-500"></i>
                </div>
            </div>
            
        </div>
    </header>`;
}

function renderProductGrid() {
    let filtered = products.filter(p => 
        (selectedCategory === 'Todas' || p.category === selectedCategory) &&
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isHomePage = isHomeView;
    const displayProducts = isHomePage ? filtered.slice(0, 5) : filtered.slice(0, visibleProductsCount);

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

function handleSearch(event) {
    searchTerm = event.target.value;
    visibleProductsCount = 10; 
    isHomeView = false; // Si el usuario busca algo, ocultamos los banners del Home 
    
    const gridContainer = document.getElementById('product-grid-container');
    const headerTitle = document.getElementById('shop-header-title');
    
    if (gridContainer) {
        gridContainer.innerHTML = renderProductGrid();
    }
    if (headerTitle) {
        headerTitle.innerText = searchTerm ? 'Resultados de búsqueda' : (selectedCategory === 'Todas' ? 'Productos Destacados' : selectedCategory);
    }
}

function renderShop() {
    const isHomePage = isHomeView;

    let categoriesHtml = categories.map(cat => `
        <button onclick="selectCategoryFilter('${cat}')" class="px-5 py-1.5 rounded-full whitespace-nowrap text-xs font-bold tracking-wider uppercase transition-colors ${selectedCategory === cat ? 'bg-gray-800 text-white border border-gray-600' : 'bg-transparent text-gray-400 hover:text-white'}">${cat}</button>
    `).join('');

    let heroHtml = `
    <div class="relative bg-black h-[500px] md:h-[650px] flex items-center overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://brand.assets.adidas.com/image/upload/f_auto,q_auto:best,fl_lossy/if_w_gt_1920,w_1920/6366423_CAM_LAM_DAT_ONSITE_YGT_WORLD_CUP_26_JERSEYS_FW_25_LAM_CO_DELIV_1_STATEMENT_BANNER_D_2880x1240_1535533cbd.jpg')] bg-cover bg-center bg-no-repeat opacity-60"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
        
        <div class="relative max-w-7xl mx-auto px-4 w-full">
            <h1 class="text-5xl md:text-7xl font-black mb-2 tracking-tighter text-white">VISTE TU<span class="text-gray-500"></span><br>PASIÓN<span class="text-gray-500"></span></h1>
            <p class="text-lg md:text-xl text-gray-300 max-w-md mb-8 mt-4 font-medium">Demuestra tu pasión dentro y fuera de la cancha. Viste los colores que te hacen vibrar.</p>
            <button onclick="document.getElementById('catalogo').scrollIntoView({behavior: 'smooth'})" class="bg-white text-black font-bold py-3 px-8 text-sm tracking-wider uppercase hover:bg-gray-200 transition-colors flex items-center">
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

    let promoBannersHtml = `
    <div class="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="relative h-[400px] bg-gray-900 overflow-hidden group flex items-end p-8 border border-gray-800">
            <div class="absolute inset-0 bg-[url('https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/3a5b2651f42746efa22ee859a0cf0dba_9366/Camiseta_Visitante_Seleccion_Colombia_1990_Amarillo_JN3713_HM53.jpg')] bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity"></div>
            <div class="relative w-full">
                <h3 class="text-3xl font-black text-white mb-2 uppercase tracking-wide">Nueva Colección<br>Mundialista</h3>
                <p class="text-gray-400 mb-6 max-w-xs">Perfecta para apoyar a tu equipo favorito</p>
                <button class="border border-white text-white px-6 py-2 text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors">
                    Descubrir Más <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
        <div class="relative h-[400px] bg-[#0a0a0a] p-8 border border-gray-800 flex flex-col justify-center">
            <p class="text-red-600 font-bold tracking-widest uppercase mb-4">Ofertas Especiales</p>
            <h3 class="text-3xl font-black text-white mb-2 uppercase tracking-wide">Camiseta Visitante Selección<br>Colombia 1990</h3>
            <p class="text-gray-400 mb-4">Playera</p>
            <div class="bg-red-600 text-white text-xs font-bold px-3 py-1 inline-block mb-4 w-max">-20%</div>
            <div class="flex items-end mb-8">
                <span class="text-2xl font-bold text-white mr-3">$300.000 COP</span>
                <span class="text-sm text-gray-500 line-through pb-1">$379.000 COP</span>
            </div>
            <button class="border border-gray-600 text-white px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors w-max">
                Aprovechar Ahora
            </button>
        </div>
    </div>`;

    let totalFiltered = products.filter(p => 
        (selectedCategory === 'Todas' || p.category === selectedCategory) &&
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).length;

    let loadMoreBtn = (!isHomePage && visibleProductsCount < totalFiltered) ? `
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
                    ${isHomePage ? 'Productos Destacados' : (searchTerm ? 'Resultados de búsqueda' : selectedCategory)}
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

function renderFooter() {
    return `
    
    <footer class="bg-[#050505] pt-16 pb-8 border-t border-black text-sm">
        <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
            <div class="md:col-span-2">
                <div class="flex items-center mb-6">
                    <img src="./logo.png" alt="FutWear Logo" class="h-10 md:h-8 object-contain">
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
                <a href="terminos_y_condiciones.html" class="hover:text-gray-400">Términos y condiciones</a>
                <a href="#" class="hover:text-gray-400">Aviso de privacidad</a>
                <a href="#" class="hover:text-gray-400">Mapa del sitio</a>
            </div>
        </div>
    </footer>`;
}

function renderProductDetail() {
    const p = selectedProduct;
    if(!p) return '';
    const priceHtml = p.salePrice 
        ? `<span class="text-3xl font-bold text-white">${formatMoney(p.salePrice)}</span> <span class="text-xl text-gray-500 line-through ml-2">${formatMoney(p.price)}</span>` 
        : `<span class="text-3xl font-bold text-white">${formatMoney(p.price)}</span>`;

    // Leemos las opciones desde Firebase; si el producto no las tiene, usamos un fallback por defecto
    const sizes = p.sizes && p.sizes.length > 0 ? p.sizes : ['S', 'M', 'L', 'XL'];
    
    // Para los colores, verificamos si vienen de Firebase.
    const colors = p.colors && p.colors.length > 0 ? p.colors : [
        {name: 'Negro', bg: 'bg-black'}, 
        {name: 'Gris', bg: 'bg-gray-400'}, 
        {name: 'Blanco', bg: 'bg-white'}
    ];

    // Construimos el HTML de las TALLAS con clases y atributos data-*
    const sizesHtml = sizes.map(s => `
        <button onclick="selectVariant('size', '${s}')" data-size="${s}" class="variant-btn-size w-10 h-10 border border-gray-600 flex items-center justify-center text-xs font-bold transition-all ${selectedVariant.size === s ? 'bg-white text-black' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'}">
            ${s}
        </button>
    `).join('');

    // Construimos el HTML de los COLORES con clases y atributos data-*
    const colorsHtml = colors.map(c => {
        const colorName = typeof c === 'string' ? c : c.name;
        const colorBg = typeof c === 'string' ? getColorBgClass(colorName) : c.bg; 
        
        return `<button onclick="selectVariant('color', '${colorName}')" data-color="${colorName}" data-bg="${colorBg}" class="variant-btn-color w-8 h-8 rounded-full ${colorBg} border-2 border-gray-600 ${selectedVariant.color === colorName ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0a] ring-white' : 'hover:scale-110'} transition-all" title="${colorName}"></button>`;
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
                    <h3 id="label-color" class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Color ${selectedVariant.color ? `: <span class="text-white">${selectedVariant.color}</span>` : ''}</h3>
                    <div class="flex space-x-4">
                        ${colorsHtml}
                    </div>
                </div>

                <div class="mb-8">
                    <h3 id="label-size" class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Talla ${selectedVariant.size ? `: <span class="text-white">${selectedVariant.size}</span>` : ''}</h3>
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

function renderCart() {
    if(cart.length === 0) return `
        <div class="max-w-7xl mx-auto px-4 py-24 text-center min-h-[60vh] flex flex-col justify-center">
            <div class="w-24 h-24 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800">
                <i class="fas fa-shopping-bag text-4xl text-gray-600"></i>
            </div>
            <h2 class="text-2xl font-black text-white mb-4 uppercase tracking-wide">Tu carrito está vacío</h2>
            <p class="text-gray-500 mb-8 text-sm">Parece que aún no has agregado nada.</p>
            <button onclick="navigateTo('shop')" class="bg-white text-black px-8 py-3 font-bold text-sm uppercase tracking-wider hover:bg-gray-200 transition-colors mx-auto w-max">Descubrir Colección</button>
        </div>
        ${renderFooter()}`;

    let subtotal = cart.reduce((sum, item) => sum + ((item.product.salePrice || item.product.price) * item.quantity), 0);
    let html = cart.map((item, idx) => `
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

function renderAdminLogin() {
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

// --- Vistas Admin ---
function renderAdminNav() {
    return `
    <div class="fixed w-64 bg-[#0a0a0a] border-r border-gray-800 text-white h-full z-40 hidden lg:block">
        <div class="p-6 text-xl font-black tracking-widest border-b border-gray-800 flex items-center"><i class="fas fa-bolt mr-2"></i> ADMIN</div>
        <nav class="p-4 space-y-2 mt-4">
            <button onclick="navigateTo('admin_dashboard')" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase ${currentView === 'admin_dashboard' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}"><i class="fas fa-chart-bar mr-3 w-5"></i> Dashboard</button>
            <button onclick="navigateTo('admin_products')" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase ${currentView === 'admin_products' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}"><i class="fas fa-box mr-3 w-5"></i> Productos</button>
            <button onclick="navigateTo('admin_orders')" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase ${currentView === 'admin_orders' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}"><i class="fas fa-clipboard-list mr-3 w-5"></i> Pedidos</button>
            <div class="pt-8 border-t border-gray-800 mt-8">
                <button onclick="logoutAdmin()" class="w-full text-left px-4 py-3 text-sm font-bold tracking-wider uppercase text-red-500 hover:bg-[#1a1a1a]"><i class="fas fa-sign-out-alt mr-3 w-5"></i> Salir</button>
            </div>
        </nav>
    </div>

    <div class="lg:hidden bg-[#0a0a0a] text-white p-4 flex justify-between items-center fixed top-0 w-full z-50 border-b border-gray-800">
        <b class="text-lg font-black tracking-widest"><i class="fas fa-bolt mr-2"></i> ADMIN</b>
        <button onclick="toggleAdminMenu()" class="text-white p-2 focus:outline-none">
            <i class="fas ${showAdminMenu ? 'fa-times' : 'fa-bars'} text-xl"></i>
        </button>
    </div>

    ${showAdminMenu ? `
    <div class="lg:hidden fixed inset-0 bg-black/95 backdrop-blur-md z-40 flex flex-col pt-20">
        <nav class="p-4 space-y-4 mt-4 flex-grow">
            <button onclick="navigateTo('admin_dashboard')" class="w-full text-left px-6 py-4 text-sm font-bold tracking-wider uppercase ${currentView === 'admin_dashboard' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'} border border-gray-800"><i class="fas fa-chart-bar mr-4 w-5"></i> Dashboard</button>
            <button onclick="navigateTo('admin_products')" class="w-full text-left px-6 py-4 text-sm font-bold tracking-wider uppercase ${currentView === 'admin_products' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'} border border-gray-800"><i class="fas fa-box mr-4 w-5"></i> Productos</button>
            <button onclick="navigateTo('admin_orders')" class="w-full text-left px-6 py-4 text-sm font-bold tracking-wider uppercase ${currentView === 'admin_orders' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'} border border-gray-800"><i class="fas fa-clipboard-list mr-4 w-5"></i> Pedidos</button>
            
            <div class="pt-8 mt-8 border-t border-gray-800">
                <button onclick="logoutAdmin()" class="w-full text-left px-6 py-4 text-sm font-bold tracking-wider uppercase text-red-500 hover:text-red-400"><i class="fas fa-sign-out-alt mr-4 w-5"></i> Cerrar Sesión</button>
            </div>
        </nav>
    </div>` : ''}
    `;
}

function renderAdminDashboard() {
    const total = orders.reduce((s,o)=>s+o.total,0);
    const pending = orders.filter(o=>o.status==='Pendiente').length;
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
                <p class="text-3xl font-black text-white">${products.length}</p>
            </div>
        </div>
        <div class="bg-[#0a0a0a] border border-gray-800 p-6">
            <h2 class="font-black text-lg mb-4 uppercase tracking-wide">Últimos Pedidos</h2>
            <ul class="divide-y divide-gray-800">
                ${orders.slice(0,5).map(o => `
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

function renderAdminProducts() {
    let html = products.map((p, idx) => `
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
    if (showProductForm) {
        // Buscamos si hay un producto seleccionado para edición
        const ep = editingProductId ? products.find(p => p.id === editingProductId) : null;

        formHtml = `
        <div class="mb-8 bg-[#0a0a0a] p-8 border border-gray-800">
            <h2 class="text-lg font-black mb-6 text-white uppercase tracking-wide">${ep ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onsubmit="${ep ? 'saveEditProduct(event)' : 'saveNewProduct(event)'}" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Nombre</label><input id="${ep ? 'edit_p_name' : 'new_p_name'}" value="${ep ? escapeHTML(ep.name) : ''}" required type="text" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm"></div>
                <div><label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Marca</label><input id="${ep ? 'edit_p_brand' : 'new_p_brand'}" value="${ep ? escapeHTML(ep.brand) : ''}" required type="text" class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm"></div>
                <div>
                    <label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Categoría</label>
                    <select id="${ep ? 'edit_p_cat' : 'new_p_cat'}" required class="w-full p-3 bg-[#1a1a1a] border border-gray-800 text-white focus:border-white outline-none text-sm">
                        ${categories.filter(c => c !== 'Todas').map(c => `<option value="${c}" ${ep && ep.category === c ? 'selected' : ''}>${c}</option>`).join('')}
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
                ${showProductForm ? 'Cerrar Formulario' : '+ Agregar Producto'}
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

function renderAdminOrders() {
    let html = orders.map((o, idx) => `
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
        cart = JSON.parse(savedCart);
    }
    
    loadProductsFromFirebase();
    render();
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