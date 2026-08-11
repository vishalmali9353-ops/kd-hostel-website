const fields = ["r_name","r_gender","r_dob","r_mobile","r_email","r_aadhar",
                   "r_course","r_year","r_roll",
                   "r_guardian","r_guardian_mobile","r_address"];

  const headers = ["Full Name","Gender","Date of Birth","Mobile Number","Email","Aadhar/ID Number",
                    "Course/Branch","Year/Semester","Enrollment No",
                    "Parent/Guardian Name","Guardian Mobile Number","Permanent Address"];

  let students = [];

  function registerStudent(){
    const form = document.getElementById('regForm');
    const status = document.getElementById('reg_status');

    if (!form.checkValidity()){
      form.reportValidity();
      return;
    }

    const entry = {};
    fields.forEach(id => entry[id] = document.getElementById(id).value.trim());

    students.push(entry);

    status.innerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Registered successfully!</span>';
    form.reset();
  }

  // ============================================================
  // Download is gated behind a password so only an authorized
  // person can export student data. Note: this check runs in the
  // browser, so it only deters casual access — anyone viewing page
  // source can read the password. Fine for a college project demo,
  // not real security.
  // ============================================================
  const DOWNLOAD_PASSWORD = "KDP@123";

  function checkDownloadPassword(){
    const entered = document.getElementById('downloadPassword').value;
    const status = document.getElementById('dl_pw_status');

    if (entered === DOWNLOAD_PASSWORD){
      document.getElementById('downloadPassword').value = "";
      status.innerHTML = "";
      bootstrap.Modal.getInstance(document.getElementById('downloadPasswordModal')).hide();
      downloadExcel();
    } else {
      status.innerHTML = '<span class="text-danger">Wrong password. Try again.</span>';
    }
  }

  function downloadExcel(){
    if (!students.length){
      alert("No students registered yet.");
      return;
    }

    const data = students.map(s => {
      const row = {};
      fields.forEach((f, i) => row[headers[i]] = s[f]);
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, "student_registrations.xlsx");
  }
