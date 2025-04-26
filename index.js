import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function initPage() {
  try {
    // Load latest projects
    const projects = await fetchJSON('./lib/projects.json');
    const latestProjects = projects.slice(0, 3);
    
    const projectsContainer = document.querySelector('.projects');
    if (projectsContainer) {
      renderProjects(latestProjects, projectsContainer, 'h2');
    }

    // Load GitHub stats
    const profileStats = document.querySelector('#profile-stats');
    if (profileStats) {
      // Show loading state
      profileStats.innerHTML = '<p>Loading GitHub stats...</p>';
      
      try {
        const githubData = await fetchGitHubData('ChinmayB1');
        console.log('Rendering GitHub data:', githubData);
        
        if (githubData) {
          profileStats.innerHTML = `
            <dl>
              <div>
                <dt>FOLLOWERS</dt>
                <dd>${githubData.followers}</dd>
              </div>
              <div>
                <dt>FOLLOWING</dt>
                <dd>${githubData.following}</dd>
              </div>
              <div>
                <dt>PUBLIC REPOS</dt>
                <dd>${githubData.public_repos}</dd>
              </div>
              <div>
                <dt>PUBLIC GISTS</dt>
                <dd>${githubData.public_gists}</dd>
              </div>
            </dl>
          `;
        } else {
          profileStats.innerHTML = '<p>Error: Could not load GitHub stats.</p>';
        }
      } catch (error) {
        console.error('GitHub stats error:', error);
        profileStats.innerHTML = '<p>Error loading GitHub stats. Please try again later.</p>';
      }
    }
  } catch (error) {
    console.error('Error initializing page:', error);
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initPage); 