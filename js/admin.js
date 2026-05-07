import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- State ---
let currentTab = 'products';
let products = [];
let categories = [];
let ads = [];
let siteConfig = {
  orderEmail: "mouhamedamineyousfi10@gmail.com",
  shippingDt: 7,
  adminPass: "admin123" // Default password
};

// --- DOM Elements ---
const loginOverlay = document.getElementById('loginOverlay');
const adminContent = document.getElementById('adminContent');
const loginBtn = document.getElementById('loginBtn');
const adminPasswordInput = document.getElementById('adminPassword');
const loginError = document.getElementById('loginError');
const togglePassword = document.getElementById('togglePassword');

const navBtns = document.querySelectorAll('.nav-btn[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');
const logoutBtn = document.getElementById('logoutBtn');

const productsList = document.getElementById('productsList');
const categoriesList = document.getElementById('categoriesList');
const adsList = document.getElementById('adsList');

const adminModal = document.getElementById('adminModal');
const closeModal = document.querySelector('.close-modal');
const adminForm = document.getElementById('adminForm');
const modalTitle = document.getElementById('modalTitle');

const configForm = document.getElementById('configForm');
const confOrderEmail = document.getElementById('confOrderEmail');
const confShippingDt = document.getElementById('confShippingDt');
const confAdminPass = document.getElementById('confAdminPass');
const toggleConfPassword = document.getElementById('toggleConfPassword');

// --- Authentication ---
async function checkAuth() {
  const savedPass = localStorage.getItem('gca_admin_pass');
  const docSnap = await getDoc(doc(db, "config", "site"));
  
  if (docSnap.exists()) {
    siteConfig = docSnap.data();
  } else {
    // Initialize config if it doesn't exist
    await setDoc(doc(db, "config", "site"), siteConfig);
  }

  if (savedPass === siteConfig.adminPass) {
    showAdmin();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginOverlay.style.display = 'flex';
  adminContent.style.display = 'none';
}

function showAdmin() {
  loginOverlay.style.display = 'none';
  adminContent.style.display = 'block';
  loadData();
  fillConfigForm();
}

loginBtn.addEventListener('click', () => {
  const pass = adminPasswordInput.value;
  if (pass === siteConfig.adminPass) {
    localStorage.setItem('gca_admin_pass', pass);
    showAdmin();
  } else {
    loginError.textContent = "Mot de passe incorrect.";
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('gca_admin_pass');
  location.reload();
});

togglePassword.addEventListener('click', () => {
  const type = adminPasswordInput.type === 'password' ? 'text' : 'password';
  adminPasswordInput.type = type;
  togglePassword.classList.toggle('fa-eye-slash');
});

toggleConfPassword.addEventListener('click', () => {
  const type = confAdminPass.type === 'password' ? 'text' : 'password';
  confAdminPass.type = type;
  toggleConfPassword.classList.toggle('fa-eye-slash');
});

// --- Tab Navigation ---
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    currentTab = tab;
    
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${tab}Tab`) content.classList.add('active');
    });
  });
});

// --- Data Loading ---
function loadData() {
  // Products
  onSnapshot(collection(db, "products"), (snap) => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProducts();
  });

  // Categories
  onSnapshot(collection(db, "categories"), (snap) => {
    categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategories();
  });

  // Ads
  onSnapshot(collection(db, "ad"), (snap) => {
    ads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAds();
  });
}

// --- Rendering ---
function renderProducts() {
  productsList.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image || ''}" class="admin-img-preview"></td>
      <td>${p.name || 'Sans nom'}</td>
      <td>${p.price || 0} DT</td>
      <td>${p.category || '-'}</td>
      <td>${p.tag || ''}</td>
      <td class="action-btns">
        <i class="fas fa-edit btn-edit" onclick="editProduct('${p.id}')"></i>
        <i class="fas fa-trash btn-delete" onclick="deleteItem('products', '${p.id}')"></i>
      </td>
    </tr>
  `).join('');
}

function renderCategories() {
  categoriesList.innerHTML = categories.map(c => `
    <tr>
      <td><img src="${c.image || ''}" class="admin-img-preview"></td>
      <td>${c.name || ''}</td>
      <td>${c.slug || ''}</td>
      <td>${c.order || 0}</td>
      <td class="action-btns">
        <i class="fas fa-edit btn-edit" onclick="editCategory('${c.id}')"></i>
        <i class="fas fa-trash btn-delete" onclick="deleteItem('categories', '${c.id}')"></i>
      </td>
    </tr>
  `).join('');
}

function renderAds() {
  adsList.innerHTML = ads.map(a => `
    <tr>
      <td>${a.text || ''}</td>
      <td>${a.order || 0}</td>
      <td>${a.active !== false ? 'Oui' : 'Non'}</td>
      <td class="action-btns">
        <i class="fas fa-edit btn-edit" onclick="editAd('${a.id}')"></i>
        <i class="fas fa-trash btn-delete" onclick="deleteItem('ad', '${a.id}')"></i>
      </td>
    </tr>
  `).join('');
}

function fillConfigForm() {
  confOrderEmail.value = siteConfig.orderEmail;
  confShippingDt.value = siteConfig.shippingDt;
  confAdminPass.value = siteConfig.adminPass;
}

configForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newConfig = {
    orderEmail: confOrderEmail.value,
    shippingDt: Number(confShippingDt.value),
    adminPass: confAdminPass.value
  };
  await setDoc(doc(db, "config", "site"), newConfig);
  siteConfig = newConfig;
  localStorage.setItem('gca_admin_pass', newConfig.adminPass);
  alert("Configuration enregistrée !");
});

// --- CRUD Operations ---
window.deleteItem = async (coll, id) => {
  if (confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
    await deleteDoc(doc(db, coll, id));
  }
};

window.editProduct = (id) => {
  const p = products.find(x => x.id === id) || {};
  modalTitle.textContent = id ? "Modifier le Produit" : "Ajouter un Produit";
  adminForm.innerHTML = `
    <input type="hidden" name="id" value="${id || ''}">
    <div class="form-group">
      <label>Nom du produit</label>
      <input type="text" name="name" value="${p.name || ''}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Prix (DT)</label>
        <input type="number" name="price" value="${p.price || 0}" required>
      </div>
      <div class="form-group">
        <label>Catégorie</label>
        <select name="category">
          ${categories.map(c => `<option value="${c.slug || c.name}" ${p.category === (c.slug || c.name) ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Image URL</label>
      <input type="text" name="image" value="${p.image || ''}" required>
    </div>
    <div class="form-group">
      <label>Tag (ex: -20%, Nouveauté, Rupture)</label>
      <input type="text" name="tag" value="${p.tag || ''}">
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea name="description">${p.description || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Tailles USA (séparées par des virgules)</label>
        <input type="text" name="tailleUSA" value="${(p.tailleUSA || []).join(', ')}">
      </div>
      <div class="form-group">
        <label>Tailles EUR (séparées par des virgules)</label>
        <input type="text" name="tailleEUR" value="${(p.tailleEUR || []).join(', ')}">
      </div>
    </div>
    <div class="form-group">
      <label>Couleurs (séparées par des virgules)</label>
      <input type="text" name="colors" value="${(p.colors || []).join(', ')}">
    </div>
    <button type="submit" class="btn-primary">Enregistrer</button>
  `;
  adminModal.style.display = 'flex';
};

window.editCategory = (id) => {
  const c = categories.find(x => x.id === id) || {};
  modalTitle.textContent = id ? "Modifier la Catégorie" : "Ajouter une Catégorie";
  adminForm.innerHTML = `
    <input type="hidden" name="id" value="${id || ''}">
    <div class="form-group">
      <label>Nom de la catégorie</label>
      <input type="text" name="name" value="${c.name || ''}" required>
    </div>
    <div class="form-group">
      <label>Slug (URL)</label>
      <input type="text" name="slug" value="${c.slug || ''}" required>
    </div>
    <div class="form-group">
      <label>Image URL</label>
      <input type="text" name="image" value="${c.image || ''}">
    </div>
    <div class="form-group">
      <label>Ordre d'affichage</label>
      <input type="number" name="order" value="${c.order || 0}">
    </div>
    <button type="submit" class="btn-primary">Enregistrer</button>
  `;
  adminModal.style.display = 'flex';
};

window.editAd = (id) => {
  const a = ads.find(x => x.id === id) || {};
  modalTitle.textContent = id ? "Modifier la Publicité" : "Ajouter une Publicité";
  adminForm.innerHTML = `
    <input type="hidden" name="id" value="${id || ''}">
    <div class="form-group">
      <label>Texte de la pub</label>
      <input type="text" name="text" value="${a.text || ''}" required>
    </div>
    <div class="form-group">
      <label>Ordre</label>
      <input type="number" name="order" value="${a.order || 0}">
    </div>
    <div class="form-group">
      <label>
        <input type="checkbox" name="active" ${a.active !== false ? 'checked' : ''}> Actif
      </label>
    </div>
    <button type="submit" class="btn-primary">Enregistrer</button>
  `;
  adminModal.style.display = 'flex';
};

document.getElementById('addProductBtn').onclick = () => editProduct();
document.getElementById('addCategoryBtn').onclick = () => editCategory();
document.getElementById('addAdBtn').onclick = () => editAd();

adminForm.onsubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(adminForm);
  const id = formData.get('id') || doc(collection(db, "temp")).id;
  const data = {};
  
  let coll = "";
  if (currentTab === 'products') {
    coll = "products";
    data.name = formData.get('name');
    data.price = Number(formData.get('price'));
    data.category = formData.get('category');
    data.image = formData.get('image');
    data.tag = formData.get('tag');
    data.description = formData.get('description');
    data.tailleUSA = formData.get('tailleUSA').split(',').map(s => s.trim()).filter(Boolean);
    data.tailleEUR = formData.get('tailleEUR').split(',').map(s => s.trim()).filter(Boolean);
    data.colors = formData.get('colors').split(',').map(s => s.trim()).filter(Boolean);
    data.images = [data.image];
  } else if (currentTab === 'categories') {
    coll = "categories";
    data.name = formData.get('name');
    data.slug = formData.get('slug');
    data.image = formData.get('image');
    data.order = Number(formData.get('order'));
  } else if (currentTab === 'ads') {
    coll = "ad";
    data.text = formData.get('text');
    data.order = Number(formData.get('order'));
    data.active = adminForm.querySelector('[name="active"]').checked;
  }

  await setDoc(doc(db, coll, id), data);
  adminModal.style.display = 'none';
};

closeModal.onclick = () => adminModal.style.display = 'none';
window.onclick = (e) => { if (e.target === adminModal) adminModal.style.display = 'none'; };

checkAuth();
