document.addEventListener("DOMContentLoaded", function () {
  // Automatically update the footer year
  const yearElement = document.getElementById("currentYear");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Close the mobile navigation after clicking a section link
  const navMenu = document.getElementById("mainNav");

  if (navMenu && typeof bootstrap !== "undefined") {
    navMenu.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth < 992 && navMenu.classList.contains("show")) {
          bootstrap.Collapse.getOrCreateInstance(navMenu).hide();
        }
      });
    });
  }
});
