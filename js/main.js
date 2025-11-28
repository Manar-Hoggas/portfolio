/* Main portfolio script ---------------------------------------------------
   Handles theme toggling, navigation, portfolio fetching/rendering,
   gallery lightbox, filters, search, and contact form mailto handoff. */

const PORTFOLIO_JSON_PATH = '/portfoloi/data.json';

const portfolioState = {
  items: [],
  filteredItems: [],
  activeTag: 'all',
  query: '',
  currentIndex: 0,
  lastFocusedElement: null,
};

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initNavigation();
  initLightboxControls();
  initPortfolio();
  setFooterYear();
});

/* Theme toggle ----------------------------------------------------------- */
function initThemeToggle() {
  const toggleButton = document.querySelector('.theme-toggle');
  if (!toggleButton) return;

  const savedPreference = localStorage.getItem('theme-preference');
  const prefersDark =
    savedPreference === 'dark' ||
    (!savedPreference && window.matchMedia('(prefers-color-scheme: dark)').matches);

  document.body.classList.toggle('dark-theme', prefersDark);
  updateThemeToggleLabel(toggleButton);

  toggleButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme-preference', theme);
    updateThemeToggleLabel(toggleButton);
  });
}

function updateThemeToggleLabel(button) {
  const isDark = document.body.classList.contains('dark-theme');
  button.setAttribute('aria-pressed', String(isDark));
  const textSpan = button.querySelector('.theme-toggle__text');
  if (textSpan) {
    textSpan.textContent = isDark ? 'Dark' : 'Light';
  }
}

/* Navigation ------------------------------------------------------------- */
function initNavigation() {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-navigation');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isExpanded));
      nav.classList.toggle('is-open');
    });

    nav.addEventListener('click', (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const onScroll = () => {
    if (header) {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
}

/* Footer ---------------------------------------------------------------- */
function setFooterYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

/* Portfolio -------------------------------------------------------------- */
async function initPortfolio() {
  const statusEl = document.getElementById('portfolio-status');
  const grid = document.getElementById('portfolio-grid');
  if (!statusEl || !grid) return;

  grid.dataset.state = 'loading';
  statusEl.textContent = 'Loading portfolio items…';

  try {
    const dataUrl =
      window.location.protocol === 'file:'
        ? PORTFOLIO_JSON_PATH.replace(/^\//, '')
        : PORTFOLIO_JSON_PATH;
    const response = await fetch(dataUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Portfolio JSON is not an array');
    }

    portfolioState.items = data;
    portfolioState.filteredItems = data;
    portfolioState.activeTag = 'all';
    portfolioState.query = '';

    buildTagFilters(data);
    initSearch();
    renderPortfolio(data);
  } catch (error) {
    console.error('Portfolio failed to load:', error);
    grid.dataset.state = 'error';
    statusEl.textContent =
      'Failed to load projects. Please refresh later or download the CV for details.';
  }
}

function buildTagFilters(items) {
  const container = document.querySelector('.tag-filters');
  if (!container) return;

  container.querySelectorAll('button:not([data-tag="all"])').forEach((button) => button.remove());
  const uniqueTags = [...new Set(items.flatMap((item) => item.tags || []))].sort();

  uniqueTags.forEach((tag) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-filter';
    button.dataset.tag = tag;
    button.textContent = `#${tag}`;
    container.appendChild(button);
  });

  if (!container.dataset.bound) {
    container.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement) || !target.classList.contains('tag-filter')) {
        return;
      }
      const tag = target.dataset.tag;
      if (!tag || tag === portfolioState.activeTag) {
        return;
      }
      portfolioState.activeTag = tag;
      updateActiveTagButton(container, tag);
      applyPortfolioFilters();
    });
    container.dataset.bound = 'true';
  }

  updateActiveTagButton(container, portfolioState.activeTag);
}

function updateActiveTagButton(container, tag) {
  container.querySelectorAll('.tag-filter').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tag === tag);
  });
}

function initSearch() {
  const searchInput = document.getElementById('portfolio-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (event) => {
    const value = event.target.value || '';
    portfolioState.query = value.trim().toLowerCase();
    applyPortfolioFilters();
  });
}

function applyPortfolioFilters() {
  const filtered = portfolioState.items.filter((item) => {
    const matchesTag =
      portfolioState.activeTag === 'all' || (item.tags || []).includes(portfolioState.activeTag);
    const searchTarget = `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
    const matchesQuery = !portfolioState.query || searchTarget.includes(portfolioState.query);
    return matchesTag && matchesQuery;
  });

  portfolioState.filteredItems = filtered;
  renderPortfolio(filtered);
}

function renderPortfolio(items) {
  const grid = document.getElementById('portfolio-grid');
  const statusEl = document.getElementById('portfolio-status');
  if (!grid || !statusEl) return;

  grid.innerHTML = '';
  grid.dataset.state = items.length ? 'ready' : 'empty';

  if (!portfolioState.items.length) {
    statusEl.textContent = 'Portfolio data not available at the moment.';
    return;
  }

  if (!items.length) {
    statusEl.textContent =
      'No projects matched your filters. Clear the search or choose another tag.';
    return;
  }

  statusEl.textContent = `Showing ${items.length} of ${portfolioState.items.length} projects.`;

  items.forEach((item, index) => {
    const card = createPortfolioCard(item, index);
    grid.appendChild(card);
  });
}

function createPortfolioCard(item, index) {
  const article = document.createElement('article');
  article.className = 'portfolio-card fade-up';
  article.style.setProperty('--fade-delay', `${Math.min(index * 0.08, 0.4)}s`);

  const media = document.createElement('div');
  media.className = 'portfolio-card__media';
  const img = document.createElement('img');
  img.src = item.image;
  img.alt = item.title;
  img.loading = 'lazy';
  media.appendChild(img);

  const body = document.createElement('div');
  body.className = 'portfolio-card__body';
  const title = document.createElement('h3');
  title.textContent = item.title;
  const description = document.createElement('p');
  description.textContent = truncateText(item.description, 180);
  const tagList = document.createElement('ul');
  tagList.className = 'portfolio-card__tags';
  (item.tags || []).forEach((tag) => {
    const li = document.createElement('li');
    li.textContent = `#${tag}`;
    tagList.appendChild(li);
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn ghost js-open-lightbox';
  button.textContent = 'View details';
  button.addEventListener('click', () => openLightbox(index));

  body.append(title, description, tagList, button);
  article.append(media, body);

  return article;
}

function truncateText(text = '', maxLength = 160) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

/* Lightbox --------------------------------------------------------------- */
function initLightboxControls() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const closeButton = lightbox.querySelector('.lightbox__close');
  const prevButton = lightbox.querySelector('.lightbox__prev');
  const nextButton = lightbox.querySelector('.lightbox__next');

  closeButton?.addEventListener('click', closeLightbox);
  prevButton?.addEventListener('click', () => stepLightbox(-1));
  nextButton?.addEventListener('click', () => stepLightbox(1));

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (lightbox.getAttribute('aria-hidden') === 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepLightbox(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepLightbox(-1);
    }
  });
}

function openLightbox(index) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox || !portfolioState.filteredItems.length) return;

  portfolioState.currentIndex = index;
  const item = portfolioState.filteredItems[index];
  if (!item) return;

  const image = document.getElementById('lightbox-image');
  const title = document.getElementById('lightbox-title');
  const description = document.getElementById('lightbox-description');
  const tagsList = document.getElementById('lightbox-tags');
  const linkWrapper = document.getElementById('lightbox-link-wrapper');

  if (image) {
    image.src = item.image;
    image.alt = item.title;
  }
  if (title) title.textContent = item.title;
  if (description) description.textContent = item.description;
  if (tagsList) {
    tagsList.innerHTML = '';
    (item.tags || []).forEach((tag) => {
      const li = document.createElement('li');
      li.textContent = `#${tag}`;
      tagsList.appendChild(li);
    });
  }
  if (linkWrapper) {
    linkWrapper.innerHTML = '';
    if (item.link) {
      const link = document.createElement('a');
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open project';
      linkWrapper.appendChild(link);
    }
  }

  portfolioState.lastFocusedElement = document.activeElement;
  document.body.style.overflow = 'hidden';
  lightbox.setAttribute('aria-hidden', 'false');
  const closeButton = lightbox.querySelector('.lightbox__close');
  closeButton?.focus();
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  portfolioState.lastFocusedElement?.focus();
}

function stepLightbox(direction) {
  if (!portfolioState.filteredItems.length) return;
  let nextIndex = portfolioState.currentIndex + direction;
  if (nextIndex < 0) {
    nextIndex = portfolioState.filteredItems.length - 1;
  } else if (nextIndex >= portfolioState.filteredItems.length) {
    nextIndex = 0;
  }
  openLightbox(nextIndex);
}

