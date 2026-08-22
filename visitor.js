// Simple demo behavior: add a new row to the visitor log on submit (frontend-only, no backend yet)
  document.getElementById('visitorForm').addEventListener('submit', function(e){
    e.preventDefault();
    const tbody = document.getElementById('visitorLog');
    const row = document.createElement('tr');
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    row.innerHTML = `
      <td>${tbody.rows.length + 1}</td>
      <td>${document.getElementById('vName').value}</td>
      <td>${document.getElementById('vStudent').value}</td>
      <td>${document.getElementById('vPurpose').value}</td>
      <td>${time}</td>
      <td><span class="badge badge-in">Checked In</span></td>
    `;
    tbody.appendChild(row);
    this.reset();
  });