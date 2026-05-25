/**
 * HAGA — Logic tương tác Fullstack (Frontend)
 * Giỏ hàng (localStorage), tìm kiếm live, modal tài khoản, toast, drawer giỏ hàng
 */

/* ═══════════════════════════════════════════════════════════════
   DỮ LIỆU SẢN PHẨM
   ═══════════════════════════════════════════════════════════════ */

const PRODUCTS = [
  { id: 1, name: 'Trà Shan Tuyết Cổ', price: 289000, rating: 5, badge: 'Bán chạy', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9ede5?w=600&h=600&fit=crop', alt: 'Trà xanh' },
  { id: 2, name: 'Mật Ong Rừng U Minh', price: 420000, rating: 5, badge: 'Premium', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=600&fit=crop', alt: 'Mật ong' },
  { id: 3, name: 'Serum Tinh Dầu Bạc Hà', price: 385000, rating: 4.5, badge: 'Mới', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=600&fit=crop', alt: 'Serum thảo mộc' },
  { id: 4, name: 'Bột Matcha Hữu Cơ', price: 195000, rating: 5, badge: null, image: 'https://images.unsplash.com/photo-1515823064-d6a0a32d3942?w=600&h=600&fit=crop', alt: 'Matcha' },
  { id: 5, name: 'Dầu Dừa Ép Lạnh', price: 125000, rating: 4.5, badge: null, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&h=600&fit=crop', alt: 'Dầu dừa' },
  { id: 6, name: 'Kem Dưỡng Hoa Cúc', price: 340000, rating: 5, badge: 'Yêu thích', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop', alt: 'Kem dưỡng' },
  { id: 7, name: 'Tinh Bột Nghệ Vàng', price: 168000, rating: 4.5, badge: null, image: 'https://images.unsplash.com/photo-1596040033229-a0c582c9ca5c?w=600&h=600&fit=crop', alt: 'Tinh bột nghệ' },
  { id: 8, name: 'Combo Thảo Mộc Thư Giãn', price: 520000, rating: 5, badge: 'Combo', image: 'https://images.unsplash.com/photo-1505577058444-a3beff7693e5?w=600&h=600&fit=crop', alt: 'Thảo mộc' },
];

const CART_STORAGE_KEY = 'haga_cart';

/** @type {Array<{id:number,name:string,price:number,image:string,quantity:number}>} */
let cart = [];

let toastTimer = null;
let revealObserver = null;
let currentSearchQuery = '';

/* ═══════════════════════════════════════════════════════════════
   TIỆN ÍCH (UTILITIES)
   ═══════════════════════════════════════════════════════════════ */

/**
 * Định dạng số tiền theo chuẩn VNĐ.
 * @param {number} amount
 * @returns {string}
 */
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Tạo HTML 5 sao đánh giá.
 * @param {number} rating
 * @returns {string}
 */
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= full) html += '<i class="fa-solid fa-star"></i>';
    else if (i === full + 1 && half) html += '<i class="fa-solid fa-star-half-stroke"></i>';
    else html += '<i class="fa-regular fa-star"></i>';
  }
  return html;
}

/**
 * Lấy chiều cao header để offset khi cuộn mượt.
 * @returns {number}
 */
function getHeaderOffset() {
  const header = document.getElementById('site-header');
  return header ? header.offsetHeight : 84;
}

/**
 * Tìm sản phẩm theo id trong danh mục.
 * @param {number} id
 * @returns {object|undefined}
 */
function getProductById(id) {
  return PRODUCTS.find((p) => p.id === Number(id));
}

/**
 * Chuẩn hóa chuỗi để so khớp tìm kiếm (bỏ dấu, lowercase).
 * @param {string} str
 * @returns {string}
 */
function normalizeSearch(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* ═══════════════════════════════════════════════════════════════
   TOAST — Thông báo góc dưới màn hình
   ═══════════════════════════════════════════════════════════════ */

/**
 * Hiển thị toast với loại success (xanh) hoặc default.
 * @param {string} message - Nội dung thông báo
 * @param {'success'|'default'} [type='success']
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  const iconEl = document.getElementById('toast-icon');
  if (!toast || !msgEl) return;

  toast.classList.remove('toast--success', 'toast--default');
  toast.classList.add(type === 'success' ? 'toast--success' : 'toast--default');

  if (iconEl) {
    iconEl.className =
      type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info';
  }

  msgEl.textContent = message;
  toast.classList.add('is-show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-show'), 3200);
}

/* ═══════════════════════════════════════════════════════════════
   GIỎ HÀNG — localStorage + Drawer
   ═══════════════════════════════════════════════════════════════ */

/**
 * Đọc giỏ hàng từ localStorage.
 * @returns {Array}
 */
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Lưu giỏ hàng xuống localStorage.
 */
function saveCartToStorage() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

/**
 * Tính tổng số lượng sản phẩm trong giỏ (để hiện badge).
 * @returns {number}
 */
function getCartItemCount() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Tính tổng tiền giỏ hàng.
 * @returns {number}
 */
function getCartTotalPrice() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Cập nhật huy hiệu số lượng trên icon giỏ header.
 */
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  const count = getCartItemCount();
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/**
 * Thêm sản phẩm vào giỏ (gộp số lượng nếu đã có).
 * @param {{id:number,name:string,price:number,image:string}} product
 */
function addProductToCart(product) {
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
  }

  saveCartToStorage();
  updateCartBadge();
  renderCartDrawer();

  showToast(`Đã thêm ${product.name} vào giỏ hàng!`, 'success');
}

/**
 * Thay đổi số lượng một dòng trong giỏ (+/-).
 * @param {number} id - id sản phẩm
 * @param {number} delta - +1 hoặc -1
 */
function changeCartQuantity(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    cart = cart.filter((i) => i.id !== id);
  }

  saveCartToStorage();
  updateCartBadge();
  renderCartDrawer();
}

/**
 * Xóa hoàn toàn một sản phẩm khỏi giỏ.
 * @param {number} id
 */
function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCartToStorage();
  updateCartBadge();
  renderCartDrawer();
  showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'default');
}

/**
 * Vẽ nội dung drawer giỏ hàng và cập nhật tổng tiền.
 */
function renderCartDrawer() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <i class="fa-solid fa-basket-shopping block"></i>
        <p class="font-medium text-forest-700">Giỏ hàng trống</p>
        <p class="text-sm mt-1 text-forest-700/60">Hãy thêm sản phẩm thiên nhiên nhé!</p>
      </div>`;
    if (totalEl) totalEl.textContent = formatVND(0);
    return;
  }

  container.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-line" data-cart-id="${item.id}">
      <img class="cart-line-img" src="${item.image}" alt="${item.name}" width="72" height="72" />
      <div class="cart-line-info">
        <p class="cart-line-name">${item.name}</p>
        <p class="cart-line-price">${formatVND(item.price)}</p>
        <div class="cart-qty-row">
          <button type="button" class="cart-qty-btn" data-action="dec" data-id="${item.id}" aria-label="Giảm số lượng">
            <i class="fa-solid fa-minus"></i>
          </button>
          <span class="cart-qty-value">${item.quantity}</span>
          <button type="button" class="cart-qty-btn" data-action="inc" data-id="${item.id}" aria-label="Tăng số lượng">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
      <button type="button" class="cart-line-remove" data-action="remove" data-id="${item.id}" aria-label="Xóa sản phẩm">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `
    )
    .join('');

  if (totalEl) totalEl.textContent = formatVND(getCartTotalPrice());

  container.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      if (action === 'inc') changeCartQuantity(id, 1);
      else if (action === 'dec') changeCartQuantity(id, -1);
      else if (action === 'remove') removeFromCart(id);
    });
  });
}

/**
 * Mở drawer giỏ hàng (trượt từ phải).
 */
function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;

  renderCartDrawer();
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-cart-open');
}

/**
 * Đóng drawer giỏ hàng.
 */
function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;

  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-cart-open');
}

/**
 * Gắn sự kiện mở/đóng giỏ và nút thanh toán.
 */
function initCartDrawer() {
  document.getElementById('btn-cart')?.addEventListener('click', openCartDrawer);
  document.getElementById('cart-close')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cart-backdrop')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cart-continue')?.addEventListener('click', closeCartDrawer);

  document.getElementById('cart-checkout')?.addEventListener('click', () => {
    if (cart.length === 0) {
      showToast('Giỏ hàng trống — vui lòng thêm sản phẩm', 'default');
      return;
    }
    alert('Chức năng đang hoàn thiện');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCartDrawer();
  });
}

/* ═══════════════════════════════════════════════════════════════
   SẢN PHẨM — Render grid + nút thêm giỏ
   ═══════════════════════════════════════════════════════════════ */

/**
 * Render toàn bộ lưới sản phẩm (không re-render khi tìm kiếm).
 */
function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map(
    (p) => `
    <article
      class="product-card reveal-on-scroll flex flex-col"
      data-id="${p.id}"
      data-name="${p.name}"
      data-search="${normalizeSearch(p.name)}"
    >
      <div class="product-img-wrap">
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        <img src="${p.image}" alt="${p.alt}" class="product-img" loading="lazy" width="600" height="600" />
      </div>
      <div class="p-5 flex flex-col flex-1">
        <div class="stars mb-2" aria-label="Đánh giá ${p.rating} trên 5">${renderStars(p.rating)}</div>
        <h3 class="font-display text-lg font-semibold text-forest-900 leading-snug mb-2 product-title">${p.name}</h3>
        <p class="text-wood-600 font-semibold text-lg mt-auto">${formatVND(p.price)}</p>
        <button type="button" class="add-btn" data-product-id="${p.id}">
          <i class="fa-solid fa-bag-shopping mr-2 text-sm"></i>Thêm vào giỏ
        </button>
      </div>
    </article>
  `
  ).join('');

  grid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = getProductById(btn.dataset.productId);
      if (product) {
        addProductToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
        });
      }
    });
  });

  observeReveal(grid.querySelectorAll('.reveal-on-scroll'));

  if (currentSearchQuery) filterProductCards(currentSearchQuery);
}

/* ═══════════════════════════════════════════════════════════════
   TÌM KIẾM LIVE — Lọc thẻ sản phẩm trên trang
   ═══════════════════════════════════════════════════════════════ */

/**
 * Lọc và ẩn/hiện thẻ sản phẩm theo từ khóa (không reload).
 * @param {string} query
 */
function filterProductCards(query) {
  currentSearchQuery = query.trim();
  const normalizedQuery = normalizeSearch(currentSearchQuery);
  const cards = document.querySelectorAll('#product-grid .product-card');
  const noMsg = document.getElementById('no-products-msg');
  let visibleCount = 0;

  cards.forEach((card) => {
    const searchText = card.dataset.search || '';
    const match = !normalizedQuery || searchText.includes(normalizedQuery);
    card.classList.toggle('is-hidden-by-search', !match);
    if (match) visibleCount += 1;
  });

  if (noMsg) {
    noMsg.classList.toggle('hidden', visibleCount > 0 || !normalizedQuery);
  }
}

/**
 * Đồng bộ giá trị tìm kiếm giữa modal, thanh live và filter grid.
 * @param {string} value
 */
function syncSearchInputs(value) {
  const modalInput = document.getElementById('search-input');
  const liveInput = document.getElementById('live-search-input');
  const clearBtn = document.getElementById('live-search-clear');

  if (modalInput) modalInput.value = value;
  if (liveInput) liveInput.value = value;
  if (clearBtn) clearBtn.classList.toggle('hidden', !value.trim());

  filterProductCards(value);
}

/**
 * Hiện thanh tìm kiếm trong section sản phẩm và cuộn tới đó.
 */
function showLiveSearchBar() {
  const bar = document.getElementById('live-search-bar');
  const section = document.getElementById('san-pham');
  if (!bar) return;

  bar.classList.remove('hidden');
  bar.setAttribute('aria-hidden', 'false');

  if (section) {
    const top = section.getBoundingClientRect().top + window.scrollY - getHeaderOffset() + 8;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  setTimeout(() => document.getElementById('live-search-input')?.focus(), 400);
}

/**
 * Khởi tạo modal tìm kiếm + thanh live + lọc realtime.
 */
function initSearch() {
  const modal = document.getElementById('search-modal');
  const openBtn = document.getElementById('btn-search');
  const modalInput = document.getElementById('search-input');
  const liveInput = document.getElementById('live-search-input');
  const clearBtn = document.getElementById('live-search-clear');

  if (!openBtn) return;

  const openSearch = () => {
    modal?.classList.add('is-open');
    modal?.setAttribute('aria-hidden', 'false');
    showLiveSearchBar();
    setTimeout(() => modalInput?.focus(), 150);
  };

  const closeSearch = () => {
    modal?.classList.remove('is-open');
    modal?.setAttribute('aria-hidden', 'true');
  };

  openBtn.addEventListener('click', openSearch);

  modal?.querySelectorAll('[data-close-search]').forEach((el) => {
    el.addEventListener('click', closeSearch);
  });

  const onSearchInput = (e) => syncSearchInputs(e.target.value);

  modalInput?.addEventListener('input', onSearchInput);
  liveInput?.addEventListener('input', onSearchInput);

  clearBtn?.addEventListener('click', () => {
    syncSearchInputs('');
    liveInput?.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeSearch();
  });
}

/* ═══════════════════════════════════════════════════════════════
   TÀI KHOẢN — Modal đăng nhập / đăng ký + validation
   ═══════════════════════════════════════════════════════════════ */

/**
 * Kiểm tra email hợp lệ.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Hiển thị lỗi validation dưới ô input.
 * @param {string} inputId
 * @param {string} message
 */
function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.querySelector(`[data-error-for="${inputId}"]`);
  if (input) input.classList.toggle('is-invalid', Boolean(message));
  if (errorEl) errorEl.textContent = message || '';
}

/**
 * Xóa toàn bộ lỗi trong một form.
 * @param {HTMLFormElement} form
 */
function clearFormErrors(form) {
  form.querySelectorAll('input').forEach((input) => input.classList.remove('is-invalid'));
  form.querySelectorAll('.auth-error').forEach((el) => (el.textContent = ''));
}

/**
 * Validate form đăng nhập.
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
function validateLoginForm(form) {
  clearFormErrors(form);
  const email = form.querySelector('[name="email"]')?.value ?? '';
  const password = form.querySelector('[name="password"]')?.value ?? '';
  let valid = true;

  if (!email.trim()) {
    setFieldError('login-email', 'Vui lòng nhập email');
    valid = false;
  } else if (!isValidEmail(email)) {
    setFieldError('login-email', 'Email không đúng định dạng');
    valid = false;
  }

  if (!password) {
    setFieldError('login-password', 'Vui lòng nhập mật khẩu');
    valid = false;
  } else if (password.length < 6) {
    setFieldError('login-password', 'Mật khẩu tối thiểu 6 ký tự');
    valid = false;
  }

  return valid;
}

/**
 * Validate form đăng ký.
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
function validateRegisterForm(form) {
  clearFormErrors(form);
  const email = form.querySelector('[name="email"]')?.value ?? '';
  const password = form.querySelector('[name="password"]')?.value ?? '';
  const confirm = form.querySelector('[name="confirm"]')?.value ?? '';
  let valid = true;

  if (!email.trim()) {
    setFieldError('register-email', 'Vui lòng nhập email');
    valid = false;
  } else if (!isValidEmail(email)) {
    setFieldError('register-email', 'Email không đúng định dạng');
    valid = false;
  }

  if (!password) {
    setFieldError('register-password', 'Vui lòng nhập mật khẩu');
    valid = false;
  } else if (password.length < 6) {
    setFieldError('register-password', 'Mật khẩu tối thiểu 6 ký tự');
    valid = false;
  }

  if (!confirm) {
    setFieldError('register-confirm', 'Vui lòng xác nhận mật khẩu');
    valid = false;
  } else if (confirm !== password) {
    setFieldError('register-confirm', 'Mật khẩu xác nhận không khớp');
    valid = false;
  }

  return valid;
}

/**
 * Mở modal tài khoản.
 */
function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-auth-open');
}

/**
 * Đóng modal tài khoản và reset form.
 */
function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-auth-open');

  document.querySelectorAll('.auth-form').forEach((form) => {
    form.reset();
    clearFormErrors(form);
  });
}

/**
 * Chuyển tab Đăng nhập / Đăng ký.
 * @param {'login'|'register'} tab
 */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t) => {
    t.classList.toggle('is-active', t.dataset.authTab === tab);
  });
  document.querySelectorAll('.auth-form').forEach((form) => {
    form.classList.toggle('hidden', form.dataset.authForm !== tab);
  });
}

/**
 * Khởi tạo modal đăng nhập/đăng ký.
 */
function initAuthModal() {
  const modal = document.getElementById('auth-modal');
  const loginForm = document.getElementById('auth-form-login');
  const registerForm = document.getElementById('auth-form-register');

  document.getElementById('btn-account')?.addEventListener('click', openAuthModal);

  modal?.querySelectorAll('[data-close-auth]').forEach((el) => {
    el.addEventListener('click', closeAuthModal);
  });

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.authTab));
  });

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateLoginForm(loginForm)) return;
    showToast('Đăng nhập thành công', 'success');
    closeAuthModal();
  });

  registerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateRegisterForm(registerForm)) return;
    showToast('Đăng ký thành công! Bạn có thể đăng nhập ngay.', 'success');
    switchAuthTab('login');
    registerForm.reset();
    clearFormErrors(registerForm);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeAuthModal();
  });
}

/* ═══════════════════════════════════════════════════════════════
   HEADER, CUỘN, MENU MOBILE, REVEAL
   ═══════════════════════════════════════════════════════════════ */

/**
 * Header trong suốt → nền ivory khi cuộn; parallax hero.
 */
function initHeader() {
  const header = document.getElementById('site-header');
  const hero = document.querySelector('.hero');
  if (!header) return;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 50);

    if (hero) {
      hero.classList.add('is-parallax');
      hero.style.setProperty('--parallax-y', `${y * 0.25}px`);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/**
 * Cuộn mượt tới anchor (giữ offset header).
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - getHeaderOffset() + 4;
      window.scrollTo({ top, behavior: 'smooth' });
      closeMobileMenu();
    });
  });
}

/**
 * Đóng menu mobile.
 */
function closeMobileMenu() {
  const drawer = document.getElementById('mobile-drawer');
  const btn = document.getElementById('btn-mobile-menu');
  if (drawer) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/**
 * Menu hamburger mobile.
 */
function initMobileMenu() {
  const btn = document.getElementById('btn-mobile-menu');
  const drawer = document.getElementById('mobile-drawer');
  if (!btn || !drawer) return;

  btn.addEventListener('click', () => {
    const open = drawer.classList.toggle('is-open');
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });
}

/**
 * Intersection Observer — fade-in khi section vào viewport.
 * @param {NodeList|HTMLElement[]|Array} elements
 */
function observeReveal(elements) {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
  }
  elements.forEach((el) => revealObserver.observe(el));
}

/**
 * Reveal cho feature cards và section nguồn gốc.
 */
function initScrollReveal() {
  observeReveal(document.querySelectorAll('.feature-card, #nguon-goc .reveal-on-scroll'));
}

/**
 * Form đăng ký newsletter (toast cảm ơn).
 */
function initNewsletter() {
  const handle = (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input[type="email"]');
    if (input?.value && isValidEmail(input.value)) {
      showToast('Cảm ơn bạn đã đăng ký nhận tin từ HAGA!', 'success');
      input.value = '';
    } else if (input) {
      showToast('Vui lòng nhập email hợp lệ', 'default');
    }
  };

  document.getElementById('newsletter-form')?.addEventListener('submit', handle);
  document.getElementById('footer-newsletter')?.addEventListener('submit', handle);
}

/* ═══════════════════════════════════════════════════════════════
   KHỞI TẠO ỨNG DỤNG
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  cart = loadCartFromStorage();

  renderProducts();
  updateCartBadge();
  renderCartDrawer();

  initHeader();
  initSmoothScroll();
  initMobileMenu();
  initSearch();
  initCartDrawer();
  initAuthModal();
  initScrollReveal();
  initNewsletter();
});
