const API_BASE = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("access_token");
}

function setToken(token) {
  localStorage.setItem("access_token", token);
}

function removeToken() {
  localStorage.removeItem("access_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleResponse(res) {
  if (res.status === 401) {
    removeToken();
    window.location.href = "index.html";
    throw new Error("Unauthorized");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

const api = {
  async register(email, password) {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async login(email, password) {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const res = await fetch(`${API_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = await handleResponse(res);
    setToken(data.access_token);
    return data;
  },

  logout() {
    removeToken();
    window.location.href = "index.html";
  },

  async getJobs(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.location) params.append("location", filters.location);
    const res = await fetch(`${API_BASE}/jobs?${params}`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async getJob(id) {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async createJob(job) {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(job),
    });
    return handleResponse(res);
  },

  async updateJob(id, job) {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(job),
    });
    return handleResponse(res);
  },

  async deleteJob(id) {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async getFilters() {
    const res = await fetch(`${API_BASE}/filters`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  isLoggedIn() {
    return !!getToken();
  },
};