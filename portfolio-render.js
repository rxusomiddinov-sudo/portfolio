(function () {
  const config = window.PORTFOLIO_CONFIG;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey) return;
  if (config.supabaseUrl.indexOf("YOUR_") !== -1 || config.supabaseAnonKey.indexOf("YOUR_") !== -1) return;
  if (!window.supabase || !window.supabase.createClient) return;

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function safeUrl(value) {
    const url = String(value == null ? "" : value).trim();
    return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url) ? escapeHtml(url) : "#";
  }

  function deepMerge(base, patch) {
    if (patch === undefined) return base;
    if (Array.isArray(patch)) return patch.slice();
    if (patch === null || typeof patch !== "object") return patch;
    const result = base && typeof base === "object" && !Array.isArray(base) ? Object.assign({}, base) : {};
    Object.keys(patch).forEach(function (key) {
      result[key] = deepMerge(base && base[key], patch[key]);
    });
    return result;
  }

  function getPath(object, path) {
    return path.split(".").reduce(function (value, key) {
      return value == null ? undefined : value[key];
    }, object);
  }

  function richText(value) {
    return String(value == null ? "" : value)
      .split(/==([^=]+)==/g)
      .map(function (part, index) {
        return index % 2 === 1 ? "<mark>" + escapeHtml(part) + "</mark>" : escapeHtml(part);
      })
      .join("");
  }

  function render(content) {
    const data = deepMerge(config.defaults, content || {});

    document.querySelectorAll("[data-sb]").forEach(function (element) {
      const value = getPath(data, element.getAttribute("data-sb"));
      element.textContent = value == null ? "" : String(value);
    });

    document.title = "Portfolio — " + (data.profile && data.profile.name ? data.profile.name : "Portfolio");

    const paragraphs = document.querySelector('[data-sb-list="about.paragraphs"]');
    if (paragraphs) {
      paragraphs.innerHTML = (data.about.paragraphs || [])
        .map(function (paragraph) {
          return "<p>" + richText(paragraph) + "</p>";
        })
        .join("");
    }

    const services = document.querySelector('[data-sb-list="services.items"]');
    if (services) {
      services.innerHTML = (data.services.items || [])
        .map(function (item) {
          return "<li><b>" + escapeHtml(item.number) + "</b><mark>" + escapeHtml(item.label) + "</mark></li>";
        })
        .join("");
    }

    const projects = document.querySelector('[data-sb-list="projects.items"]');
    if (projects) {
      projects.innerHTML = (data.projects.items || [])
        .map(function (item) {
          const tags = (item.tags || [])
            .map(function (tag) {
              return "<li>" + escapeHtml(tag) + "</li>";
            })
            .join("");
          return (
            '<a class="card link' +
            (item.big ? " big" : "") +
            '" href="' +
            safeUrl(item.url) +
            '" target="_blank" rel="noopener">' +
            "<h3>" +
            escapeHtml(item.title) +
            "</h3><p>" +
            escapeHtml(item.description) +
            "</p><ul class=\"tags\">" +
            tags +
            '</ul><span class="go">Saytni ochish →</span></a>'
          );
        })
        .join("");
    }

    const contacts = document.querySelector('[data-sb-list="contacts.items"]');
    if (contacts) {
      contacts.innerHTML = (data.contacts.items || [])
        .map(function (item) {
          return (
            '<a href="' +
            safeUrl(item.href) +
            '"><small>' +
            escapeHtml(item.label) +
            "</small>" +
            escapeHtml(item.value) +
            "</a>"
          );
        })
        .join("");
    }
  }

  client
    .from("portfolio_content")
    .select("data")
    .eq("id", config.contentId)
    .maybeSingle()
    .then(function (result) {
      if (!result.error && result.data && result.data.data) render(result.data.data);
    });

  client
    .channel("portfolio-content")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "portfolio_content",
        filter: "id=eq." + config.contentId
      },
      function (payload) {
        if (payload.new && payload.new.data) render(payload.new.data);
      }
    )
    .subscribe();
})();
