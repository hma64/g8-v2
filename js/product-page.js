import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import {
  sanitizeProduct,
  getPriceData,
  isOutOfStockGlobally,
  formatPrice
} from "./product-model.js";
import { getCart, setCart } from "./cart.js";
import { escapeHtml } from "./utils.js";
import { getLang, setLang, i18n } from "./i18n.js";
import { getWishlist, isWished, toggleWish, removeFromWishlist, wishCount } from "./wishlist.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentProduct = null;
let selectedColor = "";
let selectedUsa = "";
let selectedEur = "";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const detailMainImage = document.getElementById("detailMainImage");
const detailGallery = document.getElementById("detailGallery");
const detailName = document.getElementById("detailName");
const detailPrice = document.getElementById("detailPrice");
const detailCategory = document.getElementById("detailCategory");
const detailTagText = document.getElementById("detailTagText");
const detailDescription = document.getElementById("detailDescription");
const colorOptions = document.getElementById("colorOptions");
const sizeOptionsUsa = document.getElementById("sizeOptionsUsa");
const sizeOptionsEur = document.getElementById("sizeOptionsEur");
const colorGroup = document.getElementById("labelColor")?.closest(".option-group");
const selectionError = document.getElementById("selectionError");
const stockMsg = document.getElementById("stockMsg");
const addToCartBtn = document.getElementById("addToCartBtn");
const detailWishBtn = document.getElementById("detailWishBtn");
const langToggleBtn = document.getElementById("langToggleBtn");
const langMenu = document.getElementById("langMenu");
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
const relatedProductsContainer = document.getElementById("relatedProductsContainer");
const relatedProductsSection = document.getElementById("relatedProductsSection");

// Wishlist drawer
const openWishlistBtn = document.getElementById("openWishlistBtn");
const closeWishlistBtn = document.getElementById("closeWishlistBtn");
const wishlistDrawer = document.getElementById("wishlistDrawer");
const wishlistDim = document.getElementById("wishlistDim");
const wishlistItems = document.getElementById("wishlistItems");
const wishlistCountBadge = document.getElementById("wishlistCountBadge");

function applyI18n() {
  const lang = getLang();
  document.documentElement.lang = lang === "ar" ? "ar" : "fr";
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  const keys = [
    ["navHome", "navHome"],
    ["navShop", "navShop"],
    ["navCategories", "navCategories"],
    ["navContact", "navContact"],
    ["btnAllProducts", "navAllProducts"],
    ["labelColor", "colorLabel"],
    ["labelSizeUsa", "sizeUsa"],
    ["labelSizeEur", "sizeEur"],
    ["addToCartBtn", "addToCart"],
    ["backLink", "backShop"]
  ];
  keys.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = i18n[lang][key];
  });

  langToggleBtn.innerHTML =
    lang === "ar"
      ? `<span dir="rtl" style="font-weight:800;">العربية</span>`
      : `<span style="font-weight:800;">Français</span>`;

  document.getElementById("langOptionFr").textContent = i18n.fr.langFr;
  document.getElementById("langOptionAr").textContent = i18n.ar.langAr;

  document.getElementById("cartLabelText").textContent = i18n[lang].cartLabel;
  document.querySelectorAll(".nav-lang-opt").forEach((b) => b.classList.toggle("active-lang", b.dataset.lang === lang));

  const wishNavLabel = document.getElementById("wishlistNavLabel");
  if (wishNavLabel) wishNavLabel.textContent = i18n[lang].wishlistBtn;
  const wishDrawerTitle = document.getElementById("wishlistDrawerTitle");
  if (wishDrawerTitle) wishDrawerTitle.textContent = i18n[lang].wishlistTitle;
  const relatedTitle = document.getElementById("relatedProductsTitle");
  if (relatedTitle) relatedTitle.textContent = i18n[lang].relatedProducts;

  if (currentProduct) {
    addToCartBtn.textContent = isOutOfStockGlobally(currentProduct)
      ? i18n[lang].productOos
      : i18n[lang].addToCart;
    updateStockMessage();
  }
}

function heartSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}

function openWishlist() {
  if (!wishlistDrawer) return;
  wishlistDrawer.classList.add("open");
  wishlistDim.classList.add("show");
  wishlistDrawer.setAttribute("aria-hidden", "false");
  renderWishlistDrawer();
}

function closeWishlist() {
  if (!wishlistDrawer) return;
  wishlistDrawer.classList.remove("open");
  wishlistDim.classList.remove("show");
  wishlistDrawer.setAttribute("aria-hidden", "true");
}

function updateWishlistBadge() {
  if (!wishlistCountBadge) return;
  const count = wishCount();
  wishlistCountBadge.textContent = String(count);
  wishlistCountBadge.classList.toggle("visible", count > 0);
}

function renderWishlistDrawer() {
  if (!wishlistItems) return;
  const lang = getLang();
  const list = getWishlist();
  const title = document.getElementById("wishlistDrawerTitle");
  if (title) title.textContent = i18n[lang].wishlistTitle;
  wishlistItems.innerHTML = "";
  if (!list.length) {
    wishlistItems.innerHTML = `<div class="state-box">${i18n[lang].wishlistEmpty}</div>`;
    return;
  }
  list.forEach((item) => {
    const row = document.createElement("div");
    row.className = "wishlist-row";
    row.innerHTML = `
      <a href="product.html?id=${encodeURIComponent(item.id)}"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" /></a>
      <div class="wishlist-row-info">
        <div class="wishlist-row-name">${escapeHtml(item.name)}</div>
        <div class="wishlist-row-price">${item.finalPrice ?? item.price} DT</div>
      </div>
      <button class="wishlist-row-remove" data-id="${escapeHtml(item.id)}" title="${i18n[lang].removeFromWishlist}">✕</button>
    `;
    wishlistItems.appendChild(row);
  });
}

function syncDetailWishBtn() {
  if (!detailWishBtn || !currentProduct) return;
  const wished = isWished(currentProduct.id);
  detailWishBtn.classList.toggle("active", wished);
}

function isUsaOos(size) {
  if (!currentProduct || !size) return false;
  return currentProduct.ruptureUSA.has(size);
}

function isEurOos(size) {
  if (!currentProduct || !size) return false;
  return currentProduct.ruptureEUR.has(size);
}

function updateStockMessage() {
  const lang = getLang();
  stockMsg.textContent = "";
  if (!currentProduct) return;
  const parts = [];
  if (selectedUsa && isUsaOos(selectedUsa)) {
    parts.push(`${i18n[lang].sizeUsa}: ${i18n[lang].outOfStock}`);
  }
  if (selectedEur && isEurOos(selectedEur)) {
    parts.push(`${i18n[lang].sizeEur}: ${i18n[lang].outOfStock}`);
  }
  stockMsg.textContent = parts.join(" · ");
}

function renderOptionButtons(container, values, type) {
  container.innerHTML = "";
  values.forEach((value, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = value;

    if (type === "color") {
      btn.className = "opt-btn color-opt-btn";
      btn.addEventListener("click", () => {
        const alreadySelected = btn.classList.contains("selected");
        if (alreadySelected) {
          btn.classList.remove("selected");
          selectedColor = "";
          updateStockMessage();
          return;
        }
        container.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedColor = value;
        selectionError.textContent = "";
        updateStockMessage();
        // Swap main image to the color's matching image
        if (currentProduct) {
          const img = currentProduct.images && currentProduct.images[idx]
            ? currentProduct.images[idx]
            : currentProduct.image;
          detailMainImage.src = img;
          // Sync gallery highlight
          const thumbs = detailGallery.querySelectorAll(".thumb");
          thumbs.forEach((t, ti) => t.classList.toggle("active", ti === idx));
        }
      });
    } else {
      btn.className = "opt-btn";
      btn.addEventListener("click", () => {
        const alreadySelected = btn.classList.contains("selected");
        if (alreadySelected) {
          btn.classList.remove("selected");
          if (type === "usa") selectedUsa = "";
          if (type === "eur") selectedEur = "";
          updateStockMessage();
          return;
        }
        container.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        if (type === "usa") selectedUsa = value;
        if (type === "eur") selectedEur = value;
        selectionError.textContent = "";
        updateStockMessage();
      });
    }
    container.appendChild(btn);
  });
}

function renderGallery(images) {
  detailGallery.innerHTML = "";
  images.forEach((imgUrl, index) => {
    const thumb = document.createElement("button");
    thumb.className = `thumb ${index === 0 ? "active" : ""}`;
    thumb.type = "button";
    thumb.innerHTML = `<img src="${escapeHtml(imgUrl)}" alt="" />`;
    thumb.addEventListener("click", () => {
      detailMainImage.src = imgUrl;
      detailGallery.querySelectorAll(".thumb").forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
    detailGallery.appendChild(thumb);
  });
}

function openProductDetails(product) {
  const lang = getLang();
  const L = i18n[lang];
  document.getElementById("labelColor").textContent = L.colorLabel;
  document.getElementById("labelSizeUsa").textContent = L.sizeUsa;
  document.getElementById("labelSizeEur").textContent = L.sizeEur;
  currentProduct = product;
  selectedColor = "";
  selectedUsa = "";
  selectedEur = "";
  selectionError.textContent = "";
  stockMsg.textContent = "";

  detailName.textContent = product.name;
  const priceData = getPriceData(product);
  detailPrice.innerHTML = `${formatPrice(priceData.finalPrice)}${
    priceData.oldPrice ? ` <span class="old-price">${formatPrice(priceData.oldPrice)}</span>` : ""
  }`;
  detailCategory.textContent = product.category;
  detailTagText.textContent = product.tag || "";
  detailDescription.textContent = product.description;
  detailMainImage.src = product.image;
  detailMainImage.alt = product.name;

  const oos = isOutOfStockGlobally(product);
  addToCartBtn.disabled = oos || false;
  addToCartBtn.textContent = oos ? i18n[lang].productOos : i18n[lang].addToCart;

  renderGallery(product.images);
  if (colorGroup) colorGroup.style.display = product.colors.length ? "" : "none";
  renderOptionButtons(colorOptions, product.colors, "color");
  const usaEl = document.getElementById("usaGroup");
  const eurEl = document.getElementById("eurGroup");
  if (usaEl) usaEl.style.display = product.tailleUSA.length ? "" : "none";
  if (eurEl) eurEl.style.display = product.tailleEUR.length ? "" : "none";
  renderOptionButtons(sizeOptionsUsa, product.tailleUSA, "usa");
  renderOptionButtons(sizeOptionsEur, product.tailleEUR, "eur");
  syncDetailWishBtn();
  loadRelatedProducts(product);
}

function renderRelatedProducts(items) {
  if (!relatedProductsContainer || !relatedProductsSection) return;
  relatedProductsContainer.innerHTML = "";
  if (!items.length) {
    relatedProductsSection.style.display = "none";
    return;
  }
  const lang = getLang();
  const titleEl = document.getElementById("relatedProductsTitle");
  if (titleEl) titleEl.textContent = i18n[lang].relatedProducts;
  relatedProductsSection.style.display = "";

  items.forEach((product) => {
    const pd = getPriceData(product);
    const wished = isWished(product.id);
    const card = document.createElement("a");
    card.className = "related-card";
    card.href = `product.html?id=${encodeURIComponent(product.id)}`;
    card.innerHTML = `
      <div class="related-card-img">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
        <button class="wish-btn${wished ? " active" : ""}" type="button" data-id="${escapeHtml(product.id)}" aria-label="${i18n[lang].addToWishlist}">${heartSvg()}</button>
      </div>
      <div class="related-card-info">
        <div class="related-card-badge">${escapeHtml(product.category)}</div>
        <div class="related-card-name">${escapeHtml(product.name)}</div>
        <div class="related-card-price">${formatPrice(pd.finalPrice)}</div>
      </div>
    `;
    relatedProductsContainer.appendChild(card);
  });

  // Wish button clicks inside related grid
  relatedProductsContainer.querySelectorAll(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      const product = items.find((p) => p.id === id);
      if (!product) return;
      const pd = getPriceData(product);
      const wished = toggleWish({ ...product, finalPrice: pd.finalPrice });
      btn.classList.toggle("active", wished);
      updateWishlistBadge();
    });
  });
}

async function loadRelatedProducts(product) {
  if (!product) return;
  try {
    // First try same category
    const catQuery = query(
      collection(db, "products"),
      where("category", "==", product.category),
      limit(10)
    );
    const catSnap = await getDocs(catQuery);
    let items = [];
    catSnap.forEach((docSnap) => {
      if (docSnap.id !== product.id) items.push(sanitizeProduct(docSnap.id, docSnap.data()));
    });

    // If not enough, fill with random products from any category
    if (items.length < 4) {
      const allQuery = query(collection(db, "products"), limit(20));
      const allSnap = await getDocs(allQuery);
      const extra = [];
      allSnap.forEach((docSnap) => {
        if (docSnap.id !== product.id && !items.find((i) => i.id === docSnap.id)) {
          extra.push(sanitizeProduct(docSnap.id, docSnap.data()));
        }
      });
      // Shuffle extras for variety
      for (let i = extra.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [extra[i], extra[j]] = [extra[j], extra[i]];
      }
      items = [...items, ...extra].slice(0, 4);
    } else {
      items = items.slice(0, 4);
    }

    renderRelatedProducts(items);
  } catch (error) {
    console.error(error);
    if (relatedProductsSection) relatedProductsSection.style.display = "none";
  }
}


async function loadOneProduct() {
  const lang = getLang();
  if (!productId) {
    document.getElementById("productRoot").prepend(Object.assign(document.createElement("p"), { className: "state-box", textContent: i18n[lang].productNotFound }));
    return;
  }
  try {
    const ref = doc(db, "products", productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      document.getElementById("productRoot").prepend(Object.assign(document.createElement("p"), { className: "state-box", textContent: i18n[lang].productNotFound }));
      return;
    }
    const product = sanitizeProduct(snap.id, snap.data());
    openProductDetails(product);
  } catch (e) {
    console.error(e);
    document.getElementById("productRoot").prepend(Object.assign(document.createElement("p"), { className: "state-box", textContent: i18n[lang].loadError }));
  }
}

function addProductToCart(product, color, tailleUSA, tailleEUR) {
  const priceData = getPriceData(product);
  const cart = getCart();
  cart.push({
    cartId: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    productId: product.id,
    name: product.name,
    image: product.image,
    color: color || "-",
    tailleUSA: tailleUSA || "-",
    tailleEUR: tailleEUR || "-",
    unitPrice: priceData.finalPrice,
    qty: 1
  });
  setCart(cart);
}

addToCartBtn.addEventListener("click", () => {
  const lang = getLang();
  if (!currentProduct) return;

  const needColor = currentProduct.colors.length > 0;
  const needUsa = currentProduct.tailleUSA.length > 0;
  const needEur = currentProduct.tailleEUR.length > 0;

  if ((needColor && !selectedColor) || (needUsa && !selectedUsa) || (needEur && !selectedEur)) {
    selectionError.textContent = i18n[lang].needSelections;
    return;
  }
  if (isOutOfStockGlobally(currentProduct)) {
    selectionError.textContent = i18n[lang].productOos;
    return;
  }
  if (selectedUsa && isUsaOos(selectedUsa)) {
    selectionError.textContent = i18n[lang].outOfStock;
    return;
  }
  if (selectedEur && isEurOos(selectedEur)) {
    selectionError.textContent = i18n[lang].outOfStock;
    return;
  }

  addProductToCart(currentProduct, selectedColor, selectedUsa, selectedEur);
  selectionError.textContent = "";
  sessionStorage.setItem("gca_open_cart", "1");
  window.location.href = "produits.html";
});

// Detail page wish button
if (detailWishBtn) {
  detailWishBtn.addEventListener("click", () => {
    if (!currentProduct) return;
    const pd = getPriceData(currentProduct);
    const wished = toggleWish({ ...currentProduct, finalPrice: pd.finalPrice });
    detailWishBtn.classList.toggle("active", wished);
    updateWishlistBadge();
  });
}

// Wishlist drawer events
if (openWishlistBtn) openWishlistBtn.addEventListener("click", openWishlist);
if (closeWishlistBtn) closeWishlistBtn.addEventListener("click", closeWishlist);
if (wishlistDim) wishlistDim.addEventListener("click", closeWishlist);
if (wishlistItems) {
  wishlistItems.addEventListener("click", (e) => {
    const btn = e.target.closest(".wishlist-row-remove");
    if (!btn) return;
    removeFromWishlist(btn.dataset.id);
    updateWishlistBadge();
    renderWishlistDrawer();
    if (currentProduct && btn.dataset.id === currentProduct.id) {
      detailWishBtn && detailWishBtn.classList.remove("active");
    }
    document.querySelectorAll(`.wish-btn[data-id="${btn.dataset.id}"]`).forEach((b) => b.classList.remove("active"));
  });
}

langToggleBtn.addEventListener("click", () => langMenu.classList.toggle("open"));
langMenu.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-lang]");
  if (!btn) return;
  setLang(btn.dataset.lang);
  langMenu.classList.remove("open");
  applyI18n();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".lang-dropdown")) langMenu.classList.remove("open");
});

// Mobile nav lang buttons
document.querySelectorAll(".nav-lang-opt").forEach((btn) => {
  btn.addEventListener("click", () => {
    setLang(btn.dataset.lang);
    menuBtn.classList.remove("open");
    navLinks.classList.remove("open");
    applyI18n();
  });
});

menuBtn.addEventListener("click", () => {
  menuBtn.classList.toggle("open");
  navLinks.classList.toggle("open");
});
navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuBtn.classList.remove("open");
    navLinks.classList.remove("open");
  });
});

document.getElementById("year").textContent = String(new Date().getFullYear());

applyI18n();
updateWishlistBadge();
loadOneProduct();
