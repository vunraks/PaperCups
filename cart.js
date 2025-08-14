// cart.js — логика корзины EcoCups

function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}
function setCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}
function addToCart(id, name, price) {
    let cart = getCart();
    const idx = cart.findIndex(item => item.id === id);
    if (idx !== -1) {
        cart[idx].quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    setCart(cart);
    updateCartCount();
}
function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    setCart(cart);
    updateCartCount();
    updateCartDisplay();
}
function updateQuantity(id, change) {
    let cart = getCart();
    const idx = cart.findIndex(item => item.id === id);
    if (idx !== -1) {
        cart[idx].quantity += change;
        if (cart[idx].quantity < 1) cart[idx].quantity = 1;
        setCart(cart);
        updateCartCount();
        updateCartDisplay();
    }
}
function setQuantity(id, quantity, isLiveUpdate = false) {
    let cart = getCart();
    const idx = cart.findIndex(item => item.id === id);
    if (idx !== -1) {
        cart[idx].quantity = quantity > 0 ? quantity : 1;
        setCart(cart);
        updateCartCount();
        updateCartDisplay();
        if (isLiveUpdate) updateTotalPrice();
    }
}
function clearCart() {
    setCart([]);
    updateCartCount();
    updateCartDisplay();
}
function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll('#cart-count').forEach(el => {
        el.textContent = count;
    });
}
function updateCartDisplay() {
    const cart = getCart();
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCartRow = document.querySelector('.empty-cart');
    const checkoutBtn = document.getElementById('checkout-btn');
    const totalItemsEl = document.getElementById('total-items');
    const totalPriceEl = document.getElementById('total-price');
    if (!cartItemsContainer) return;
    if (cart.length === 0) {
        if (emptyCartRow) emptyCartRow.style.display = '';
        if (checkoutBtn) checkoutBtn.disabled = true;
        if (totalItemsEl) totalItemsEl.textContent = '0';
        if (totalPriceEl) totalPriceEl.textContent = '0 руб.';
        cartItemsContainer.innerHTML = '<tr class="empty-cart"><td colspan="5">Ваша корзина пуста</td></tr>';
        return;
    }
    if (emptyCartRow) emptyCartRow.style.display = 'none';
    if (checkoutBtn) checkoutBtn.disabled = false;
    cartItemsContainer.innerHTML = '';
    let totalItems = 0;
    let totalPrice = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalItems += item.quantity;
        totalPrice += itemTotal;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.price} руб.</td>
            <td>
                <div class="quantity-control">
                    <button class="decrease-qty" data-id="${item.id}">-</button>
                    <input type="number" value="${item.quantity}" min="1" class="item-qty" data-id="${item.id}">
                    <button class="increase-qty" data-id="${item.id}">+</button>
                </div>
            </td>
            <td class="item-total">${itemTotal} руб.</td>
            <td><span class="remove-item" data-id="${item.id}">×</span></td>
        `;
        cartItemsContainer.appendChild(row);
    });
    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    totalRow.innerHTML = `
        <td colspan="3" class="text-right"><strong>Итого:</strong></td>
        <td colspan="2"><strong>${totalPrice} руб.</strong></td>
    `;
    cartItemsContainer.appendChild(totalRow);
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (totalPriceEl) totalPriceEl.textContent = `${totalPrice} руб.`;
    addCartEventListeners();
}
function updateTotalPrice() {
    const cart = getCart();
    const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const totalPriceEl = document.getElementById('total-price');
    if (totalPriceEl) totalPriceEl.textContent = `${totalPrice} руб.`;
    document.querySelectorAll('.total-row td:last-child strong').forEach(el => {
        el.textContent = `${totalPrice} руб.`;
    });
}
function addCartEventListeners() {
    document.querySelectorAll('.decrease-qty').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            updateQuantity(id, -1);
        });
    });
    document.querySelectorAll('.increase-qty').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            updateQuantity(id, 1);
        });
    });
    document.querySelectorAll('.item-qty').forEach(input => {
        input.addEventListener('change', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const newQty = parseInt(this.value);
            if (newQty > 0) {
                setQuantity(id, newQty);
            } else {
                this.value = 1;
            }
        });
        input.addEventListener('input', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const newQty = parseInt(this.value);
            if (newQty > 0) {
                setQuantity(id, newQty, true);
            }
        });
    });
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            removeFromCart(id);
        });
    });
}
// Для инициализации на страницах:
function cartInit() {
    updateCartCount();
    if (window.location.pathname.includes('cart.html')) {
        updateCartDisplay();
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function() {
                alert('Заказ оформлен! Спасибо за покупку.');
                clearCart();
                window.location.href = 'index.html';
            });
        }
    }
}
