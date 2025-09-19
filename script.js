
const UNSPLASH_ACCESS_KEY = 'Oa_HPvyp8sjhkmaGG5CZV4hkTRMQZOvResSjK3ZZHbw';
const OPENWEATHER_KEY = '4c9f906835d69847dc1d7ccdfbd4b703';

document.addEventListener('DOMContentLoaded', () => {
  const $ = s => document.querySelector(s);
  const photosEl = $('#photos');
  const weatherContent = $('#weatherContent');
  const resultsTitle = $('#resultsTitle');
  const subText = $('#subText');
  const paginationEl = $('#pagination');
  const perPageSelect = $('#perPage');
  const searchInput = $('#searchInput');
  const searchBtn = $('#searchBtn');

  let currentQuery = '';
  let currentPage = 1;
  let perPage = perPageSelect ? parseInt(perPageSelect.value, 10) || 12 : 12;

  function escapeHtml(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }

  async function fetchPhotos(query, page = 1, perPageLocal = 12) {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPageLocal}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.errors ? data.errors.join(', ') : 'Unsplash error');
    return data;
  }

  async function fetchWeather(q) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&units=metric&appid=${OPENWEATHER_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || (data.cod && Number(data.cod) !== 200)) throw new Error(data.message || 'Weather not found');
    return data;
  }

  function renderPhotos(results) {
    photosEl.innerHTML = '';
    if (!results || !results.results || results.results.length === 0) {
      photosEl.innerHTML = '<p>No photos found.</p>';
      return;
    }
    results.results.forEach(photo => {
      const div = document.createElement('div');
      div.className = 'photo-card';
      const username = photo.user && photo.user.name ? escapeHtml(photo.user.name) : 'Unknown';
      const alt = escapeHtml(photo.alt_description || '');
      div.innerHTML = `
        <img loading="lazy" src="${photo.urls.small}" alt="${alt}">
        <div class="photo-meta"><span>${username}</span><a href="${photo.links.html}" target="_blank" rel="noopener">Unsplash</a></div>
      `;
      div.addEventListener('click', () => openModal(photo.urls.full, photo.alt_description));
      photosEl.appendChild(div);
    });
  }

  function renderWeather(data) {
    if (!data || !data.main) {
      weatherContent.innerHTML = '<p>Weather not available</p>';
      $('#weatherTitle').textContent = '';
      return;
    }
    const name = data.name + (data.sys && data.sys.country ? `, ${data.sys.country}` : '');
    $('#weatherTitle').textContent = name;
    weatherContent.innerHTML = `
      <div class="temp">${Math.round(data.main.temp)}°C</div>
      <div class="conds">${(data.weather && data.weather[0] && data.weather[0].description) || ''}</div>
      <div class="more">Feels like ${Math.round(data.main.feels_like)}°C • Humidity ${data.main.humidity}%</div>
    `;
  }

  function renderPagination(totalPages = 1) {
    paginationEl.innerHTML = '';
    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.textContent = 'Prev';
    prev.disabled = currentPage <= 1;
    prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; runQuery(currentQuery); }});
    paginationEl.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      if (i > 5) break; // limit page buttons
      const b = document.createElement('button');
      b.textContent = i;
      if (i === currentPage) b.classList.add('active');
      b.addEventListener('click', () => { currentPage = i; runQuery(currentQuery); });
      paginationEl.appendChild(b);
    }

    const next = document.createElement('button');
    next.textContent = 'Next';
    next.disabled = currentPage >= totalPages;
    next.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; runQuery(currentQuery); }});
    paginationEl.appendChild(next);
  }

  async function runQuery(q) {
    currentQuery = q;
    resultsTitle.textContent = `Top photos — ${q}`;
    subText.textContent = 'Loading...';
    photosEl.innerHTML = '';
    weatherContent.innerHTML = '';
    paginationEl.innerHTML = '';

    try {
      const [photosData, weatherData] = await Promise.all([
        fetchPhotos(q, currentPage, perPage),
        fetchWeather(q)
      ]);
      renderPhotos(photosData);
      renderWeather(weatherData);
      subText.textContent = `Showing results for "${q}" (page ${currentPage})`;
      renderPagination(photosData.total_pages || 1);
    } catch (err) {
      console.error('Query error:', err);
      subText.textContent = `Error: ${err.message}`;
      photosEl.innerHTML = `<p class="error">Photos: ${escapeHtml(err.message)}</p>`;
      weatherContent.innerHTML = `<p class="error">Weather: ${escapeHtml(err.message)}</p>`;
    }
  }

  // Event Listeners
  searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (!q) return;
    currentPage = 1;
    runQuery(q);
  });

  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (!q) return;
      currentPage = 1;
      runQuery(q);
    }
  });

  perPageSelect.addEventListener('change', () => {
    perPage = parseInt(perPageSelect.value, 10) || 12;
    if (currentQuery) { currentPage = 1; runQuery(currentQuery); }
  });

  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      const q = c.dataset.query || c.textContent.trim();
      searchInput.value = q;
      currentPage = 1;
      runQuery(q);
    });
  });

  // Modal
  const modal = $('#modal');
  const modalImg = $('#modalImg');
  const closeModalBtn = $('#closeModal');
  closeModalBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.querySelector('.backdrop').addEventListener('click', () => modal.classList.remove('open'));

  function openModal(src, alt) {
    modalImg.src = src;
    modalImg.alt = alt || '';
    modal.classList.add('open');
  }
});
