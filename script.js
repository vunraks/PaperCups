document.addEventListener('DOMContentLoaded', function() {
    // Инициализация корзины
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Обновление счетчика корзины
    function updateCartCount() {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        document.querySelectorAll('#cart-count').forEach(el => {
            el.textContent = count;
        });
    }
    
    // Обновление отображения корзины на странице cart.html
    function updateCartDisplay() {
        const cartItemsContainer = document.getElementById('cart-items');
        const emptyCartRow = document.querySelector('.empty-cart');
        const checkoutBtn = document.getElementById('checkout-btn');
        const totalItemsEl = document.getElementById('total-items');
        const totalPriceEl = document.getElementById('total-price');
        
        if (cart.length === 0) {
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
            
            // Добавляем итоговую строку
            const totalRow = document.createElement('tr');
            totalRow.className = 'total-row';
            totalRow.innerHTML = `
                <td colspan="3" class="text-right"><strong>Итого:</strong></td>
                <td colspan="2"><strong>${totalPrice} руб.</strong></td>
            `;
            cartItemsContainer.appendChild(totalRow);
            
            if (totalItemsEl) totalItemsEl.textContent = totalItems;
            if (totalPriceEl) totalPriceEl.textContent = `${totalPrice} руб.`;
            
            // Добавляем обработчики событий для новых элементов
            addCartEventListeners();
        }
    }
    
    // Добавление обработчиков событий для элементов корзины
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
    
    // Добавление товара в корзину
    function addToCart(id, name, price) {
        const existingItem = cart.find(item => item.id === id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: id,
                name: name,
                price: price,
                quantity: 1
            });
        }
        
        saveCart();
        updateCartCount();
        
        // Если мы на странице корзины, обновляем ее отображение
        if (window.location.pathname.includes('cart.html')) {
            updateCartDisplay();
        }
    }
    
    // Обновление количества товара
    function updateQuantity(id, change) {
        const item = cart.find(item => item.id === id);
        if (item) {
            item.quantity += change;
            
            if (item.quantity <= 0) {
                cart = cart.filter(item => item.id !== id);
            }
            
            saveCart();
            updateCartCount();
            updateCartDisplay();
        }
    }
    
    // Установка конкретного количества товара
    function setQuantity(id, quantity, isLiveUpdate = false) {
        const item = cart.find(item => item.id === id);
        if (item) {
            item.quantity = quantity;
            saveCart();
            updateCartCount();
            
            if (isLiveUpdate) {
                // Мгновенное обновление только суммы для этого товара
                const row = document.querySelector(`input.item-qty[data-id="${id}"]`).closest('tr');
                if (row) {
                    const itemTotal = item.price * item.quantity;
                    row.querySelector('.item-total').textContent = `${itemTotal} руб.`;
                    
                    // Обновляем общую сумму
                    updateTotalPrice();
                }
            } else {
                updateCartDisplay();
            }
        }
    }
    
    // Обновление общей суммы
    function updateTotalPrice() {
        const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        document.getElementById('total-price').textContent = `${totalPrice} руб.`;
        document.querySelectorAll('.total-row td:last-child strong').forEach(el => {
            el.textContent = `${totalPrice} руб.`;
        });
    }
    
    // Удаление товара из корзины
    function removeFromCart(id) {
        cart = cart.filter(item => item.id !== id);
        saveCart();
        updateCartCount();
        updateCartDisplay();
    }
    
    // Сохранение корзины в localStorage
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    
    // Обработчик кнопок "В корзину"
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const name = this.getAttribute('data-name');
            const price = parseInt(this.getAttribute('data-price'));
            
            addToCart(id, name, price);
            
            // Анимация добавления в корзину
            this.textContent = 'Добавлено!';
            this.style.backgroundColor = '#4CAF50';
            setTimeout(() => {
                this.textContent = 'В корзину';
                this.style.backgroundColor = '#2e8b57';
            }, 1000);
        });
    });
    
    // Обработчик кнопки оформления заказа
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            alert('Заказ оформлен! Спасибо за покупку.');
            cart = [];
            saveCart();
            updateCartCount();
            updateCartDisplay();
        });
    }
    
    // Инициализация при загрузке страницы
    updateCartCount();
    if (window.location.pathname.includes('cart.html')) {
        updateCartDisplay();
    }
});