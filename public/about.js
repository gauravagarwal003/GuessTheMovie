migrateLocalStorage();

// Open Google Form in new tab
function openContactForm() {
  window.open('https://docs.google.com/forms/d/e/1FAIpQLSf1QkFlmLqevhyPgnqCRA-nj3yLsb0lQxgA_BGFtxbZySnNVA/viewform', '_blank');
}

// Auto-open Google Form if URL contains #openModal (for backward compatibility)
window.addEventListener("DOMContentLoaded", () => {
  if (window.location.hash === "#openModal") {
    openContactForm();
    // Clean up the URL
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
});
