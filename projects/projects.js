import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Function to render the pie chart
function renderPieChart(projectsToShow, selectedIndex = -1) {
  // Calculate rolled data
  let rolledData = d3.rollups(
    projectsToShow,
    v => v.length,
    d => d.year
  );
  
  // Convert to array of { value, label }
  let data = rolledData.map(([year, count]) => ({ value: count, label: year }));
  
  // Sort by year descending
  data.sort((a, b) => b.label - a.label);

  // Create the arc generator
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

  // Create the slice generator with value accessor
  let sliceGenerator = d3.pie().value(d => d.value);

  // Generate the arc data
  let arcData = sliceGenerator(data);

  // Create color scale
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  // Clear existing paths and legend
  const svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();
  const legend = d3.select('.legend');
  legend.html('');

  // Generate the arcs and add them to the SVG
  arcData.forEach((d, i) => {
    svg
      .append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(i))
      .attr('class', i === selectedIndex ? 'selected' : '')
      .on('click', (event) => {
        event.preventDefault();
        const newSelectedIndex = selectedIndex === i ? -1 : i;
        const selectedYear = newSelectedIndex === -1 ? null : data[newSelectedIndex].label;
        
        // Get the projects container
        const projectsContainer = document.querySelector('.projects');
        
        // Filter projects by year if one is selected
        if (selectedYear) {
          const yearFilteredProjects = projectsToShow.filter(p => p.year === parseInt(selectedYear));
          console.log(`Filtering for year ${selectedYear}, found ${yearFilteredProjects.length} projects`);
          renderProjects(yearFilteredProjects, projectsContainer, 'h2');
        } else {
          console.log('No year selected, showing all projects');
          renderProjects(projectsToShow, projectsContainer, 'h2');
        }

        // Re-render pie chart with new selection
        renderPieChart(projectsToShow, newSelectedIndex);
      });
  });

  // Generate the legend
  data.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('class', `legend-item ${idx === selectedIndex ? 'selected' : ''}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', (event) => {
        event.preventDefault();
        const newSelectedIndex = selectedIndex === idx ? -1 : idx;
        const selectedYear = newSelectedIndex === -1 ? null : d.label;
        
        // Get the projects container
        const projectsContainer = document.querySelector('.projects');
        
        // Filter projects by year if one is selected
        if (selectedYear) {
          const yearFilteredProjects = projectsToShow.filter(p => p.year === parseInt(selectedYear));
          console.log(`Filtering for year ${selectedYear}, found ${yearFilteredProjects.length} projects`);
          renderProjects(yearFilteredProjects, projectsContainer, 'h2');
        } else {
          console.log('No year selected, showing all projects');
          renderProjects(projectsToShow, projectsContainer, 'h2');
        }

        // Re-render pie chart with new selection
        renderPieChart(projectsToShow, newSelectedIndex);
      });
  });

  // Update projects count in title
  const header = document.querySelector('.projects-title');
  if (header) {
    header.textContent = `${projectsToShow.length} Projects`;
  }
}

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
    
    // Initial render of projects and pie chart
    renderProjects(projects, projectsContainer, 'h2');
    renderPieChart(projects);

    // Set up search functionality
    const searchInput = document.querySelector('.searchBar');
    if (!searchInput) {
      console.error('Search input not found!');
      return;
    }

    // Add input event listener for real-time search
    searchInput.addEventListener('input', (event) => {
      const query = event.target.value.toLowerCase();
      console.log('Search query:', query);
      
      // Filter projects
      const filteredProjects = projects.filter(project => {
        const values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query);
      });

      console.log('Filtered projects:', filteredProjects.length);

      // Update projects list and pie chart
      renderProjects(filteredProjects, projectsContainer, 'h2');
      renderPieChart(filteredProjects);
    });

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