/* =========================================================
   Contact / Enquiry form -> opens WhatsApp with the message
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("enquiryForm");
  if(!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("encName");
    const mobile = document.getElementById("encMobile");
    const message = document.getElementById("encMessage");

    let ok = true;
    ok = validateField(name, name.value.trim().length > 1) && ok;
    ok = validateField(mobile, /^\d{10}$/.test(mobile.value.trim())) && ok;
    ok = validateField(message, message.value.trim().length > 0) && ok;

    if(!ok){
      showToast("Please fill all fields correctly.");
      return;
    }

    const text = `New Enquiry\nName: ${name.value.trim()}\nMobile: ${mobile.value.trim()}\nMessage: ${message.value.trim()}`;
    window.open(`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");

    showToast("Opening WhatsApp to send your enquiry… 🎉");
    form.reset();
  });
});
