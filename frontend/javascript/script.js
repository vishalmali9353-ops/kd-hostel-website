
document.addEventListener("DOMContentLoaded", function () {
  // Automatically update the copyright year
  const yearElement = document.getElementById("currentYear");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Close mobile navigation after choosing a page
  const navMenu = document.getElementById("mainNav");

  if (navMenu && typeof bootstrap !== "undefined") {
    navMenu.querySelectorAll(".nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        if (
          window.innerWidth < 992 &&
          navMenu.classList.contains("show")
        ) {
          bootstrap.Collapse
            .getOrCreateInstance(navMenu)
            .hide();
        }
      });
    });
  }
});
