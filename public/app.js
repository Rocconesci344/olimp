let products = [];
let users = [];

const productList = document.getElementById("product-list");
const cartBtn = document.getElementById("cart-btn");
const cartPanel = document.getElementById("cart-panel");
const closeCartBtn = document.getElementById("close-cart");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");

const profileBtn = document.getElementById("profile-btn");
const profilePanel = document.getElementById("profile-panel");

let currentUser = null;
let cart = [];
let currentFilter = "todos"; // 👈 Filtro actual

async function loadJSON() {
  try {
    const [productsResp, usersResp] = await Promise.all([
      fetch('productos.json'),
      fetch('users.json')
    ]);
    products = await productsResp.json();

    const usersFromJSON = await usersResp.json();

    const storedUsersStr = localStorage.getItem("users");
    if (storedUsersStr) {
      users = JSON.parse(storedUsersStr);
    } else {
      users = usersFromJSON;
      localStorage.setItem("users", JSON.stringify(users));
    }
  } catch (error) {
    console.error("Error cargando JSON:", error);
  }
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function getUsers() {
  const usersStr = localStorage.getItem("users");
  return usersStr ? JSON.parse(usersStr) : [];
}

function loadSession() {
  const savedEmail = sessionStorage.getItem("loggedUserEmail");
  if (savedEmail) {
    return users.find(u => u.email === savedEmail) || null;
  }
  return null;
}

function saveSession(email) {
  sessionStorage.setItem("loggedUserEmail", email);
}

function clearSession() {
  sessionStorage.removeItem("loggedUserEmail");
}

function loadCartForUser(email) {
  const cartStr = sessionStorage.getItem("cart_" + email);
  return cartStr ? JSON.parse(cartStr) : [];
}

function saveCartForUser(email, cart) {
  sessionStorage.setItem("cart_" + email, JSON.stringify(cart));
}

function renderProducts() {
  productList.innerHTML = "";

  let filtered = products;
  if (currentFilter === "nacional") {
    filtered = products.filter(p => p.tipo === "nacional");
  } else if (currentFilter === "internacional") {
    filtered = products.filter(p => p.tipo === "internacional");
  }

  filtered.forEach(prod => {
    const div = document.createElement("div");
    div.className = "product-card";
    div.innerHTML = `
      <h3 class="product-card__name">${prod.name}</h3>
      <img src="${prod.image}" alt="${prod.name}" class="product-card__image" />
      <p class="product-card__tipo">${prod.tipo.toUpperCase()}</p>
      <p class="product-card__price">Precio: $${prod.price}</p>
      <button class="product-card__add-btn add-to-cart-btn" data-id="${prod.id}">Agregar al carrito</button>
    `;
    productList.appendChild(div);
  });

  document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      if (!currentUser) {
        alert("Debes iniciar sesión para agregar productos al carrito.");
        return;
      }
      const id = parseInt(e.target.dataset.id);
      addToCart(id);
    });
  });
}

function addToCart(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ id: prod.id, name: prod.name, price: prod.price, quantity: 1 });
  }

  saveCartForUser(currentUser.email, cart);
  renderCart();
  updateCartCount();
}

function renderCart() {
  cartItems.innerHTML = "";

  if (cart.length === 0) {
    cartItems.innerHTML = "<p>Tu carrito está vacío.</p>";
    cartTotal.textContent = "0";
    updateCartCount();
    return;
  }

  cart.forEach(item => {
    const prod = products.find(p => p.id === item.id);
    if (!prod) return;

    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";

    itemDiv.innerHTML = `
      <span class="cart-item-name">${prod.name}</span>
      <div class="cart-item-qty">
        <button class="qty-btn" data-id="${item.id}" data-action="decrease">-</button>
        <span class="qty-number">${item.quantity}</span>
        <button class="qty-btn" data-id="${item.id}" data-action="increase">+</button>
      </div>
      <span class="cart-item-price">$${(prod.price * item.quantity).toFixed(2)}</span>
    `;

    cartItems.appendChild(itemDiv);
  });

  updateCartTotal();
  updateCartCount();

  document.querySelectorAll(".qty-btn").forEach(button => {
    button.addEventListener("click", (e) => {
      const id = parseInt(e.target.dataset.id);
      const action = e.target.dataset.action;

      const index = cart.findIndex(i => i.id === id);
      if (index === -1) return;

      if (action === "increase") {
        cart[index].quantity++;
      } else if (action === "decrease") {
        cart[index].quantity--;
        if (cart[index].quantity <= 0) {
          cart.splice(index, 1);
        }
      }

      saveCartForUser(currentUser.email, cart);
      renderCart();
    });
  });
}

function updateCartTotal() {
  const total = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.id);
    return sum + (prod ? prod.price * item.quantity : 0);
  }, 0);
  cartTotal.textContent = total.toFixed(2);
}

function updateCartCount() {
  const count = cart.reduce((acc, i) => acc + i.quantity, 0);
  document.getElementById("cart-count").textContent = count;
}

function renderUserInfo() {
  if (currentUser) {
    profilePanel.innerHTML = `
      <div class="user-info">
        <p>Hola, <strong>${currentUser.name}</strong></p>
        <button id="logout-btn">Cerrar sesión</button>
      </div>
    `;
    document.getElementById("logout-btn").addEventListener("click", () => {
      clearSession();
      currentUser = null;
      cart = [];
      renderUserInfo();
      renderCart();
      updateCartCount();
    });
  } else {
    renderAuthForms();
  }
}

function renderAuthForms() {
  profilePanel.innerHTML = `
    <div class="auth-forms">
      <form id="login-form">
        <h2>Iniciar sesión</h2>
        <label for="login-email">Correo electrónico</label>
        <input type="email" id="login-email" required />
        <label for="login-password">Contraseña</label>
        <input type="password" id="login-password" required minlength="6" />
        <button type="submit">Entrar</button>
        <p class="auth-toggle" id="show-register">¿No tienes cuenta? Regístrate</p>
        <p class="auth-error" id="login-error"></p>
      </form>

      <form id="register-form" style="display:none;">
        <h2>Registrarse</h2>
        <label for="reg-name">Nombre completo</label>
        <input type="text" id="reg-name" required />
        <label for="reg-email">Correo electrónico</label>
        <input type="email" id="reg-email" required />
        <label for="reg-password">Contraseña</label>
        <input type="password" id="reg-password" required />
        <label for="reg-password2">Confirmar contraseña</label>
        <input type="password" id="reg-password2" required />
        <button type="submit">Crear cuenta</button>
        <p class="auth-toggle" id="show-login">¿Ya tienes cuenta? Inicia sesión</p>
        <p class="auth-error" id="register-error"></p>
      </form>
    </div>
  `;

  document.getElementById("show-register").addEventListener("click", () => {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
  });

  document.getElementById("show-login").addEventListener("click", () => {
    document.getElementById("register-form").style.display = "none";
    document.getElementById("login-form").style.display = "block";
  });

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = e.target["login-email"].value.trim().toLowerCase();
    const password = e.target["login-password"].value;

    const user = users.find(u => u.email === email);
    if (!user) {
      showError("login-error", "Usuario no encontrado.");
      return;
    }
    if (user.password !== password) {
      showError("login-error", "Contraseña incorrecta.");
      return;
    }

    currentUser = user;
    saveSession(user.email);
    cart = loadCartForUser(user.email);
    renderUserInfo();
    renderCart();
    updateCartCount();
  });

  document.getElementById("register-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = e.target["reg-name"].value.trim();
    const email = e.target["reg-email"].value.trim().toLowerCase();
    const password = e.target["reg-password"].value;
    const password2 = e.target["reg-password2"].value;

    if (password !== password2) {
      showError("register-error", "Las contraseñas no coinciden.");
      return;
    }

    if (users.some(u => u.email === email)) {
      showError("register-error", "Este correo ya está registrado.");
      return;
    }

    const newUser = { name, email, password };
    users.push(newUser);
    saveUsers(users);
    currentUser = newUser;
    saveSession(email);
    cart = [];
    renderUserInfo();
    renderCart();
    updateCartCount();
  });
}

function showError(id, message) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = message;
    setTimeout(() => {
      el.textContent = "";
    }, 3000);
  }
}

cartBtn.addEventListener("click", () => {
  if (!currentUser) {
    alert("Debes iniciar sesión para ver el carrito.");
    return;
  }
  cartPanel.classList.toggle("active");
  profilePanel.classList.remove("active");
});

closeCartBtn.addEventListener("click", () => {
  cartPanel.classList.remove("active");
});

profileBtn.addEventListener("click", () => {
  profilePanel.classList.toggle("active");
  cartPanel.classList.remove("active");
});

(async function init() {
  await loadJSON();
  users = getUsers();
  currentUser = loadSession();
  if (currentUser) {
    cart = loadCartForUser(currentUser.email);
  }

  renderProducts();
  renderUserInfo();
  renderCart();
  updateCartCount();

  // Agrega eventos de filtro
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      renderProducts();
    });
  });
})();
