// Global değişkenler ve elementler
const btnStartApp = document.getElementById("btnStartApp");
const welcomeDiv = document.getElementById("welcome");
const mainAppDiv = document.getElementById("mainApp");

const textInput = document.getElementById("textInput");
const darkColorInput = document.getElementById("darkColor");
const lightColorInput = document.getElementById("lightColor");
const darkColorPreview = null; // (isteğe bağlı)
const lightColorPreview = null; // (isteğe bağlı)
const randomColorsBtn = document.getElementById("randomColorsBtn");
const qrSizeRange = document.getElementById("qrSizeRange");
const qrSizeLabel = document.getElementById("qrSizeLabel");
const logoInput = document.getElementById("logoInput");
const logoOpacityInput = document.getElementById("logoOpacity");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const saveFavBtn = document.getElementById("saveFavBtn");
const downloadBtn = document.getElementById("downloadBtn");
const autoCopyToggle = document.getElementById("autoCopyToggle");
const canvas = document.getElementById("qrCanvas");
const ctx = canvas.getContext("2d");

const fileInput = document.getElementById("fileInput");
const filePreview = document.getElementById("filePreview");
const generateFileLinkBtn = document.getElementById("generateFileLinkBtn");
const uploadStatus = document.getElementById("uploadStatus");

const favoritesList = document.getElementById("favoritesList");
const favSearchInput = document.getElementById("favSearchInput");
const clearFavsBtn = document.getElementById("clearFavsBtn");

const video = document.getElementById("video");
const videoCanvas = document.getElementById("videoCanvas");
const videoCtx = videoCanvas.getContext("2d");
const scanResult = document.getElementById("scanResult");
const startCameraBtn = document.getElementById("startCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");
const copyScanBtn = document.getElementById("copyScanBtn");
const capturePhotoBtn = document.getElementById("capturePhotoBtn");
const cameraPhotos = document.getElementById("cameraPhotos");

let lastQRData = "";
let videoStream = null;
let scanInterval = null;
let scanHistory = [];
let cameraPhotosData = [];

//////////////////////////
// Başlangıç ve Tema Ayarı
//////////////////////////

btnStartApp.addEventListener("click", () => {
  welcomeDiv.style.display = "none";
  mainAppDiv.style.display = "block";
});

function applyTheme(theme) {
  if(theme === "dark") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}

const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

document.getElementById("toggleThemeBtn").addEventListener("click", () => {
  const newTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("theme", newTheme);
});

////////////////////
// Renk Güncelleme
////////////////////

function randomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,"0");
}

randomColorsBtn.addEventListener("click", () => {
  darkColorInput.value = randomColor();
  lightColorInput.value = randomColor();
  qrSizeLabel.textContent = qrSizeRange.value;
});

qrSizeRange.addEventListener("input", () => {
  qrSizeLabel.textContent = qrSizeRange.value;
});

//////////////////////////
// QR Kod Oluşturma Fonksiyonu
//////////////////////////

async function generateQR(text, darkColor, lightColor, logoFile, size, logoOpacity=1) {
  canvas.width = size;
  canvas.height = size;

  await QRCode.toCanvas(canvas, text, {
    margin: 1,
    width: size,
    color: { dark: darkColor, light: lightColor }
  });

  if (logoFile) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          const logoSize = size * 0.22;
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          ctx.globalAlpha = logoOpacity;
          ctx.drawImage(img, x, y, logoSize, logoSize);
          ctx.globalAlpha = 1;
          resolve();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(logoFile);
    });
  }
}

//////////////////////////
// Metin Girişi ve Butonlar
//////////////////////////

textInput.addEventListener("input", () => {
  if(textInput.value.trim() === "") {
    clearCanvas();
    saveFavBtn.disabled = true;
    downloadBtn.disabled = true;
    lastQRData = "";
  } else {
    generateBtn.click();
  }
});

generateBtn.addEventListener("click", async () => {
  const text = textInput.value.trim();
  if (!text) return alert("Lütfen metin veya bağlantı girin.");

  await generateQR(text, darkColorInput.value, lightColorInput.value, logoInput.files[0] || null, +qrSizeRange.value, +logoOpacityInput.value);
  lastQRData = text;
  saveFavBtn.disabled = false;
  downloadBtn.disabled = false;

  if(autoCopyToggle.checked){
    try {
      await navigator.clipboard.writeText(text);
      alert("QR metni kopyalandı!");
    } catch {
      alert("Kopyalama başarısız.");
    }
  }
});

clearBtn.addEventListener("click", () => {
  textInput.value = "";
  clearCanvas();
  saveFavBtn.disabled = true;
  downloadBtn.disabled = true;
  lastQRData = "";
  filePreview.innerHTML = "";
  generateFileLinkBtn.disabled = true;
  uploadStatus.textContent = "";
});

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "qr-code.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

//////////////////////
// Favori Yönetimi
//////////////////////

function loadFavorites() {
  const favs = JSON.parse(localStorage.getItem("qrFavorites") || "[]");
  return favs;
}

function saveFavorites(favs) {
  localStorage.setItem("qrFavorites", JSON.stringify(favs));
}

function renderFavorites(filterText="") {
  const favs = loadFavorites();
  favoritesList.innerHTML = "";
  const filtered = favs.filter(f => f.text.toLowerCase().includes(filterText.toLowerCase()));
  if(filtered.length === 0){
    favoritesList.innerHTML = "<li>Favori yok.</li>";
    return;
  }
  filtered.forEach((fav, i) => {
    const li = document.createElement("li");
    li.classList.add("fav-item-text");
    li.title = fav.text;
    li.textContent = fav.text.length > 40 ? fav.text.slice(0, 37) + "..." : fav.text;

    const delBtn = document.createElement("button");
    delBtn.textContent = "Sil";
    delBtn.className = "fav-delete-btn";
    delBtn.addEventListener("click", e => {
      e.stopPropagation();
      const favs = loadFavorites();
      favs.splice(i,1);
      saveFavorites(favs);
      renderFavorites(favSearchInput.value);
    });

    li.appendChild(delBtn);
    li.addEventListener("click", () => {
      textInput.value = fav.text;
      generateBtn.click();
    });

    favoritesList.appendChild(li);
  });
}

saveFavBtn.addEventListener("click", () => {
  const favs = loadFavorites();
  if(!favs.find(f => f.text === lastQRData)){
    favs.push({text: lastQRData, date: new Date().toISOString()});
    saveFavorites(favs);
    renderFavorites();
    alert("Favorilere eklendi!");
  } else {
    alert("Bu metin zaten favorilerde.");
  }
});

favSearchInput.addEventListener("input", () => {
  renderFavorites(favSearchInput.value);
});

clearFavsBtn.addEventListener("click", () => {
  if(confirm("Favorileri silmek istediğine emin misin?")){
    localStorage.removeItem("qrFavorites");
    renderFavorites();
  }
});

renderFavorites();

///////////////////////////////
// Dosya Yükleme & QR Oluşturma
///////////////////////////////

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if(!file) return;

  const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
  if(!allowedTypes.includes(file.type)){
    alert("Sadece PNG, JPG veya PDF dosyası yükleyebilirsiniz.");
    fileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    if(file.type.startsWith("image/")){
      filePreview.innerHTML = `<img src="${e.target.result}" alt="Yüklenen Dosya Önizlemesi" />`;
    } else if(file.type === "application/pdf"){
      filePreview.innerHTML = `<embed src="${e.target.result}" width="100%" height="200px" type="application/pdf" />`;
    }
    generateFileLinkBtn.disabled = false;
    uploadStatus.textContent = "";
  };
  reader.readAsDataURL(file);
});

generateFileLinkBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if(!file) return;

  // Burada gerçek bir upload API'si olmadığı için base64 kullanıyoruz
  const reader = new FileReader();
  reader.onload = async e => {
    const base64Data = e.target.result;

    textInput.value = base64Data;
    generateBtn.click();

    uploadStatus.textContent = "Dosya QR kodu oluşturuldu.";
  };
  reader.readAsDataURL(file);
});

///////////////////////////
// Kamera & QR Tarama İşlemleri
///////////////////////////

startCameraBtn.addEventListener("click", async () => {
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = videoStream;
      video.setAttribute("playsinline", true);
      startCameraBtn.disabled = true;
      stopCameraBtn.disabled = false;
      capturePhotoBtn.disabled = false;
      scanResult.textContent = "Kamera aktif, QR kodu gösterin.";
      scanInterval = setInterval(scanQRCodeFromVideo, 500);
    } catch (err){
      alert("Kamera açılamadı: " + err.message);
    }
  } else {
    alert("Tarayıcı kamera erişimini desteklemiyor.");
  }
});

stopCameraBtn.addEventListener("click", () => {
  if(videoStream){
    videoStream.getTracks().forEach(track => track.stop());
  }
  video.srcObject = null;
  startCameraBtn.disabled = false;
  stopCameraBtn.disabled = true;
  capturePhotoBtn.disabled = true;
  scanResult.textContent = "Kamera kapalı";
  clearInterval(scanInterval);
});

function scanQRCodeFromVideo() {
  if(video.readyState === video.HAVE_ENOUGH_DATA){
    videoCanvas.width = video.videoWidth;
    videoCanvas.height = video.videoHeight;
    videoCtx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
    const imageData = videoCtx.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });

    if(code){
      scanResult.textContent = "Bulundu: " + code.data;
      lastQRData = code.data;
      copyScanBtn.disabled = false;
      addScanHistory(code.data);
    }
  }
}

copyScanBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(lastQRData);
    alert("Tarama sonucu kopyalandı!");
  } catch {
    alert("Kopyalama başarısız.");
  }
});

capturePhotoBtn.addEventListener("click", () => {
  if(!videoStream) return;

  const photoCanvas = document.createElement("canvas");
  const photoCtx = photoCanvas.getContext("2d");
  photoCanvas.width = video.videoWidth;
  photoCanvas.height = video.videoHeight;
  photoCtx.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);

  const imgDataUrl = photoCanvas.toDataURL("image/png");
  const img = document.createElement("img");
  img.src = imgDataUrl;
  cameraPhotos.appendChild(img);

  // Kamera fotoğrafı geçmişine ekle
  cameraPhotosData.push({
    id: Date.now(),
    dataUrl: imgDataUrl,
    timestamp: new Date().toISOString()
  });

  // Fotoğrafı localStorage’da sakla
  localStorage.setItem("cameraPhotosData", JSON.stringify(cameraPhotosData));
});

function loadCameraPhotos() {
  const saved = localStorage.getItem("cameraPhotosData");
  if(saved){
    cameraPhotosData = JSON.parse(saved);
    cameraPhotosData.forEach(photo => {
      const img = document.createElement("img");
      img.src = photo.dataUrl;
      cameraPhotos.appendChild(img);
    });
  }
}

loadCameraPhotos();

/////////////////////////
// Tarama Geçmişi Yönetimi
/////////////////////////

function loadScanHistory() {
  const hist = JSON.parse(localStorage.getItem("scanHistory") || "[]");
  return hist;
}

function saveScanHistory(hist) {
  localStorage.setItem("scanHistory", JSON.stringify(hist));
}

function addScanHistory(text) {
  let hist = loadScanHistory();
  if(hist.length > 99) hist.shift();
  if(!hist.find(h => h.text === text)){
    hist.push({text: text, date: new Date().toISOString()});
    saveScanHistory(hist);
    renderScanHistory();
  }
}

function renderScanHistory() {
  const hist = loadScanHistory();
  const list = document.getElementById("scanHistoryList");
  list.innerHTML = "";
  if(hist.length === 0){
    list.innerHTML = "<li>Tarama geçmişi boş.</li>";
    return;
  }
  hist.slice().reverse().forEach((item,i) => {
    const li = document.createElement("li");
    li.textContent = `${item.text} (${new Date(item.date).toLocaleString()})`;
    list.appendChild(li);
  });
}

renderScanHistory();

