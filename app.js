let DB = {
  users: {},
  categories: [],
  items: [],
  orders: [],
  transactions: [],
  wallets: {},
  sellers: {}
};

let currentUser = null; 
let selectedCategory = 'cat_all';

async function loadDataFromDB() {
  try {
    const res = await fetch('/api?action=init');
    const data = await res.json();

    DB.categories = data.categories || [];
    DB.items = data.items || [];
    DB.orders = data.orders || [];
    DB.transactions = data.transactions || [];

    DB.users = {};
    (data.users || []).forEach(u => DB.users[u.id] = u);

    DB.wallets = {};
    (data.wallets || []).forEach(w => DB.wallets[w.user_id] = parseFloat(w.balance));

    DB.sellers = {};
    (data.sellers || []).forEach(s => DB.sellers[s.user_id] = s);

    const savedUserId = localStorage.getItem('safevault_user_id');
    if (savedUserId && DB.users[savedUserId]) {
      currentUser = DB.users[savedUserId];
      currentUser.balance = DB.wallets[savedUserId] || 0.00;
      currentUser.rank = DB.sellers[savedUserId] ? DB.sellers[savedUserId].rank : 'Bronze';
      
      document.getElementById('auth-screen').classList.add('hidden');
      updateHeaderProfile();
      setupRoleNavigation();
    } else {
      currentUser = null;
      showLoginScreen();
    }

    refreshApp();
  } catch (err) {
    console.error("Database connection error:", err);
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash text-xs text-amber-500';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye text-xs text-slate-400';
  }
}

function setAuthMode(mode) {
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignUp = document.getElementById('auth-tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignUp = document.getElementById('form-signup');

  if (mode === 'login') {
    tabLogin.className = "flex-1 py-2.5 rounded-xl bg-white text-slate-900 shadow-sm transition";
    tabSignUp.className = "flex-1 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 transition";
    formLogin.classList.remove('hidden');
    formSignUp.classList.add('hidden');
  } else {
    tabSignUp.className = "flex-1 py-2.5 rounded-xl bg-white text-slate-900 shadow-sm transition";
    tabLogin.className = "flex-1 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 transition";
    formSignUp.classList.remove('hidden');
    formLogin.classList.add('hidden');
  }
}

async function handleSignUpSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const role = document.querySelector('input[name="signup-role"]:checked').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;

  if (password !== confirmPassword) return notify('Passwords do not match!', 'error');

  const res = await fetch('/api?action=signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role })
  });

  const data = await res.json();
  if (!res.ok) return notify(data.error || 'Signup failed', 'error');

  currentUser = data;
  localStorage.setItem('safevault_user_id', currentUser.id);

  document.getElementById('form-signup').reset();
  document.getElementById('auth-screen').classList.add('hidden');
  await loadDataFromDB();
  notify(`Welcome, ${name}!`);
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  const res = await fetch('/api?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) return notify(data.error || 'Login failed', 'error');

  currentUser = data;
  localStorage.setItem('safevault_user_id', currentUser.id);

  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('form-login').reset();
  document.getElementById('auth-screen').classList.add('hidden');

  await loadDataFromDB();
  notify(`Welcome back, ${currentUser.name}!`);
}

function showLoginScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  setAuthMode('login');
}

function performLogout() {
  currentUser = null;
  localStorage.removeItem('safevault_user_id');
  showLoginScreen();
  notify('You have been logged out.');
}

function getRankBadgeHTML(rank) {
  rank = rank || 'Bronze';
  if (rank === 'Platinum') return `<span class="bg-purple-100 text-purple-800 text-[9px] font-black px-2 py-0.5 rounded-full"><i class="fa-solid fa-gem mr-0.5"></i> Platinum</span>`;
  if (rank === 'Gold') return `<span class="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full"><i class="fa-solid fa-crown mr-0.5"></i> Gold</span>`;
  if (rank === 'Silver') return `<span class="bg-slate-200 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-full"><i class="fa-solid fa-shield mr-0.5"></i> Silver</span>`;
  return `<span class="bg-orange-100 text-orange-800 text-[9px] font-bold px-2 py-0.5 rounded-full"><i class="fa-solid fa-award mr-0.5"></i> Bronze</span>`;
}

async function updateSellerRank(sellerId, newRank) {
  const res = await fetch('/api?action=updateRank', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sellerId, rank: newRank })
  });

  if (res.ok) {
    notify(`Rank updated to ${newRank}!`);
    await loadDataFromDB();
  }
}

function openSellModal() {
  const sel = document.getElementById('post-category');
  sel.innerHTML = DB.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('post-title').value = '';
  document.getElementById('post-price').value = '';
  document.getElementById('post-original-price').value = '';
  document.getElementById('post-stock').value = '';
  document.getElementById('post-img').value = '';
  document.getElementById('modal-sell').classList.remove('hidden');
}

function closeSellModal() {
  document.getElementById('modal-sell').classList.add('hidden');
}

async function submitItem() {
  const title = document.getElementById('post-title').value.trim();
  const price = parseFloat(document.getElementById('post-price').value);
  const oldPrice = parseFloat(document.getElementById('post-original-price').value) || null;
  const stock = parseInt(document.getElementById('post-stock').value) || 1;
  const categoryId = document.getElementById('post-category').value;
  const image = document.getElementById('post-img').value.trim() || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80';

  if (!title || isNaN(price) || price <= 0) return notify('Please enter valid title and price', 'error');

  const res = await fetch('/api?action=postItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sellerId: currentUser.id, categoryId, title, price, oldPrice, stock, image })
  });

  if (res.ok) {
    closeSellModal();
    await loadDataFromDB();
    notify('Item published to marketplace!');
  }
}

function openEditItemModal(itemId) {
  const item = DB.items.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('edit-item-id').value = item.id;
  document.getElementById('edit-title').value = item.title;
  document.getElementById('edit-price').value = item.price;
  document.getElementById('edit-original-price').value = item.old_price || '';
  document.getElementById('edit-stock').value = item.stock;

  document.getElementById('modal-edit-item').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('modal-edit-item').classList.add('hidden');
}

async function saveEditedItem() {
  const itemId = document.getElementById('edit-item-id').value;
  const title = document.getElementById('edit-title').value.trim();
  const price = parseFloat(document.getElementById('edit-price').value);
  const oldPrice = parseFloat(document.getElementById('edit-original-price').value) || null;
  const stock = parseInt(document.getElementById('edit-stock').value) || 0;

  const res = await fetch('/api?action=editItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, title, price, oldPrice, stock })
  });

  if (res.ok) {
    closeEditModal();
    await loadDataFromDB();
    notify('Item updated!');
  }
}

async function deleteCurrentEditedItem() {
  const itemId = document.getElementById('edit-item-id').value;
  if (!confirm('Are you sure you want to delete this item?')) return;

  const res = await fetch('/api?action=deleteItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, sellerId: currentUser.id })
  });

  if (res.ok) {
    closeEditModal();
    await loadDataFromDB();
    notify('Item deleted.');
  }
}

function initiateBuyProcess(itemId) {
  if (!currentUser) return showLoginScreen();
  if (currentUser.role === 'seller') return notify('Sellers cannot buy items!', 'error');

  const item = DB.items.find(i => i.id === itemId);
  if (!item || item.stock <= 0) return notify('Item sold out!', 'error');

  document.getElementById('checkout-item-id').value = item.id;
  document.getElementById('checkout-item-title').innerText = item.title;
  document.getElementById('checkout-stock-avail').innerText = item.stock;

  const seller = DB.users[item.seller_id];
  document.getElementById('checkout-item-seller').innerText = seller ? seller.name : 'Merchant';

  const qtyInput = document.getElementById('checkout-item-qty');
  qtyInput.value = 1;
  qtyInput.max = item.stock;

  document.getElementById('ship-name').value = currentUser.name || '';
  updateCheckoutCalculations();
  document.getElementById('modal-payment').classList.remove('hidden');
}

function adjustCheckoutQty(delta) {
  const itemId = document.getElementById('checkout-item-id').value;
  const item = DB.items.find(i => i.id === itemId);
  const qtyInput = document.getElementById('checkout-item-qty');
  let newQty = (parseInt(qtyInput.value) || 1) + delta;
  if (newQty < 1) newQty = 1;
  if (newQty > item.stock) newQty = item.stock;
  qtyInput.value = newQty;
  updateCheckoutCalculations();
}

function updateCheckoutCalculations() {
  const itemId = document.getElementById('checkout-item-id').value;
  const item = DB.items.find(i => i.id === itemId);
  const qty = parseInt(document.getElementById('checkout-item-qty').value) || 1;

  const total = item.price * qty;
  document.getElementById('checkout-total-price').innerText = `฿${total.toLocaleString()}`;
  document.getElementById('checkout-buyer-balance').innerText = `฿${(currentUser.balance || 0).toLocaleString()}`;

  const insufficient = document.getElementById('insufficient-alert');
  const payBtn = document.getElementById('btn-pay-action');

  if ((currentUser.balance || 0) < total) {
    insufficient.classList.remove('hidden');
    payBtn.disabled = true;
    payBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    insufficient.classList.add('hidden');
    payBtn.disabled = false;
    payBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

function closePaymentModal() {
  document.getElementById('modal-payment').classList.add('hidden');
}

async function executePayment() {
  const itemId = document.getElementById('checkout-item-id').value;
  const qty = parseInt(document.getElementById('checkout-item-qty').value) || 1;
  const shipName = document.getElementById('ship-name').value.trim();
  const shipPhone = document.getElementById('ship-phone').value.trim();
  const shipAddress = document.getElementById('ship-address').value.trim();

  if (!shipName || !shipPhone || !shipAddress) return notify('Please complete the address!', 'error');

  const res = await fetch('/api?action=buy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerId: currentUser.id, itemId, qty, shipName, shipPhone, shipAddress })
  });

  const data = await res.json();
  if (!res.ok) return notify(data.error || 'Purchase failed', 'error');

  closePaymentModal();
  await loadDataFromDB();
  notify('Order placed! Funds held safely in Admin Escrow.');
  switchTab('orders');
}

async function confirmDelivery(orderId) {
  const res = await fetch('/api?action=confirmDelivery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId })
  });

  if (res.ok) {
    await loadDataFromDB();
    notify('Delivery confirmed! 99% paid to seller (1% commission kept by Admin).');
  }
}

function openTopUpModal() {
  if (!currentUser || currentUser.role !== 'buyer') return;
  document.getElementById('topup-current-balance').innerText = `฿${(currentUser.balance || 0).toLocaleString()}`;
  document.getElementById('modal-topup').classList.remove('hidden');
}

function closeTopUpModal() {
  document.getElementById('modal-topup').classList.add('hidden');
}

function setTopUpAmount(val) {
  document.getElementById('topup-amount').value = val;
}

async function executeTopUp() {
  const amount = parseFloat(document.getElementById('topup-amount').value);
  const method = document.querySelector('input[name="topup_method"]:checked').value;

  if (isNaN(amount) || amount <= 0) return notify('Invalid amount', 'error');

  const res = await fetch('/api?action=topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, amount, method })
  });

  const data = await res.json();
  if (res.ok) {
    currentUser.balance = data.balance;
    closeTopUpModal();
    await loadDataFromDB();
    notify(`฿${amount.toLocaleString()} added!`);
  }
}

function openShipModal(orderId) {
  document.getElementById('ship-order-id').value = orderId;
  document.getElementById('ship-tracking').value = '';
  document.getElementById('modal-ship').classList.remove('hidden');
}

function closeShipModal() {
  document.getElementById('modal-ship').classList.add('hidden');
}

async function confirmShipment() {
  const orderId = document.getElementById('ship-order-id').value;
  const courier = document.getElementById('ship-courier').value;
  const tracking = document.getElementById('ship-tracking').value.trim();

  if (!tracking) return notify('Enter tracking number!', 'error');

  const res = await fetch('/api?action=ship', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, courier, tracking })
  });

  if (res.ok) {
    closeShipModal();
    await loadDataFromDB();
    notify(`Marked as shipped via ${courier}!`);
  }
}

function updateHeaderProfile() {
  if (!currentUser) return;
  document.getElementById('current-user-name').innerText = currentUser.name;
  document.getElementById('role-badge').innerText = currentUser.role.toUpperCase();

  const rankDisplay = document.getElementById('current-user-rank-display');
  if (currentUser.role === 'seller') {
    rankDisplay.innerHTML = getRankBadgeHTML(currentUser.rank);
  } else {
    rankDisplay.innerText = currentUser.role === 'admin' ? 'Admin' : 'Buyer';
  }

  const card = document.getElementById('user-wallet-card');
  if (currentUser.role === 'buyer') {
    card.onclick = openTopUpModal;
    card.innerHTML = `
      <span class="text-[11px] font-bold text-slate-500">Balance:</span>
      <span class="text-xs font-black text-slate-900">฿${(currentUser.balance || 0).toLocaleString()}</span>
      <span class="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] ml-1"><i class="fa-solid fa-plus"></i></span>
    `;
  } else if (currentUser.role === 'seller') {
    card.onclick = null;
    card.innerHTML = `
      <span class="text-[11px] font-bold text-slate-500">Earnings:</span>
      <span class="text-xs font-black text-emerald-600">฿${(currentUser.balance || 0).toLocaleString()}</span>
    `;
  } else {
    card.onclick = null;
    card.innerHTML = `
      <span class="text-[11px] font-bold text-slate-500">Escrow/Fees:</span>
      <span class="text-xs font-black text-amber-600">฿${(currentUser.balance || 0).toLocaleString()}</span>
    `;
  }
}

function setupRoleNavigation() {
  if (!currentUser) return;
  const adminTab = document.getElementById('tab-btn-admin');
  const marketTab = document.getElementById('tab-btn-marketplace');
  const ordersTab = document.getElementById('tab-btn-orders');
  const sellerPost = document.getElementById('btn-seller-post');
  const sellerPostMarket = document.getElementById('btn-seller-post-market');

  if (currentUser.role === 'admin') {
    adminTab.classList.remove('hidden');
    marketTab.classList.remove('hidden');
    ordersTab.classList.add('hidden');
    sellerPost.classList.add('hidden');
    sellerPostMarket.classList.add('hidden');
    switchTab('admin-panel');
  } else if (currentUser.role === 'seller') {
    adminTab.classList.add('hidden');
    marketTab.classList.remove('hidden');
    ordersTab.classList.remove('hidden');
    sellerPost.classList.remove('hidden');
    sellerPostMarket.classList.remove('hidden');
    switchTab('marketplace');
  } else {
    adminTab.classList.add('hidden');
    marketTab.classList.remove('hidden');
    ordersTab.classList.remove('hidden');
    sellerPost.classList.add('hidden');
    sellerPostMarket.classList.add('hidden');
    switchTab('marketplace');
  }
}

function refreshApp() {
  updateHeaderProfile();

  const catPills = document.getElementById('category-pills');
  catPills.innerHTML = DB.categories.map(c => `
    <button onclick="setCategory('${c.id}')" class="text-xs px-4 py-2 rounded-full font-bold transition ${selectedCategory === c.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">${c.name}</button>
  `).join('');

  const itemsGrid = document.getElementById('items-grid');
  const filtered = DB.items.filter(i => selectedCategory === 'cat_all' || i.category_id === selectedCategory);

  if (filtered.length === 0) {
    itemsGrid.className = "col-span-full py-16 text-center";
    itemsGrid.innerHTML = `<h3 class="font-extrabold text-slate-900">No items available</h3>`;
  } else {
    itemsGrid.className = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-5";
    itemsGrid.innerHTML = filtered.map(item => {
      const seller = DB.users[item.seller_id];
      const sellerProfile = DB.sellers[item.seller_id];
      const rank = sellerProfile ? sellerProfile.rank : 'Bronze';

      let actionBtn = '';
      if (currentUser && currentUser.role === 'seller') {
        if (currentUser.id === item.seller_id) {
          actionBtn = `
            <div class="grid grid-cols-2 gap-1 w-full">
              <button onclick="openEditItemModal('${item.id}')" class="py-1.5 bg-amber-500 text-white rounded-full text-xs font-bold">Edit</button>
              <button onclick="deleteCurrentEditedItem()" class="py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-bold">Delete</button>
            </div>
          `;
        } else {
          actionBtn = `<button disabled class="w-full py-2 bg-slate-100 text-slate-400 rounded-full text-xs font-bold">Seller</button>`;
        }
      } else {
        actionBtn = item.stock > 0 
          ? `<button onclick="initiateBuyProcess('${item.id}')" class="w-full py-2 bg-slate-900 text-white rounded-full text-xs font-bold">Buy Now (${item.stock})</button>`
          : `<button disabled class="w-full py-2 bg-slate-200 text-slate-400 rounded-full text-xs font-bold">Sold Out</button>`;
      }

      return `
        <div class="flex flex-col items-center text-center p-3 border rounded-3xl bg-white shadow-sm">
          <div class="w-full aspect-square bg-slate-50 rounded-2xl flex items-center justify-center p-2 mb-2">
            <i class="fa-solid fa-box text-3xl text-slate-300"></i>
          </div>
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-[11px] font-bold text-slate-600">${seller ? seller.name : 'Store'}</span>
            ${getRankBadgeHTML(rank)}
          </div>
          <h4 class="font-extrabold text-xs text-slate-900 mb-1">${item.title}</h4>
          <div class="text-sm font-black text-slate-900 mb-2">฿${Number(item.price).toLocaleString()}</div>
          ${actionBtn}
        </div>
      `;
    }).join('');
  }

  const ordersList = document.getElementById('orders-list');
  ordersList.innerHTML = DB.orders.map(o => `
    <div class="p-4 bg-white border rounded-2xl flex justify-between items-center text-xs">
      <div>
        <div class="font-bold text-slate-900">${o.id} - Total: ฿${Number(o.total).toLocaleString()}</div>
        <div class="text-slate-400">Status: <span class="uppercase font-bold text-orange-500">${o.status}</span></div>
      </div>
      <div>
        ${o.status === 'confirmed' && currentUser && currentUser.role === 'seller' ? `<button onclick="openShipModal('${o.id}')" class="px-3 py-1 bg-slate-900 text-white rounded-full">Ship</button>` : ''}
        ${o.status === 'shipped' && currentUser && currentUser.role === 'buyer' ? `<button onclick="confirmDelivery('${o.id}')" class="px-3 py-1 bg-emerald-600 text-white rounded-full font-bold">Confirm Received</button>` : ''}
      </div>
    </div>
  `).join('');

  if (currentUser && currentUser.role === 'admin') {
    const sellers = Object.values(DB.users).filter(u => u.role === 'seller');
    document.getElementById('admin-seller-rows').innerHTML = sellers.map(s => `
      <tr class="border-b">
        <td class="p-3 font-bold">${s.name}</td>
        <td class="p-3">${s.email}</td>
        <td class="p-3">
          <select onchange="updateSellerRank('${s.id}', this.value)" class="border p-1 rounded-lg text-xs">
            <option value="Bronze">Bronze</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
            <option value="Platinum">Platinum</option>
          </select>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('ledger-rows').innerHTML = DB.transactions.map(t => `
    <tr class="border-b text-xs">
      <td class="p-3 font-mono">${t.id}</td>
      <td class="p-3 font-bold">${t.type}</td>
      <td class="p-3">฿${Number(t.amount).toLocaleString()}</td>
      <td class="p-3">฿${Number(t.balance).toLocaleString()}</td>
      <td class="p-3 text-slate-400">${new Date(t.created_at).toLocaleTimeString()}</td>
    </tr>
  `).join('');
}

function setCategory(id) {
  selectedCategory = id;
  refreshApp();
}

function switchTab(t) {
  ['marketplace', 'orders', 'admin-panel', 'ledger'].forEach(x => {
    const el = document.getElementById(`tab-${x}`);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(`tab-${t}`);
  if (target) target.classList.remove('hidden');
}

function notify(msg, type = 'success') {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').innerText = msg;
  toast.classList.remove('translate-y-24', 'opacity-0');
  setTimeout(() => toast.classList.add('translate-y-24', 'opacity-0'), 3000);
}

loadDataFromDB();