console.log('IT\'S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Define the base path based on whether we're running locally or on GitHub Pages
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/website/";         // GitHub Pages repo name

// Define the pages in our website
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/ChinmayB1', title: 'GitHub' }
];

// Function to set the color scheme
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  localStorage.colorScheme = colorScheme;
}

// Add color scheme switcher
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);

// Get the select element
const select = document.querySelector('.color-scheme select');

// Set initial color scheme from localStorage or default to automatic
if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}

// Add event listener for color scheme changes
select.addEventListener('input', function (event) {
  setColorScheme(event.target.value);
});

// Create and add the navigation menu
const nav = document.createElement('nav');
document.body.prepend(nav);

// Add each page to the navigation
for (let p of pages) {
  let url = p.url;
  let title = p.title;
  
  // Handle relative URLs
  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }
  
  // Create the link element
  const a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  
  // Add current class if this is the current page
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );
  
  // Add target="_blank" for external links
  if (a.host !== location.host) {
    a.target = '_blank';
  }
  
  // Add the link to the navigation
  nav.append(a);
} 