const API_BASE_URL = "http://127.0.0.1:8000/api";

document.addEventListener('DOMContentLoaded', function() {
    // Обновление счетчика корзины
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
            console.error('Error updating cart count:', error);
            document.querySelectorAll('#cart-count').forEach(el => {
                el.textContent = '0';
            });
        }
    }
    
    // Добавление товара в корзину
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
            
            // Обновляем счетчик корзины
            updateCartCount();
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert(`Ошибка добавления в корзину: ${error.message}`);
        }
    }
    
    // Обработчик кнопок "В корзину"
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = parseInt(this.getAttribute('data-id'));
            const name = this.getAttribute('data-name');
            const price = parseInt(this.getAttribute('data-price'));
            
            // Анимация нажатия
            this.textContent = 'Добавляется...';
            this.style.backgroundColor = '#ffc107';
            this.disabled = true;
            
            try {
                await addToCart(id, name, price);
                
                // Успешная анимация
                this.textContent = 'Добавлено!';
                this.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    this.textContent = 'В корзину';
                    this.style.backgroundColor = '#2e8b57';
                    this.disabled = false;
                }, 2000);
                
            } catch (error) {
                // Ошибка
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
    
    // Инициализация при загрузке страницы
    updateCartCount();
});