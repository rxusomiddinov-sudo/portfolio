(function () {
  const config = window.PORTFOLIO_CONFIG;
  const setupWarning = document.getElementById("setup-warning");
  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const sessionEmail = document.getElementById("session-email");
  const statusBox = document.getElementById("status");
  const formFields = document.getElementById("form-fields");
  const contentForm = document.getElementById("content-form");
  const saveButton = document.getElementById("save-btn");
  const reloadButton = document.getElementById("reload-btn");
  const resetButton = document.getElementById("reset-btn");
  const logoutButton = document.getElementById("logout-btn");

  const configured =
    config &&
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    config.supabaseUrl.indexOf("YOUR_") === -1 &&
    config.supabaseAnonKey.indexOf("YOUR_") === -1;

  function stop(message) {
    loginView.classList.add("hidden");
    appView.classList.add("hidden");
    setupWarning.classList.remove("hidden");
    if (message) setupWarning.textContent = message;
  }

  if (!configured) return stop();
  if (!window.supabase || !window.supabase.createClient) {
    return stop("Supabase kutubxonasi yuklanmadi. Internet aloqasini tekshiring.");
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  let loadedUserId = null;

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function deepMerge(base, patch) {
    if (patch === undefined) return clone(base);
    if (Array.isArray(patch)) return clone(patch);
    if (patch === null || typeof patch !== "object") return patch;
    const result = {};
    const baseObject = base && typeof base === "object" && !Array.isArray(base) ? base : {};
    const keys = Object.keys(baseObject).concat(Object.keys(patch).filter(function (key) {
      return !Object.prototype.hasOwnProperty.call(baseObject, key);
    }));
    keys.forEach(function (key) {
      result[key] = deepMerge(baseObject[key], patch[key]);
    });
    return result;
  }

  function getPath(object, path) {
    return path.split(".").reduce(function (value, key) {
      return value == null ? undefined : value[key];
    }, object);
  }

  function setPath(object, path, value) {
    const keys = path.split(".");
    let target = object;
    keys.forEach(function (key, index) {
      if (index === keys.length - 1) {
        target[key] = value;
      } else {
        if (!target[key] || typeof target[key] !== "object") target[key] = {};
        target = target[key];
      }
    });
  }

  function setStatus(message, type) {
    statusBox.textContent = message || "";
    statusBox.className = "status" + (type ? " " + type : "");
  }

  function field(label, path, value, type, extra) {
    return (
      '<label class="field"><span>' +
      escapeHtml(label) +
      '</span><input type="' +
      (type || "text") +
      '" data-path="' +
      escapeHtml(path) +
      '" value="' +
      escapeHtml(value) +
      '"' +
      (extra || "") +
      "></label>"
    );
  }

  function textarea(label, path, value) {
    return (
      '<label class="field"><span>' +
      escapeHtml(label) +
      '</span><textarea data-path="' +
      escapeHtml(path) +
      '">' +
      escapeHtml(value) +
      "</textarea></label>"
    );
  }

  function checkbox(label, path, checked) {
    return (
      '<label class="check"><input type="checkbox" data-path="' +
      escapeHtml(path) +
      '" data-type="boolean"' +
      (checked ? " checked" : "") +
      ">" +
      escapeHtml(label) +
      "</label>"
    );
  }

  function hintText(html) {
    return '<p class="hint-text">' + html + "</p>";
  }

  function section(title, body) {
    return '<section class="section"><h2>' + escapeHtml(title) + "</h2>" + body + "</section>";
  }

  const templates = {
    "about.paragraphs": "",
    "services.items": { number: "", label: "" },
    "projects.items": { title: "", description: "", tags: [], url: "", big: false },
    "contacts.items": { label: "", value: "", href: "" }
  };

  function itemLabel(path, item, index) {
    if (path === "about.paragraphs") return "Matn " + (index + 1);
    if (path === "services.items") return item.label || "Xizmat " + (index + 1);
    if (path === "projects.items") return item.title || "Loyiha " + (index + 1);
    return item.label || "Aloqa " + (index + 1);
  }

  function itemBody(path, item) {
    if (path === "about.paragraphs") return textarea("Matn", "value", item);
    if (path === "services.items") {
      return (
        '<div class="grid2">' +
        field("Nomer", "number", item.number) +
        field("Nomi", "label", item.label) +
        "</div>"
      );
    }
    if (path === "projects.items") {
      return (
        field("Nomi", "title", item.title) +
        textarea("Tavsif", "description", item.description) +
        '<div class="grid2">' +
        field("Teglar (vergul bilan)", "tags", (item.tags || []).join(", "), "text", ' data-list="tags"') +
        field("Havola", "url", item.url) +
        "</div>" +
        checkbox("Katta karta sifatida ko‘rsatish", "big", Boolean(item.big))
      );
    }
    return (
      '<div class="grid2">' +
      field("Nomi", "label", item.label) +
      field("Qiymat", "value", item.value) +
      "</div>" +
      field("Havola", "href", item.href)
    );
  }

  function renderRepeaterItem(path, item, index) {
    return (
      '<div class="repeater-item"><div class="item-head"><strong>' +
      escapeHtml(itemLabel(path, item, index)) +
      '</strong><button type="button" class="danger" data-remove aria-label="O‘chirish">×</button></div>' +
      itemBody(path, item) +
      "</div>"
    );
  }

  function repeaterBlock(path, items, addLabel) {
    const safeItems = Array.isArray(items) ? items : [];
    return (
      '<div class="repeater" data-repeater="' +
      escapeHtml(path) +
      '"><div class="repeater-items">' +
      safeItems
        .map(function (item, index) {
          return renderRepeaterItem(path, item, index);
        })
        .join("") +
      '</div><button type="button" class="ghost" data-add>' +
      escapeHtml(addLabel) +
      "</button></div>"
    );
  }

  function renderForm(content) {
    const data = deepMerge(config.defaults, content);
    formFields.innerHTML =
      section(
        "Profil",
        '<div class="grid2">' +
          field("Yuqoridagi ism", "profile.name", data.profile.name) +
          field("Hero old qismi", "profile.heroPrefix", data.profile.heroPrefix) +
          field("Hero keyingi qismi", "profile.heroSuffix", data.profile.heroSuffix) +
          field("Rol", "profile.role", data.profile.role) +
          field("Rol akcenti", "profile.roleAccent", data.profile.roleAccent) +
          field("Yil", "profile.year", data.profile.year) +
          field("Footer o‘ngi", "profile.footerRight", data.profile.footerRight) +
          field("Footer muallif", "footer.copyright", data.footer.copyright) +
          "</div>"
      ) +
      section(
        "Pastga aylantirish matni",
        '<div class="grid2">' +
          field("Birinchi qism", "hint.prefix", data.hint.prefix) +
          field("Ajratilgan so‘z", "hint.highlight", data.hint.highlight) +
          field("Oxirgi qism", "hint.suffix", data.hint.suffix) +
          "</div>"
      ) +
      section(
        "Men haqimda",
        field("Sarlavha", "about.title", data.about.title) +
          hintText("Matn ichida <code>==so‘z==</code> yozilsa, u yashil rangda ajratiladi.") +
          repeaterBlock("about.paragraphs", data.about.paragraphs, "Matn qo‘shish")
      ) +
      section(
        "Xizmatlar",
        field("Sarlavha", "services.title", data.services.title) +
          repeaterBlock("services.items", data.services.items, "Xizmat qo‘shish")
      ) +
      section(
        "Loyihalar",
        field("Sarlavha", "projects.title", data.projects.title) +
          repeaterBlock("projects.items", data.projects.items, "Loyiha qo‘shish")
      ) +
      section(
        "Bog‘lanish",
        field("Sarlavha", "contacts.title", data.contacts.title) +
          repeaterBlock("contacts.items", data.contacts.items, "Aloqa qo‘shish")
      );
  }

  function collect() {
    const result = deepMerge(config.defaults, {});

    document.querySelectorAll("[data-path]").forEach(function (input) {
      if (input.closest(".repeater-item")) return;
      const value = input.dataset.type === "boolean" ? input.checked : input.value;
      setPath(result, input.dataset.path, value);
    });

    document.querySelectorAll("[data-repeater]").forEach(function (repeater) {
      const path = repeater.dataset.repeater;
      const items = [];

      repeater.querySelectorAll(".repeater-item").forEach(function (itemElement) {
        if (path === "about.paragraphs") {
          const input = itemElement.querySelector("[data-path]");
          items.push(input ? input.value : "");
          return;
        }

        const item = {};
        itemElement.querySelectorAll("[data-path]").forEach(function (input) {
          let value = input.dataset.type === "boolean" ? input.checked : input.value;
          if (input.dataset.list === "tags") {
            value = String(value)
              .split(",")
              .map(function (tag) {
                return tag.trim();
              })
              .filter(Boolean);
          }
          setPath(item, input.dataset.path, value);
        });
        items.push(item);
      });

      setPath(result, path, items);
    });

    return result;
  }

  async function loadContent() {
    setStatus("Yuklanmoqda...", "loading");
    const result = await client
      .from("portfolio_content")
      .select("data")
      .eq("id", config.contentId)
      .maybeSingle();

    if (result.error) {
      setStatus(result.error.message, "error");
      return;
    }

    renderForm(result.data && result.data.data ? result.data.data : {});
    setStatus(result.data ? "Ma’lumotlar yuklandi" : "Topilmadi, standart ma’lumotlar ko‘rsatildi", result.data ? "ok" : "warn");
  }

  function setSession(session) {
    if (!session) {
      loadedUserId = null;
      loginView.classList.remove("hidden");
      appView.classList.add("hidden");
      return;
    }

    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
    sessionEmail.textContent = session.user.email || "";

    if (loadedUserId !== session.user.id) {
      loadedUserId = session.user.id;
      loadContent();
    }
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginError.textContent = "";
    const result = await client.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });
    if (result.error) loginError.textContent = result.error.message;
  });

  logoutButton.addEventListener("click", async function () {
    await client.auth.signOut();
    passwordInput.value = "";
  });

  reloadButton.addEventListener("click", loadContent);

  resetButton.addEventListener("click", function () {
    renderForm({});
    setStatus("Standart ma’lumotlar yuklandi. Saqlashni unutmang.", "warn");
  });

  formFields.addEventListener("click", function (event) {
    const removeButton = event.target.closest("[data-remove]");
    if (removeButton) {
      const item = removeButton.closest(".repeater-item");
      if (item) item.remove();
      return;
    }

    const addButton = event.target.closest("[data-add]");
    if (!addButton) return;

    const repeater = addButton.closest("[data-repeater]");
    const path = repeater.dataset.repeater;
    const list = repeater.querySelector(".repeater-items");
    const index = list.querySelectorAll(".repeater-item").length;
    list.insertAdjacentHTML("beforeend", renderRepeaterItem(path, clone(templates[path]), index));
  });

  contentForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    saveButton.disabled = true;
    setStatus("Saqlanmoqda...", "loading");

    const result = await client.from("portfolio_content").upsert(
      {
        id: config.contentId,
        data: collect(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

    saveButton.disabled = false;
    if (result.error) {
      setStatus(result.error.message, "error");
      return;
    }
    setStatus("Saqlandi", "ok");
  });

  client.auth.onAuthStateChange(function (_event, session) {
    setSession(session);
  });
})();
