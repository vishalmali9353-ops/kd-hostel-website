/* =====================================================================
   K.D. HOSTEL - STUDENT REGISTRATION FORM SCRIPT
   ---------------------------------------------------------------------
   This file handles:
     1) Field-level input restrictions (digits only where needed)
     2) Custom validation rules that plain HTML5 cannot express
        (e.g. "student must be 14+ years old")
     3) Sending the validated form data to a Google Sheet using a
        Google Apps Script Web App (no traditional backend needed)
   ===================================================================== */

// List of every field id that should be collected and sent to the sheet.
const fields = ["r_name","r_gender","r_dob","r_mobile","r_email","r_aadhar",
                 "r_course","r_year","r_roll",
                 "r_guardian","r_guardian_mobile","r_address"];

// ============================================================
// 1) Google Apps Script ko deploy karne ke baad jo Web App URL
//    milega, usse neeche paste karo.
// 2) Setup ke poore steps neeche di gayi guide me hain.
// ============================================================
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwVQAT4jo33fLCvvxwgs99l8KgN-S2QBbTFO1FnCoh93AV8n4a1fBQBCEIIia_opBJzLQ/exec";

// Minimum age (in years) required to register.
const MIN_AGE = 14;

/* ---------------------------------------------------------------------
   restrictToDigits(id, maxLen)
   Attaches an "input" listener to a field so that only numeric
   characters can ever be typed/pasted into it, and caps the length
   at maxLen. Used for mobile numbers, Aadhar number and enrollment
   number so the data saved in the sheet is always clean.
--------------------------------------------------------------------- */
function restrictToDigits(id, maxLen){
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', function(){
    el.value = el.value.replace(/[^0-9]/g, '').slice(0, maxLen);
  });
}

/* ---------------------------------------------------------------------
   markFieldState(el)
   Adds a small visual class once the user leaves a field, so they get
   immediate feedback instead of waiting for the final submit click.
--------------------------------------------------------------------- */
function markFieldState(el){
  if (!el) return;
  el.addEventListener('blur', function(){
    if (el.checkValidity()){
      el.classList.remove('is-invalid');
    } else {
      el.classList.add('is-invalid');
    }
  });
}

/* ---------------------------------------------------------------------
   isAgeValid(dobValue)
   Returns true only if the given date-of-birth string results in an
   age of MIN_AGE years or more as of today. HTML5 <input type="date">
   cannot express a "minimum age" rule on its own, so this custom
   check runs before the form is allowed to submit.
--------------------------------------------------------------------- */
function isAgeValid(dobValue){
  if (!dobValue) return false;
  const dob = new Date(dobValue);
  if (isNaN(dob.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  // If the birthday hasn't occurred yet this year, subtract one year.
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)){
    age--;
  }
  return age >= MIN_AGE;
}

/* ---------------------------------------------------------------------
   Runs once the page has fully loaded:
     - Restrict number-only fields to digits while typing
     - Prevent picking a future date of birth
     - Attach blur-based live validation styling
--------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function(){

  // Digits-only fields with their respective max lengths.
  restrictToDigits('r_mobile', 10);
  restrictToDigits('r_guardian_mobile', 10);
  restrictToDigits('r_aadhar', 12);
  restrictToDigits('r_roll', 12);

  // Prevent picking a DOB in the future via the date picker.
  const dob = document.getElementById('r_dob');
  if (dob){
    const today = new Date();
    const yyyy_mm_dd = today.toISOString().split('T')[0];
    dob.setAttribute('max', yyyy_mm_dd);

    // Re-check age as soon as the user changes the date.
    dob.addEventListener('change', function(){
      dob.setCustomValidity('');
      if (!isAgeValid(dob.value)){
        dob.setCustomValidity('Student must be at least 14 years old.');
      }
    });
  }

  // Attach simple blur validation styling to every tracked field.
  fields.forEach(function(id){
    markFieldState(document.getElementById(id));
  });
});

/* ---------------------------------------------------------------------
   collectFormData()
   Reads every tracked field's current value into a plain object that
   can be sent as JSON to the Google Apps Script Web App.
--------------------------------------------------------------------- */
function collectFormData(){
  const entry = {};
  fields.forEach(function(id){
    const el = document.getElementById(id);
    entry[id] = el ? el.value.trim() : '';
  });
  return entry;
}

/* ---------------------------------------------------------------------
   setStatus(html)
   Small helper to update the status line under the submit button.
--------------------------------------------------------------------- */
function setStatus(html){
  const status = document.getElementById('reg_status');
  if (status) status.innerHTML = html;
}

/* ---------------------------------------------------------------------
   registerStudent()
   Main entry point wired to the "Register Student" button.
     1. Runs the custom age check
     2. Runs the browser's built-in HTML5 validation
     3. If everything passes, POSTs the data to the Google Sheet
--------------------------------------------------------------------- */
function registerStudent(){
  const form = document.getElementById('regForm');
  const btn = document.querySelector('.pay-btn');
  const dobInput = document.getElementById('r_dob');

  // Reset previous custom validity/visual states before re-checking.
  dobInput.setCustomValidity('');
  form.classList.remove('was-validated');

  // Custom age validation (HTML5 alone can't express "14+ years").
  if (!isAgeValid(dobInput.value)){
    dobInput.setCustomValidity('Student must be at least 14 years old.');
  }

  // Run all HTML5 validations (required, pattern, type=email, etc).
  if (!form.checkValidity()){
    form.classList.add('was-validated');
    form.reportValidity();
    return;
  }

  const entry = collectFormData();

  btn.disabled = true;
  setStatus('<span class="text-muted"><i class="bi bi-arrow-repeat"></i> Saving...</span>');

  fetch(SHEET_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids CORS preflight with Apps Script
    body: JSON.stringify(entry)
  })
  .then(function(res){ return res.json(); })
  .then(function(res){
    btn.disabled = false;
    if (res.result === "success"){
      setStatus('<span class="text-success"><i class="bi bi-check-circle-fill"></i> Registered successfully!</span>');
      form.reset();
      form.classList.remove('was-validated');
    } else {
      setStatus('<span class="text-danger">Something went wrong. Please try again.</span>');
    }
  })
  .catch(function(){
    btn.disabled = false;
    setStatus('<span class="text-danger">Could not connect. Check your internet and try again.</span>');
  });
}
