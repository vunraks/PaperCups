const API_BASE_URL = "http://127.0.0.1:8000/api";

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const name = this.getAttribute('data-name');
            const price = parseInt(this.getAttribute('data-price'));
            this.textContent = 'Добавляется...';
            this.style.backgroundColor = '#ffc107';
            this.disabled = true;
            addToCart(id, name, price);
            this.textContent = 'Добавлено!';
            this.style.backgroundColor = '#28a745';
            setTimeout(() => {
                this.textContent = 'В корзину';
                this.style.backgroundColor = '#2e8b57';
                this.disabled = false;
            }, 2000);
        });
    });
    if (typeof updateCartCount === 'function') updateCartCount();
}); 