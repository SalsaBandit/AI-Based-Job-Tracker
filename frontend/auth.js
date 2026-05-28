document.addEventListener("DOMContentLoaded", () => {
    if (api.isLoggedIn()) {
      window.location.href = "dashboard.html";
      return;
    }
  
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const showRegister = document.getElementById("show-register");
    const showLogin = document.getElementById("show-login");
    const loginPane = document.getElementById("login-pane");
    const registerPane = document.getElementById("register-pane");
    const loginError = document.getElementById("login-error");
    const registerError = document.getElementById("register-error");
    const registerSuccess = document.getElementById("register-success");
  
    showRegister.addEventListener("click", (e) => {
      e.preventDefault();
      loginPane.classList.remove("active");
      registerPane.classList.add("active");
      clearMessages();
    });
  
    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      registerPane.classList.remove("active");
      loginPane.classList.add("active");
      clearMessages();
    });
  
    function clearMessages() {
      loginError.textContent = "";
      registerError.textContent = "";
      registerSuccess.textContent = "";
    }
  
    function setLoading(btn, loading) {
      btn.disabled = loading;
      btn.dataset.original = btn.dataset.original || btn.textContent;
      btn.textContent = loading ? "Please wait..." : btn.dataset.original;
    }
  
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearMessages();
      const btn = loginForm.querySelector("button[type=submit]");
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
  
      setLoading(btn, true);
      try {
        await api.login(email, password);
        window.location.href = "dashboard.html";
      } catch (err) {
        loginError.textContent = err.message;
      } finally {
        setLoading(btn, false);
      }
    });
  
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearMessages();
      const btn = registerForm.querySelector("button[type=submit]");
      const email = document.getElementById("reg-email").value.trim();
      const password = document.getElementById("reg-password").value;
      const confirm = document.getElementById("reg-confirm").value;
  
      if (password !== confirm) {
        registerError.textContent = "Passwords do not match.";
        return;
      }
      if (password.length < 6) {
        registerError.textContent = "Password must be at least 6 characters.";
        return;
      }
  
      setLoading(btn, true);
      try {
        await api.register(email, password);
        registerSuccess.textContent = "Account created! You can now log in.";
        registerForm.reset();
        setTimeout(() => {
          registerPane.classList.remove("active");
          loginPane.classList.add("active");
          clearMessages();
        }, 1800);
      } catch (err) {
        registerError.textContent = err.message;
      } finally {
        setLoading(btn, false);
      }
    });
  });