const API_BASE_URL = "http://127.0.0.1:8000/api";

document.addEventListener('DOMContentLoaded', function() {
    async function addToCart(id, name, price) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            alert('Для добавления товаров в корзину необходимо войти в систему');
            window.location.href = 'login.html';
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/cart/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    product_id: id,
                    quantity: 1
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка добавления в корзину');
            }
            
            updateCartCount();
            
        } catch (error) {
            alert(`Ошибка добавления в корзину: ${error.message}`);
        }
    }
    
    async function updateCartCount() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            document.querySelectorAll('#cart-count').forEach(el => {
                el.textContent = '0';
            });
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/cart/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const cartItems = await response.json();
                const count = cartItems.reduce((total, item) => total + item.quantity, 0);
                document.querySelectorAll('#cart-count').forEach(el => {
                    el.textContent = count;
                });
            } else {
                document.querySelectorAll('#cart-count').forEach(el => {
                    el.textContent = '0';
                });
            }
        } catch (error) {
            document.querySelectorAll('#cart-count').forEach(el => {
                el.textContent = '0';
            });
        }
    }
    
    async function updateCartDisplay() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        const cartItemsContainer = document.getElementById('cart-items');
        const emptyCartRow = document.querySelector('.empty-cart');
        const checkoutBtn = document.getElementById('checkout-btn');
        const totalItemsEl = document.getElementById('total-items');
        const totalPriceEl = document.getElementById('total-price');
        
        try {
            const response = await fetch(`${API_BASE_URL}/cart/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки корзины');
            }
            
            const cartItems = await response.json();
            
            if (cartItems.length === 0) {
                if (emptyCartRow) emptyCartRow.style.display = '';
                if (checkoutBtn) checkoutBtn.disabled = true;
                if (totalItemsEl) totalItemsEl.textContent = '0';
                if (totalPriceEl) totalPriceEl.textContent = '0 руб.';
                if (cartItemsContainer) cartItemsContainer.innerHTML = '<tr class="empty-cart"><td colspan="5">Ваша корзина пуста</td></tr>';
                return;
            }
            
            if (emptyCartRow) emptyCartRow.style.display = 'none';
            if (checkoutBtn) checkoutBtn.disabled = false;
            
            if (cartItemsContainer) {
                cartItemsContainer.innerHTML = '';
                
                let totalItems = 0;
                let totalPrice = 0;
                
                cartItems.forEach(item => {
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
        } catch (error) {
            alert(`Ошибка загрузки корзины: ${error.message}`);
        }
    }
    
    async function updateQuantity(id, change) {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/cart/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    quantity: change
                })
            });
            
            if (response.ok) {
                updateCartCount();
                updateCartDisplay();
            } else {
                const error = await response.json();
                alert(`Ошибка обновления: ${error.error}`);
            }
        } catch (error) {
            alert(`Ошибка обновления: ${error.message}`);
        }
    }
    
    async function removeFromCart(id) {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/cart/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                updateCartCount();
                updateCartDisplay();
            } else {
                const error = await response.json();
                alert(`Ошибка удаления: ${error.error}`);
            }
        } catch (error) {
            alert(`Ошибка удаления: ${error.message}`);
        }
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
            
            // Реальное обновление при вводе
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
    
    // Установка конкретного количества товара
    async function setQuantity(id, quantity, isLiveUpdate = false) {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/cart/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    quantity: quantity
                })
            });

            if (response.ok) {
                updateCartCount();
                updateCartDisplay();
                
                if (isLiveUpdate) {
                    // Мгновенное обновление только суммы для этого товара
                    const row = document.querySelector(`input.item-qty[data-id="${id}"]`).closest('tr');
                    if (row) {
                        const itemTotal = quantity * (await fetch(`${API_BASE_URL}/cart/${id}/`).then(r => r.json())).price;
                        row.querySelector('.item-total').textContent = `${itemTotal} руб.`;
                        
                        // Обновляем общую сумму
                        updateTotalPrice();
                    }
                }
            } else {
                const error = await response.json();
                alert(`Ошибка установки количества: ${error.error}`);
            }
        } catch (error) {
            alert(`Ошибка установки количества: ${error.message}`);
        }
    }
    
    // Обновление общей суммы
    async function updateTotalPrice() {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/cart/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const cartItems = await response.json();
                const totalPrice = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                document.getElementById('total-price').textContent = `${totalPrice} руб.`;
                document.querySelectorAll('.total-row td:last-child strong').forEach(el => {
                    el.textContent = `${totalPrice} руб.`;
                });
            }
        } catch (error) {
            console.error('Ошибка обновления общей суммы:', error);
        }
    }
    
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = parseInt(this.getAttribute('data-id'));
            const name = this.getAttribute('data-name');
            const price = parseInt(this.getAttribute('data-price'));
            
            this.textContent = 'Добавляется...';
            this.style.backgroundColor = '#ffc107';
            this.disabled = true;
            
            try {
                await addToCart(id, name, price);
                
                this.textContent = 'Добавлено!';
                this.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    this.textContent = 'В корзину';
                    this.style.backgroundColor = '#2e8b57';
                    this.disabled = false;
                }, 2000);
                
            } catch (error) {
                this.textContent = 'Ошибка!';
                this.style.backgroundColor = '#dc3545';
                setTimeout(() => {
                    this.textContent = 'В корзину';
                    this.style.backgroundColor = '#2e8b57';
                    this.disabled = false;
                }, 2000);
            }
        });
    });
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            alert('Заказ оформлен! Спасибо за покупку.');
            window.location.href = 'index.html';
        });
    }
    
    updateCartCount();
    if (window.location.pathname.includes('cart.html')) {
        updateCartDisplay();
    }
});