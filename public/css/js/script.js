const toggleBtn = document.getElementById("toggleTheme");
const body = document.body;

if (toggleBtn) {
  // Load saved theme on first load
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    body.classList.add("dark-theme");
    toggleBtn.innerHTML = "☀️ <span>Day</span>";
  }

  toggleBtn.addEventListener("click", () => {
    body.classList.toggle("dark-theme");

    if (body.classList.contains("dark-theme")) {
      toggleBtn.innerHTML = "☀️ <span>Day</span>";
      localStorage.setItem("theme", "dark");
    } else {
      toggleBtn.innerHTML = "🌙 <span>Night</span>";
      localStorage.setItem("theme", "light");
    }
  });
}
