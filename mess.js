document.getElementById('messForm').addEventListener('submit', function(e){
    e.preventDefault();
    document.getElementById('messThanks').style.display = 'inline';
    this.reset();
  });