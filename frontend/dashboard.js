document.addEventListener("DOMContentLoaded", () => {
    if (!api.isLoggedIn()) {
      window.location.href = "index.html";
      return;
    }
  
    //State
    let jobs = [];
    let editingId = null;
    let activeFilters = { status: "", location: "" };
  
    //DOM refs 
    const jobGrid = document.getElementById("job-grid");
    const emptyState = document.getElementById("empty-state");
    const jobCount = document.getElementById("job-count");
    const logoutBtn = document.getElementById("logout-btn");
    const addJobBtn = document.getElementById("add-job-btn");
    const filterStatus = document.getElementById("filter-status");
    const filterLocation = document.getElementById("filter-location");
    const clearFiltersBtn = document.getElementById("clear-filters");
  
    const modal = document.getElementById("job-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalClose = document.getElementById("modal-close");
    const jobForm = document.getElementById("job-form");
    const formError = document.getElementById("form-error");
    const deleteConfirm = document.getElementById("delete-confirm");
    const deleteBtn = document.getElementById("delete-btn");
  
    const confirmModal = document.getElementById("confirm-modal");
    const confirmYes = document.getElementById("confirm-yes");
    const confirmNo = document.getElementById("confirm-no");
  
    const toast = document.getElementById("toast");
  
    //Status helpers 
    const STATUS_META = {
      Applied:    { cls: "status-applied",    icon: "◎" },
      Screening:  { cls: "status-screening",  icon: "◐" },
      Interview:  { cls: "status-interview",  icon: "◑" },
      Offer:      { cls: "status-offer",      icon: "●" },
      Rejected:   { cls: "status-rejected",   icon: "✕" },
      Withdrawn:  { cls: "status-withdrawn",  icon: "—" },
    };
  
    function statusMeta(s) {
      const key = Object.keys(STATUS_META).find(
        (k) => k.toLowerCase() === (s || "").toLowerCase()
      );
      return STATUS_META[key] || { cls: "status-applied", icon: "◎" };
    }
  
    //Toast
    function showToast(msg, type = "success") {
      toast.textContent = msg;
      toast.className = `toast toast-${type} show`;
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
  
    //Fetch and render
    async function loadFilters() {
      try {
        const { locations, statuses } = await api.getFilters();
        const curStatus = filterStatus.value;
        const curLocation = filterLocation.value;
  
        filterStatus.innerHTML = `<option value="">All Statuses</option>`;
        statuses.forEach((s) => {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s;
          if (s === curStatus) opt.selected = true;
          filterStatus.appendChild(opt);
        });
  
        filterLocation.innerHTML = `<option value="">All Locations</option>`;
        locations.forEach((l) => {
          const opt = document.createElement("option");
          opt.value = l;
          opt.textContent = l;
          if (l === curLocation) opt.selected = true;
          filterLocation.appendChild(opt);
        });
      } catch (_) {}
    }
  
    async function loadJobs() {
      jobGrid.innerHTML = `<div class="loading-row"><span class="spinner"></span> Loading jobs…</div>`;
      emptyState.hidden = true;
      try {
        jobs = await api.getJobs(activeFilters);
        renderJobs();
        await loadFilters();
      } catch (err) {
        jobGrid.innerHTML = `<div class="loading-row error-row">Failed to load jobs. ${err.message}</div>`;
      }
    }
  
    function renderJobs() {
      jobGrid.innerHTML = "";
      jobCount.textContent = `${jobs.length} application${jobs.length !== 1 ? "s" : ""}`;
  
      if (jobs.length === 0) {
        emptyState.hidden = false;
        return;
      }
      emptyState.hidden = true;
  
      jobs.forEach((job) => {
        const meta = statusMeta(job.status);
        const card = document.createElement("div");
        card.className = "job-card";
        card.innerHTML = `
          <div class="card-header">
            <span class="status-badge ${meta.cls}">${meta.icon} ${job.status || "—"}</span>
            <button class="card-menu-btn" data-id="${job.id}" aria-label="Edit job">⋯</button>
          </div>
          <div class="card-body">
            <h3 class="card-title">${esc(job.title || job.role || "Untitled Role")}</h3>
            <p class="card-company">${esc(job.company || "Unknown Company")}</p>
            <div class="card-meta">
              ${job.location ? `<span class="meta-tag">📍 ${esc(job.location)}</span>` : ""}
              ${job.experience ? `<span class="meta-tag">🎓 ${esc(job.experience)}</span>` : ""}
              ${job.salary ? `<span class="meta-tag">💰 ${esc(job.salary)}</span>` : ""}
            </div>
            ${job.url ? `<a class="card-link" href="${esc(job.url)}" target="_blank" rel="noopener">View Posting ↗</a>` : ""}
            ${job.notes ? `<p class="card-notes">${esc(job.notes)}</p>` : ""}
          </div>
          <div class="card-footer">
            ${job.applied_date ? `<span class="applied-date">Applied ${formatDate(job.applied_date)}</span>` : ""}
            <div class="card-actions">
              <button class="btn-edit" data-id="${job.id}">Edit</button>
              <button class="btn-delete" data-id="${job.id}">Delete</button>
            </div>
          </div>`;
        jobGrid.appendChild(card);
      });
  
      //attach card events
      document.querySelectorAll(".btn-edit").forEach((btn) =>
        btn.addEventListener("click", () => openEditModal(parseInt(btn.dataset.id)))
      );
      document.querySelectorAll(".btn-delete").forEach((btn) =>
        btn.addEventListener("click", () => openDeleteConfirm(parseInt(btn.dataset.id)))
      );
    }
  
    //Utilities
    function esc(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
  
    function formatDate(d) {
      if (!d) return "";
      try {
        return new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch {
        return d;
      }
    }
  
    //Modal helpers
    function openModal(title) {
      modalTitle.textContent = title;
      formError.textContent = "";
      modal.classList.add("open");
      document.body.classList.add("modal-open");
      modal.querySelector("input, textarea, select").focus();
    }
  
    function closeModal() {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
      jobForm.reset();
      editingId = null;
      deleteBtn.hidden = true;
    }
  
    function openAddModal() {
      editingId = null;
      jobForm.reset();
      deleteBtn.hidden = true;
      openModal("Add Application");
    }
  
    function openEditModal(id) {
      const job = jobs.find((j) => j.id === id);
      if (!job) return;
      editingId = id;
      jobForm.reset();
  
     
      const fields = ["title", "company", "location", "status", "experience", "salary", "url", "notes", "applied_date"];
      fields.forEach((f) => {
        const el = jobForm.querySelector(`[name="${f}"]`);
        if (el && job[f] != null) el.value = job[f];
      });
  
      deleteBtn.hidden = false;
      openModal("Edit Application");
    }
  
    //Delete confirm
    let pendingDeleteId = null;
  
    function openDeleteConfirm(id) {
      pendingDeleteId = id;
      confirmModal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  
    function closeConfirmModal() {
      confirmModal.classList.remove("open");
      document.body.classList.remove("modal-open");
      pendingDeleteId = null;
    }
  
    confirmYes.addEventListener("click", async () => {
      if (!pendingDeleteId) return;
      confirmYes.disabled = true;
      try {
        await api.deleteJob(pendingDeleteId);
        closeConfirmModal();
        showToast("Application deleted.");
        await loadJobs();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        confirmYes.disabled = false;
      }
    });
  
    confirmNo.addEventListener("click", closeConfirmModal);
  
    deleteBtn.addEventListener("click", () => {
      if (!editingId) return;
      closeModal();
      openDeleteConfirm(editingId);
    });
  
    //Form submit
    jobForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      formError.textContent = "";
      const btn = jobForm.querySelector("button[type=submit]");
      btn.disabled = true;
  
      const data = Object.fromEntries(
        [...new FormData(jobForm)].filter(([, v]) => v !== "")
      );
  
      try {
        if (editingId) {
          await api.updateJob(editingId, data);
          showToast("Application updated.");
        } else {
          await api.createJob(data);
          showToast("Application added.");
        }
        closeModal();
        await loadJobs();
      } catch (err) {
        formError.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  
    //Filters
    filterStatus.addEventListener("change", () => {
      activeFilters.status = filterStatus.value;
      loadJobs();
    });
  
    filterLocation.addEventListener("change", () => {
      activeFilters.location = filterLocation.value;
      loadJobs();
    });
  
    clearFiltersBtn.addEventListener("click", () => {
      activeFilters = { status: "", location: "" };
      filterStatus.value = "";
      filterLocation.value = "";
      loadJobs();
    });
  
    //Bindings
    logoutBtn.addEventListener("click", () => api.logout());
    addJobBtn.addEventListener("click", openAddModal);
    modalClose.addEventListener("click", closeModal);
  
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  
    confirmModal.addEventListener("click", (e) => {
      if (e.target === confirmModal) closeConfirmModal();
    });
  
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeConfirmModal();
      }
    });
  
    //Init
    loadJobs();
  });
  