import { fetchJSON, renderProjects } from '../global.js';

async function initProjects() {
  try {
    console.log('Initializing projects...');
    const projects = await fetchJSON('../lib/projects.json');
    console.log('Loaded projects:', projects);
    
    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error('Projects container not found!');
      return;
    }
    
    if (!projects || !projects.length) {
      console.error('No projects loaded!');
      projectsContainer.innerHTML = '<p>Error: Could not load projects.</p>';
      return;
    }
    
    renderProjects(projects, projectsContainer, 'h2');
  } catch (error) {
    console.error('Error initializing projects:', error);
    const projectsContainer = document.querySelector('.projects');
    if (projectsContainer) {
      projectsContainer.innerHTML = '<p>Error loading projects. Please try again later.</p>';
    }
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initProjects);