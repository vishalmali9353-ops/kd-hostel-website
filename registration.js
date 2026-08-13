const fields = ["r_name","r_gender","r_dob","r_mobile","r_email","r_aadhar",
                 "r_course","r_year","r_roll",
                 "r_guardian","r_guardian_mobile","r_address"];

// ============================================================
// 1) Google Apps Script ko deploy karne ke baad jo Web App URL
//    milega, usse neeche paste karo.
// 2) Setup ke poore steps neeche di gayi guide me hain.
// ============================================================
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwVQAT4jo33fLCvvxwgs99l8KgN-S2QBbTFO1FnCoh93AV8n4a1fBQBCEIIia_opBJzLQ/exec";

function registerStudent(){
  const form = document.getElementById('regForm');
  const status = document.getElementById('reg_status');
  const btn = document.querySelector('.pay-btn');

  if (!form.checkValidity()){
    form.reportValidity();
    return;
  }

  const entry = {};
  fields.forEach(id => entry[id] = document.getElementById(id).value.trim());

  btn.disabled = true;
  status.innerHTML = '<span class="text-muted"><i class="bi bi-arrow-repeat"></i> Saving...</span>';

  fetch(SHEET_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids CORS preflight with Apps Script
    body: JSON.stringify(entry)
  })
  .then(res => res.json())
  .then(res => {
    btn.disabled = false;
    if (res.result === "success"){
      status.innerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Registered successfully!</span>';
      form.reset();
    } else {
      status.innerHTML = '<span class="text-danger">Something went wrong. Please try again.</span>';
    }
  })
  .catch(() => {
    btn.disabled = false;
    status.innerHTML = '<span class="text-danger">Could not connect. Check your internet and try again.</span>';
  });
}
