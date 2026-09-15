let deferredPrompt = null;

// Admin Install Logic
export function initAdminPwaInstall(buttonId = "installBtn") {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("../sw.js", { scope: "/" }).catch(() => {});
  }
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.classList.add("hidden");
  if (window.matchMedia("(display-mode: standalone)").matches) return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn.classList.remove("hidden");
  });
  btn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.classList.add("hidden");
  });
  window.addEventListener("appinstalled", () => btn.classList.add("hidden"));
}

// Student Mandatory Install Logic (Screen Lock)
export function initStudentMandatoryInstall(overlayId, installBtnId, appShellId) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { scope: "/" }).catch(() => {});
  }

  const overlay = document.getElementById(overlayId);
  const btn = document.getElementById(installBtnId);
  const appShell = document.getElementById(appShellId);

  // Check if app is opened from home screen (Standalone Mode)
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  
  if (isStandalone) {
     overlay.style.display = "none";
     appShell.style.display = "block";
     return; // App unlocked
  } else {
     overlay.style.display = "flex";
     appShell.style.display = "none"; // App Locked
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn.disabled = false;
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> অ্যাপটি ইনস্টল করুন`;
  });

  btn.addEventListener("click", async () => {
    if (!deferredPrompt) {
       alert("আপনার ব্রাউজারে সরাসরি ইনস্টল সাপোর্ট নেই। দয়া করে ব্রাউজারের মেনু (⋮) থেকে 'Add to Home Screen' বা 'Install App' এ ক্লিক করুন।");
       return;
    }
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") { deferredPrompt = null; }
  });

  window.addEventListener("appinstalled", () => {
     overlay.innerHTML = `
       <div style="background:rgba(255,255,255,0.03); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:40px 24px; text-align:center; max-width:400px; width:100%;">
         <h2 style="color:#10b981; font-size:1.8rem; font-weight:900;">ইনস্টল সফল হয়েছে! 🎉</h2>
         <p style="color:#cbd5e1; margin-top:12px; font-size:1rem; line-height:1.6; font-weight:500;">এবার ব্রাউজারটি কেটে দিন এবং আপনার ফোনের হোমস্ক্রিন থেকে <strong>SubhajitPhysics</strong> অ্যাপটি ওপেন করুন।</p>
       </div>
     `;
  });
  
  // Fallback for browsers that don't fire the install prompt immediately
  setTimeout(() => {
    if(btn.disabled) {
       btn.disabled = false;
       btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> অ্যাপটি ইনস্টল করুন`;
    }
  }, 2500);
}
