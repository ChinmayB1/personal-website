console.log('IT\'S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Define the base path based on whether we're running locally or on GitHub Pages
//const BASE_PATH = (location.hostname === "localhost" || location.hostname === "https://chinmayb1.github.io/personal-website/")
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                           // Local server
  : "/personal-website/";         // GitHub Pages repo name - matches your actual repo name

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

export async function fetchJSON(url) {
  try {
    console.log('Fetching JSON from:', url);
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Parsed JSON data:', data);
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format: expected an array');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
    throw error; // Re-throw to handle in the calling function
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    console.error('Container element not found');
    return;
  }

  // Clear existing content
  containerElement.innerHTML = '';

  // Update the header with the project count
  const header = document.querySelector('.projects-title');
  if (header) {
    header.textContent = `${projects.length} Projects`;
  }

  // Render each project
  projects.forEach(project => {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <div class="project-content">
        <p>${project.description}</p>
        <p class="project-year">c. ${project.year}</p>
      </div>
    `;
    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  try {
    console.log('Fetching GitHub data for:', username);
    const response = await fetch(`https://api.github.com/users/${username}`);
    console.log('GitHub API response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('GitHub data received:', data);
    return data;
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    throw error;
  }
} 