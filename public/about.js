migrateLocalStorage();
function displayContactForm() {
  const modalContentDiv = document.getElementById('modalContent');
  
  modalContentDiv.innerHTML = `
    <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSf1QkFlmLqevhyPgnqCRA-nj3yLsb0lQxgA_BGFtxbZySnNVA/viewform?embedded=true" 
      width="640" height="915" frameborder="0" marginheight="0" marginwidth="0">
      Loading…
    </iframe>
  `;

  const modal = document.getElementById('Modal');
  modal.style.display = "block";

  // Remove the #openModal from the URL after opening
  if (window.location.hash === "#openModal") {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  // Close modal when "x" is clicked
  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
  };

  // Close modal when clicking outside
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}

// Auto-open if URL contains #openModal
window.addEventListener("DOMContentLoaded", () => {
  if (window.location.hash === "#openModal") {
    displayContactForm();
  }
});
