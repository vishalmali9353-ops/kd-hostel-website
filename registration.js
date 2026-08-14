/* =============================================================================
   K.D. HOSTEL, PATAN
   STUDENT REGISTRATION FORM SCRIPT
   =============================================================================
   File     : registration.js
   Used by  : registration.html

   Responsibilities of this file:
     1. Restrict number-only fields to digits while typing
        (mobile, guardian mobile, Aadhar, enrollment number).
     2. Enforce validation rules that plain HTML5 attributes cannot
        express on their own, such as "student must be 14+ years old".
     3. Provide small UX helpers: a live character counter for the
        address field, a 3-step progress indicator, and per-field
        blur validation styling.
     4. Build and show a read-only "Review & Confirm" summary modal
        so the student can double check every value before it is
        actually saved.
     5. Submit the final, validated data to a Google Sheet through a
        Google Apps Script Web App - no traditional backend server or
        database is required for this to work.

   Table of contents (search for these headings to jump around):
     [1] CONFIGURATION CONSTANTS
     [2] FIELD DEFINITIONS
     [3] UTILITY / HELPER FUNCTIONS
     [4] PER-FIELD VALIDATION FUNCTIONS
     [5] LIVE UX ENHANCEMENTS (char counter, progress steps)
     [6] REVIEW MODAL LOGIC
     [7] FORM SUBMISSION (Google Sheet integration)
     [8] PAGE INITIALISATION (DOMContentLoaded)
   ============================================================================= */


/* ============================================================
   [1] CONFIGURATION CONSTANTS
   ============================================================ */

// ------------------------------------------------------------
// Google Apps Script ko deploy karne ke baad jo Web App URL
// milega, usse neeche paste karo. Setup ke poore steps
// "google-sheet-setup-guide.md" file me di gayi hain.
// ------------------------------------------------------------
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwVQAT4jo33fLCvvxwgs99l8KgN-S2QBbTFO1FnCoh93AV8n4a1fBQBCEIIia_opBJzLQ/exec";

// Minimum age (in whole years) required to register at the hostel.
const MIN_AGE_YEARS = 14;

// Maximum characters allowed in the permanent address textarea.
// Kept in sync with the maxlength="250" attribute in the HTML.
const ADDRESS_MAX_LENGTH = 250;

// Regex patterns re-used by both the live-typing filters and the
// final validation pass. Keeping them in one place avoids the two
// checks ever drifting apart from each other.
const PATTERNS = {
  mobile:      /^[6-9][0-9]{9}$/,     // 10 digits, starts with 6/7/8/9
  aadhar:      /^[0-9]{12}$/,          // exactly 12 digits
  enrollment:  /^[0-9]{1,12}$/,        // up to 12 digits
  email:       /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};


/* ============================================================
   [2] FIELD DEFINITIONS
   ------------------------------------------------------------
   Central list describing every field that is collected from
   the form. "label" is used when building the review modal
   table so the student sees a friendly name instead of a raw
   element id.
   ============================================================ */
const FIELD_DEFINITIONS = [
  { id: "r_name",            label: "Full Name" },
  { id: "r_gender",          label: "Gender" },
  { id: "r_dob",              label: "Date of Birth" },
  { id: "r_mobile",           label: "Mobile Number" },
  { id: "r_email",            label: "Email" },
  { id: "r_aadhar",           label: "Aadhar / ID Number" },
  { id: "r_course",           label: "Course / Branch" },
  { id: "r_year",             label: "Year / Semester" },
  { id: "r_roll",             label: "Enrollment No" },
  { id: "r_guardian",         label: "Parent / Guardian Name" },
  { id: "r_guardian_mobile",  label: "Guardian Mobile Number" },
  { id: "r_address",          label: "Permanent Address" }
];

// Just the ids, kept for backward compatibility with the simpler
// loops that only need the id (used when posting to the sheet).
const fields = FIELD_DEFINITIONS.map(function(def){ return def.id; });


/* ============================================================
   [3] UTILITY / HELPER FUNCTIONS
   ============================================================ */

/**
 * $(id)
 * Short alias for document.getElementById to keep the rest of
 * this file easier to read.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $(id){
  return document.getElementById(id);
}

/**
 * restrictToDigits(id, maxLen)
 * Attaches an "input" listener to a field so that only numeric
 * characters can ever be typed or pasted into it, and caps the
 * length at maxLen. Used for mobile numbers, Aadhar number and
 * enrollment number so the data saved in the sheet is always
 * clean, without relying on the user to type correctly.
 * @param {string} id      element id of the input field
 * @param {number} maxLen  maximum number of digits allowed
 */
function restrictToDigits(id, maxLen){
  const el = $(id);
  if (!el) return;
  el.addEventListener('input', function(){
    const cleaned = el.value.replace(/[^0-9]/g, '').slice(0, maxLen);
    if (cleaned !== el.value){
      el.value = cleaned;
    }
  });
  // Also strip non-digits from anything pasted in directly.
  el.addEventListener('paste', function(evt){
    const pasted = (evt.clipboardData || window.clipboardData).getData('text');
    if (/[^0-9]/.test(pasted)){
      evt.preventDefault();
      const cleaned = (el.value + pasted).replace(/[^0-9]/g, '').slice(0, maxLen);
      el.value = cleaned;
    }
  });
}

/**
 * debounce(fn, delay)
 * Returns a wrapped version of fn that only actually runs after
 * "delay" milliseconds have passed without being called again.
 * Used to avoid running expensive UI updates on every keystroke.
 * @param {Function} fn
 * @param {number} delay milliseconds
 * @returns {Function}
 */
function debounce(fn, delay){
  let timer = null;
  return function(){
    const args = arguments;
    const ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function(){
      fn.apply(ctx, args);
    }, delay);
  };
}

/**
 * setStatus(html)
 * Updates the small status line shown under the submit button
 * (used for "Saving...", success and error messages).
 * @param {string} html
 */
function setStatus(html){
  const status = $('reg_status');
  if (status) status.innerHTML = html;
}

/**
 * escapeHtml(str)
 * Minimal HTML-escaping helper so that values typed by the
 * student cannot break the markup of the review modal table.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * formatDobForDisplay(dobValue)
 * Converts the raw yyyy-mm-dd value from <input type="date"> into
 * a friendlier dd-mm-yyyy string for the review modal.
 * @param {string} dobValue
 * @returns {string}
 */
function formatDobForDisplay(dobValue){
  if (!dobValue) return '';
  const parts = dobValue.split('-');
  if (parts.length !== 3) return dobValue;
  return parts[2] + '-' + parts[1] + '-' + parts[0];
}


/* ============================================================
   [4] PER-FIELD VALIDATION FUNCTIONS
   ------------------------------------------------------------
   Each function below returns true/false for one specific rule.
   Keeping them separate (instead of one giant if/else block)
   makes it much easier to change a single rule later without
   risking the others, and makes each rule independently
   testable / readable.
   ============================================================ */

/**
 * isAgeValid(dobValue)
 * Returns true only if the given date-of-birth string results in
 * an age of MIN_AGE_YEARS or more as of today. HTML5's
 * <input type="date"> cannot express a "minimum age" rule on its
 * own, so this custom check runs before the form is allowed to
 * submit.
 * @param {string} dobValue value from the date input (yyyy-mm-dd)
 * @returns {boolean}
 */
function isAgeValid(dobValue){
  if (!dobValue) return false;
  const dob = new Date(dobValue);
  if (isNaN(dob.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  // If the birthday hasn't occurred yet this calendar year,
  // the person is actually one year younger than the naive
  // year subtraction above would suggest.
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)){
    age--;
  }
  return age >= MIN_AGE_YEARS;
}

/**
 * isMobileValid(value)
 * @param {string} value
 * @returns {boolean}
 */
function isMobileValid(value){
  return PATTERNS.mobile.test(value);
}

/**
 * isAadharValid(value)
 * @param {string} value
 * @returns {boolean}
 */
function isAadharValid(value){
  return PATTERNS.aadhar.test(value);
}

/**
 * isEnrollmentValid(value)
 * @param {string} value
 * @returns {boolean}
 */
function isEnrollmentValid(value){
  return PATTERNS.enrollment.test(value);
}

/**
 * isEmailValid(value)
 * @param {string} value
 * @returns {boolean}
 */
function isEmailValid(value){
  return PATTERNS.email.test(value);
}

/**
 * isNotEmpty(value)
 * Generic "required" rule shared by simple text fields.
 * @param {string} value
 * @returns {boolean}
 */
function isNotEmpty(value){
  return String(value || '').trim().length > 0;
}

/**
 * markFieldState(el, validatorFn)
 * Adds/removes a small visual "is-invalid" class once the user
 * leaves a field (on blur), so they get immediate feedback
 * instead of waiting for the final submit click. If a custom
 * validatorFn is supplied it is used instead of the browser's
 * built in checkValidity(), which lets fields like the date of
 * birth apply the custom age rule as well.
 * @param {HTMLElement} el
 * @param {Function} [validatorFn] optional custom validity check
 */
function markFieldState(el, validatorFn){
  if (!el) return;
  el.addEventListener('blur', function(){
    const valid = validatorFn ? validatorFn(el.value) : el.checkValidity();
    if (valid){
      el.classList.remove('is-invalid');
    } else {
      el.classList.add('is-invalid');
    }
  });
}


/* ============================================================
   [5] LIVE UX ENHANCEMENTS
   ------------------------------------------------------------
   Small, purely cosmetic/quality-of-life features layered on
   top of the core validation: a live character counter for the
   address box, and a 1-2-3 progress stepper that highlights
   whichever section the student is currently focused on.
   ============================================================ */

/**
 * setupAddressCounter()
 * Keeps the "N/250 characters" hint under the address textarea
 * in sync as the student types.
 */
function setupAddressCounter(){
  const textarea = $('r_address');
  const counter = $('addr_count');
  if (!textarea || !counter) return;

  const update = function(){
    const len = textarea.value.length;
    counter.textContent = String(Math.min(len, ADDRESS_MAX_LENGTH));
  };
  textarea.addEventListener('input', update);
  update();
}

/**
 * setupProgressSteps()
 * Highlights step 1 / 2 / 3 in the progress indicator based on
 * which section title the student most recently focused inside.
 * Each section-title heading in the HTML carries a
 * data-step-target="1|2|3" attribute; every input that belongs
 * to that section is walked to find the nearest preceding
 * heading when it receives focus.
 */
function setupProgressSteps(){
  const steps = document.querySelectorAll('.progress-step');
  if (!steps.length) return;

  const activateStep = function(stepNumber){
    steps.forEach(function(step){
      if (step.getAttribute('data-step') === String(stepNumber)){
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  };

  const sectionHeadings = Array.prototype.slice.call(
    document.querySelectorAll('.section-title[data-step-target]')
  );

  // For every focusable field in the form, figure out which
  // section heading comes immediately before it in the DOM and
  // wire up a focus listener that activates that step.
  const allInputs = document.querySelectorAll('#regForm input, #regForm select, #regForm textarea');
  allInputs.forEach(function(input){
    input.addEventListener('focus', function(){
      let current = input;
      let heading = null;
      while (current && !heading){
        current = current.previousElementSibling || current.parentElement;
        if (current && current.classList && current.classList.contains('section-title')){
          heading = current;
        }
      }
      if (heading){
        activateStep(heading.getAttribute('data-step-target'));
      }
    });
  });
}

/**
 * markSectionComplete(headingEl, isComplete)
 * Adds/removes the little checkmark next to a section heading
 * once every required field inside that section is valid.
 * Reserved for future use / visual polish; safe no-op if the
 * heading element cannot be found.
 * @param {HTMLElement} headingEl
 * @param {boolean} isComplete
 */
function markSectionComplete(headingEl, isComplete){
  if (!headingEl) return;
  if (isComplete){
    headingEl.classList.add('section-complete');
  } else {
    headingEl.classList.remove('section-complete');
  }
}


/* ============================================================
   [6] REVIEW MODAL LOGIC
   ------------------------------------------------------------
   Before the data is actually sent to the Google Sheet, the
   student is shown a read-only summary inside a Bootstrap modal
   so they can catch typos. The modal's "Confirm & Register"
   button calls registerStudent() directly.
   ============================================================ */

/**
 * collectFormData()
 * Reads every tracked field's current value into a plain object
 * that can be sent as JSON to the Google Apps Script Web App.
 * @returns {Object<string,string>}
 */
function collectFormData(){
  const entry = {};
  FIELD_DEFINITIONS.forEach(function(def){
    const el = $(def.id);
    entry[def.id] = el ? el.value.trim() : '';
  });
  return entry;
}

/**
 * buildReviewRows(entry)
 * Turns the collected form data object into the <tr> markup
 * shown inside the review modal's table.
 * @param {Object<string,string>} entry
 * @returns {string} HTML string of table rows
 */
function buildReviewRows(entry){
  let rows = '';
  FIELD_DEFINITIONS.forEach(function(def){
    let displayValue = entry[def.id];
    if (def.id === 'r_dob'){
      displayValue = formatDobForDisplay(displayValue);
    }
    rows += '<tr><th>' + escapeHtml(def.label) + '</th><td>' +
            escapeHtml(displayValue || '-') + '</td></tr>';
  });
  return rows;
}

/**
 * openReviewModal()
 * Wired to the "Review & Register" button. Runs full form
 * validation first (including the custom age + terms checks);
 * only if everything passes does it populate and open the
 * confirmation modal.
 */
function openReviewModal(){
  const form = $('regForm');
  const dobInput = $('r_dob');
  const termsInput = $('r_terms');

  // Reset any previous custom validity messages before re-checking.
  dobInput.setCustomValidity('');
  form.classList.remove('was-validated');

  if (!isAgeValid(dobInput.value)){
    dobInput.setCustomValidity('Student must be at least 14 years old.');
  }

  if (!form.checkValidity()){
    form.classList.add('was-validated');
    form.reportValidity();
    FormStats.validationFailures++;
    scrollToFirstInvalidField();
    return;
  }

  if (!termsInput.checked){
    termsInput.classList.add('is-invalid');
    termsInput.focus();
    FormStats.validationFailures++;
    return;
  }

  FormStats.reviewOpens++;

  const entry = collectFormData();
  const tbody = $('reviewTableBody');
  if (tbody){
    tbody.innerHTML = buildReviewRows(entry);
  }

  const modalEl = $('reviewModal');
  if (modalEl && window.bootstrap){
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

/**
 * closeReviewModal()
 * Small helper to programmatically hide the review modal after
 * a successful submission, so the student sees the success
 * message on the page underneath rather than staying on the
 * summary screen.
 */
function closeReviewModal(){
  const modalEl = $('reviewModal');
  if (modalEl && window.bootstrap){
    const modal = window.bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }
}


/* ============================================================
   [7] FORM SUBMISSION (Google Sheet integration)
   ============================================================ */

/**
 * registerStudent()
 * Final submit handler, called from the review modal's
 * "Confirm & Register" button. Re-collects the (already
 * validated) form data and POSTs it to the Google Apps Script
 * Web App, which appends a new row to the linked Google Sheet.
 */
function registerStudent(){
  const form = $('regForm');
  const btn = document.querySelector('.pay-btn');
  const entry = collectFormData();

  if (btn){
    btn.disabled = true;
    btn.classList.add('is-loading');
  }
  FormStats.submissionAttempts++;
  setStatus('<span class="text-muted"><i class="bi bi-arrow-repeat"></i> Saving...</span>');
  announcePolitely('Saving your registration, please wait.');

  fetch(SHEET_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids CORS preflight with Apps Script
    body: JSON.stringify(entry)
  })
  .then(function(res){ return res.json(); })
  .then(function(res){
    if (btn){
      btn.disabled = false;
      btn.classList.remove('is-loading');
    }
    if (res.result === "success"){
      FormStats.submissionSuccesses++;
      setStatus('<span class="text-success"><i class="bi bi-check-circle-fill"></i> Registered successfully!</span>');
      announcePolitely('Registration successful.');
      closeReviewModal();
      form.reset();
      form.classList.remove('was-validated');
      const counter = $('addr_count');
      if (counter) counter.textContent = '0';
      logFormStats();
    } else {
      setStatus('<span class="text-danger">Something went wrong. Please try again.</span>');
      announcePolitely('Something went wrong while saving your registration.');
    }
  })
  .catch(function(){
    if (btn){
      btn.disabled = false;
      btn.classList.remove('is-loading');
    }
    setStatus('<span class="text-danger">Could not connect. Check your internet and try again.</span>');
    announcePolitely('Could not connect to the server.');
  });
}


/* ============================================================
   [8] PAGE INITIALISATION
   ------------------------------------------------------------
   Runs once the page has fully loaded: wires up digit
   restrictions, the date-of-birth max date, per-field blur
   validation styling, the address character counter and the
   progress step highlighting.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function(){

  // ---- Digits-only fields with their respective max lengths ----
  restrictToDigits('r_mobile', 10);
  restrictToDigits('r_guardian_mobile', 10);
  restrictToDigits('r_aadhar', 12);
  restrictToDigits('r_roll', 12);

  // ---- Prevent picking a DOB in the future via the date picker ----
  const dob = $('r_dob');
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

  // ---- Terms checkbox: clear the invalid flag as soon as ticked ----
  const terms = $('r_terms');
  if (terms){
    terms.addEventListener('change', function(){
      if (terms.checked){
        terms.classList.remove('is-invalid');
      }
    });
  }

  // ---- Attach blur validation styling to every tracked field ----
  markFieldState($('r_name'), isNotEmpty);
  markFieldState($('r_mobile'), isMobileValid);
  markFieldState($('r_email'), isEmailValid);
  markFieldState($('r_aadhar'), isAadharValid);
  markFieldState($('r_roll'), isEnrollmentValid);
  markFieldState($('r_guardian'), isNotEmpty);
  markFieldState($('r_guardian_mobile'), isMobileValid);
  markFieldState($('r_address'), isNotEmpty);
  markFieldState($('r_course'));
  markFieldState($('r_year'));
  markFieldState($('r_dob'), function(){ return isAgeValid(dob.value); });

  // ---- Small UX enhancements ----
  setupAddressCounter();
  setupProgressSteps();
  setupUnloadWarning();
  setupNameCapitalisation();
  setupEnterKeyNavigation();
});


/* =============================================================================
   [9] EXTRA UX SAFEGUARDS
   -------------------------------------------------------------------------
   Small additional touches that make the form more forgiving to use,
   without changing any of the core validation rules defined above.
   ============================================================================= */

/**
 * hasUnsavedChanges()
 * Returns true if the student has typed anything into the form at all.
 * Used to warn them before they accidentally navigate away.
 * @returns {boolean}
 */
function hasUnsavedChanges(){
  return FIELD_DEFINITIONS.some(function(def){
    const el = $(def.id);
    return el && el.value && el.value.trim().length > 0;
  });
}

/**
 * scrollToFirstInvalidField()
 * When the browser's native validation blocks submission, this
 * smoothly scrolls the page so the very first invalid field is
 * brought into view, instead of leaving the student to hunt for
 * whichever field is missing on a long form.
 */
function scrollToFirstInvalidField(){
  const form = $('regForm');
  if (!form) return;
  const invalidEl = form.querySelector(':invalid');
  if (invalidEl && invalidEl.scrollIntoView){
    invalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    invalidEl.focus({ preventScroll: true });
  }
}

/**
 * setupUnloadWarning()
 * Shows the browser's default "leave site?" confirmation if the
 * student tries to close the tab or navigate away while they
 * still have unsaved data in the registration form.
 */
function setupUnloadWarning(){
  window.addEventListener('beforeunload', function(evt){
    if (hasUnsavedChanges()){
      evt.preventDefault();
      // Modern browsers ignore custom text and show their own
      // generic message, but returnValue must still be set.
      evt.returnValue = '';
    }
  });
}

/**
 * setupNameCapitalisation()
 * Purely cosmetic helper: capitalises the first letter of each
 * word in the Full Name and Guardian Name fields once the
 * student leaves the field, e.g. "ravi patel" -> "Ravi Patel".
 * This never changes what the student typed while they are still
 * actively typing - it only runs on blur.
 */
function setupNameCapitalisation(){
  ['r_name', 'r_guardian'].forEach(function(id){
    const el = $(id);
    if (!el) return;
    el.addEventListener('blur', function(){
      const words = el.value.trim().split(/\s+/);
      const capitalised = words.map(function(word){
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');
      el.value = capitalised;
    });
  });
}

/**
 * setupEnterKeyNavigation()
 * Lets the student press "Enter" inside a text field to move to
 * the next field instead of accidentally submitting the form,
 * which is friendlier on mobile keyboards.
 */
function setupEnterKeyNavigation(){
  const form = $('regForm');
  if (!form) return;
  const focusable = Array.prototype.slice.call(
    form.querySelectorAll('input, select, textarea')
  );
  focusable.forEach(function(el, index){
    if (el.tagName === 'TEXTAREA') return; // allow real newlines in address
    el.addEventListener('keydown', function(evt){
      if (evt.key === 'Enter'){
        evt.preventDefault();
        const next = focusable[index + 1];
        if (next){
          next.focus();
        } else {
          openReviewModal();
        }
      }
    });
  });
}


/* =============================================================================
   [10] FIELD-LEVEL ERROR MESSAGE LOOKUP
   -------------------------------------------------------------------------
   Maps each field id to a short, friendly explanation of what is
   expected. Not currently displayed anywhere by default (the static
   .invalid-feedback text in the HTML already covers this), but kept
   as a single source of truth in case a future dynamic tooltip or
   help-bubble feature wants to reuse the exact same wording.
   ============================================================================= */
const FIELD_HELP_TEXT = {
  r_name:            "Enter the student's full name exactly as it appears on their ID.",
  r_gender:          "Select the student's gender.",
  r_dob:             "Student must be at least " + MIN_AGE_YEARS + " years old.",
  r_mobile:          "10 digit number, must start with 6, 7, 8 or 9.",
  r_email:           "A valid email address, e.g. name@example.com.",
  r_aadhar:          "Exactly 12 digits, numbers only.",
  r_course:          "Choose the branch the student is currently enrolled in.",
  r_year:            "Choose the current semester.",
  r_roll:            "Up to 12 digits, numbers only.",
  r_guardian:        "Full name of the parent or guardian.",
  r_guardian_mobile: "10 digit number, must start with 6, 7, 8 or 9.",
  r_address:         "Permanent home address, up to " + ADDRESS_MAX_LENGTH + " characters."
};

/**
 * getHelpText(fieldId)
 * @param {string} fieldId
 * @returns {string}
 */
function getHelpText(fieldId){
  return FIELD_HELP_TEXT[fieldId] || '';
}


/* =============================================================================
   [11] SIMPLE FORM ANALYTICS (LOCAL ONLY, IN-MEMORY)
   -------------------------------------------------------------------------
   Lightweight, privacy-friendly counters kept purely in memory for
   the current page view (nothing is written to disk, a server, or
   any storage that would persist after the tab is closed). Useful
   during development to see how many times validation failed before
   a successful submission, printed to the console only.
   ============================================================================= */
const FormStats = {
  validationFailures: 0,
  reviewOpens: 0,
  submissionAttempts: 0,
  submissionSuccesses: 0
};

/**
 * logFormStats()
 * Prints the current in-memory stats object to the console.
 * Harmless no-op from the user's point of view; purely a
 * developer convenience while testing the form.
 */
function logFormStats(){
  if (window.console && console.table){
    console.table(FormStats);
  }
}


/* =============================================================================
   [12] ACCESSIBILITY HELPERS
   -------------------------------------------------------------------------
   Small additions that make the form easier to use with a screen
   reader or keyboard-only navigation, on top of the semantic HTML
   already in place (labels, required attributes, etc).
   ============================================================================= */

/**
 * announcePolitely(message)
 * Writes a message into a visually hidden "aria-live" region so
 * that screen readers announce status changes (like "Saving..."
 * or "Registered successfully!") without needing the user to
 * move focus manually.
 * @param {string} message
 */
function announcePolitely(message){
  let liveRegion = $('sr_live_region');
  if (!liveRegion){
    liveRegion = document.createElement('div');
    liveRegion.id = 'sr_live_region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'visually-hidden-but-focusable';
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = message;
}


/* =============================================================================
   [13] VALIDATOR DISPATCH TABLE
   -------------------------------------------------------------------------
   Maps each field id to its corresponding validator function defined
   in section [4]. This lets other parts of the script (like a future
   "validate everything and show a full error summary" feature) look
   up the correct check for any field id without a long if/else chain.
   ============================================================================= */
const FIELD_VALIDATORS = {
  r_name:             isNotEmpty,
  r_gender:            function(v){ return isNotEmpty(v); },
  r_dob:               function(v){ return isAgeValid(v); },
  r_mobile:            isMobileValid,
  r_email:             isEmailValid,
  r_aadhar:            isAadharValid,
  r_course:            isNotEmpty,
  r_year:              isNotEmpty,
  r_roll:              isEnrollmentValid,
  r_guardian:          isNotEmpty,
  r_guardian_mobile:   isMobileValid,
  r_address:           isNotEmpty
};

/**
 * validateSingleField(fieldId)
 * Looks up and runs the correct validator for one specific field,
 * based on its current value in the DOM.
 * @param {string} fieldId
 * @returns {boolean}
 */
function validateSingleField(fieldId){
  const el = $(fieldId);
  const validator = FIELD_VALIDATORS[fieldId];
  if (!el || !validator) return true;
  return validator(el.value);
}

/**
 * validateAllFields()
 * Runs every registered validator and returns a list of field ids
 * that currently fail their rule. An empty array means the form is
 * fully valid. This mirrors what form.checkValidity() already does
 * for the browser-native rules, but also folds in the custom age
 * check so callers only need one function to ask "is everything OK?".
 * @returns {string[]} array of invalid field ids
 */
function validateAllFields(){
  const invalidFields = [];
  Object.keys(FIELD_VALIDATORS).forEach(function(fieldId){
    if (!validateSingleField(fieldId)){
      invalidFields.push(fieldId);
    }
  });
  return invalidFields;
}

/**
 * resetFormStats()
 * Clears the in-memory FormStats counters back to zero. Not called
 * automatically anywhere; available for manual use during testing
 * from the browser console (e.g. resetFormStats()).
 */
function resetFormStats(){
  FormStats.validationFailures = 0;
  FormStats.reviewOpens = 0;
  FormStats.submissionAttempts = 0;
  FormStats.submissionSuccesses = 0;
}


/* =============================================================================
   [14] MANUAL QA CHECKLIST (COMMENT-ONLY)
   -------------------------------------------------------------------------
   Quick checklist used while testing this form manually before it
   goes live. Kept here so future edits can be re-verified against
   the same list.

     [ ] Full Name         - required, cannot be left blank
     [ ] Gender             - defaults to Male, always has a value
     [ ] Date of Birth      - cannot pick a future date
     [ ] Date of Birth      - blocks submission if age < 14 years
     [ ] Mobile Number      - only digits can be typed
     [ ] Mobile Number      - exactly 10 digits, starts with 6/7/8/9
     [ ] Email               - must contain "@" and a domain
     [ ] Aadhar Number       - only digits can be typed
     [ ] Aadhar Number       - exactly 12 digits
     [ ] Course / Branch     - must pick one of the four options
     [ ] Year / Semester     - must pick one of 1st through 6th
     [ ] Enrollment No       - only digits can be typed
     [ ] Enrollment No       - up to 12 digits
     [ ] Guardian Name       - required, cannot be left blank
     [ ] Guardian Mobile     - same rules as student mobile
     [ ] Address              - required, counter updates live
     [ ] Terms checkbox      - must be ticked before review modal opens
     [ ] Review modal         - shows every field with friendly labels
     [ ] Review modal         - "Edit" closes modal without submitting
     [ ] Confirm & Register  - disables button while saving
     [ ] Confirm & Register  - shows success message and resets form
     [ ] Confirm & Register  - shows error message if network fails
   ============================================================================= */


/* =============================================================================
   [15] VERSION HISTORY (COMMENT-ONLY)
   -------------------------------------------------------------------------
   v1.0  - Initial static form with client-side download to Excel.
   v1.1  - Removed local download/password-gated export; data now
           saved directly to a Google Sheet via a Google Apps Script
           Web App, removing the need for any backend server.
   v1.2  - Added age restriction (14+ years), stricter mobile number
           pattern (10 digits, starts with 6-9), numeric-only Aadhar
           field (12 digits), branch and semester dropdowns, and an
           11 digit limit on the enrollment number field (later
           updated to 12 digits).
   v1.3  - Restructured into three separate files (HTML / CSS / JS)
           for easier maintenance, and expanded with a guidelines
           accordion, a 3-step progress indicator, a terms and
           conditions checkbox, and a review-before-submit
           confirmation modal, along with a larger shared utility
           class library in the stylesheet.
   ============================================================================= */


/* =============================================================================
   [16] BROWSER COMPATIBILITY NOTES (COMMENT-ONLY)
   -------------------------------------------------------------------------
   This script intentionally avoids modern syntax that would need a
   build step (no ES modules, no optional chaining, no arrow-function
   "this" binding tricks) so that it can be dropped straight into a
   plain <script src="registration.js"></script> tag and work in every
   evergreen browser (Chrome, Edge, Firefox, Safari) without a bundler.

   Features relied upon and their support level:
     - fetch()                : supported in all modern browsers
     - Array.prototype.some   : supported everywhere fetch() is
     - Bootstrap 5 JS bundle  : required for the accordion + modal
     - CSS custom properties  : required for the color variables in
                                 registration.css (:root { --navy: ... })

   If this form ever needs to support Internet Explorer 11, the
   fetch() call in registerStudent() would need a polyfill or would
   need to be swapped for an XMLHttpRequest-based version instead.
   ============================================================================= */
