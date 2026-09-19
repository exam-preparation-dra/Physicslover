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

  let promptFired = false;

  // ব্রাউজার যখন ইনস্টল করার জন্য রেডি হবে
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    promptFired = true;
    btn.disabled = false;
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> অ্যাপটি ইনস্টল করুন`;
  });

  // বাটনে ক্লিক করার পর
  btn.addEventListener("click", async () => {
    if (!deferredPrompt) {
       alert("আপনার ব্রাউজারে অটোমেটিক ইনস্টল সাপোর্ট নেই। দয়া করে ব্রাউজারের মেনু (⋮) থেকে 'Add to Home Screen' বা 'Install App'-এ ক্লিক করুন। iPhone ব্যবহারকারীরা Safari-এর Share বাটন থেকে 'Add to Home Screen' করুন।");
       return;
    }
    
    // ইনস্টলের পপ-আপ দেখানো
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === "accepted") { 
        // স্টুডেন্ট Accept করলে বাটন লক করে 'লোডিং' দেখানো হবে
        deferredPrompt = null; 
        btn.disabled = true;
        
        let timeLeft = 30; // 30 seconds timer
        
        const updateTimer = () => {
            btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2.5px;margin-right:8px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></div> ইনস্টল হচ্ছে... (${timeLeft}s)`;
            timeLeft--;
            if (timeLeft >= 0) {
                 setTimeout(updateTimer, 1000);
            }
        };
        updateTimer();
    }
  });

  // ফোন যখন পুরোপুরি অ্যাপটি ব্যাকগ্রাউন্ডে ইনস্টল শেষ করবে, শুধু তখনই এই মেসেজ আসবে
  window.addEventListener("appinstalled", () => {
     overlay.innerHTML = `
       <div class="install-card">
         <div class="app-icon-placeholder" style="margin: 0 auto 20px;">
           <img src="./icon-192.png?v=2" alt="App Icon" style="width:100%; height:100%; border-radius:22px; object-fit:cover;" onerror="this.style.display='none'">
         </div>
         <h2 class="install-title">Physics Lover 2.0</h2>
         <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:16px; padding:24px; margin-top:20px;">
           <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
           <p style="color:var(--text-primary); font-size:1.1rem; font-weight:900; line-height:1.5;">অ্যাপটি ফোনে ইনস্টল হয়ে গেছে!</p>
           <p style="color:var(--text-secondary); margin-top:10px; font-size:0.95rem; font-weight:600;">দয়া করে এই ব্রাউজারটি কেটে দিন এবং আপনার ফোনের হোমস্ক্রিন থেকে অ্যাপটি খুলুন।</p>
         </div>
       </div>
     `;
  });
  
  // Fallback: যদি ৩ সেকেন্ডের মধ্যে ব্রাউজার ইনস্টলের পারমিশন না দেয় (iOS বা অন্য কারণে)
  setTimeout(() => {
    if(!promptFired) {
       btn.disabled = false;
       btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> ম্যানুয়ালি ইনস্টল করুন`;
    }
  }, 3000);
}
