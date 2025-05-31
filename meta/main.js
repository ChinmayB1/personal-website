import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale, yScale;
let commitProgress = 100;

const data = await loadData();
const commits = processCommits(data);
let filteredCommits = commits;

const timeScale = d3.scaleTime()
  .domain(d3.extent(commits, (d) => d.datetime))
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

renderCommitInfo(data, filteredCommits);
renderScatterPlot(data, filteredCommits);
updateFileDisplay(filteredCommits);

async function loadData() {
  return await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const { author, date, time, timezone, datetime } = lines[0];
    const entry = {
      id: commit,
      url: 'https://github.com/ChinmayB1/personal-website/commit/' + commit,
      author, date, time, timezone, datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };
    Object.defineProperty(entry, 'lines', {
      value: lines, enumerable: false, writable: false, configurable: false
    });
    return entry;
  }).sort((a, b) => a.datetime - b.datetime);
}

function renderCommitInfo(data, commits) {
  // Calculate stats using the same style as before
  const numCommits = commits.length;
  const numFiles = d3.group(data, d => d.file).size;
  const totalLOC = data.length;
  const maxDepth = d3.max(data, d => d.depth);
  const longestLine = d3.max(data, d => d.length);
  const avgFileLength = d3.mean(d3.groups(data, d => d.file).map(([, lines]) => lines.length));

  // Create the summary container matching our theme
  const container = d3.select('#stats').html('')
    .append('div').attr('class', 'summary-stats');

  // Add heading
  container.append('h2')
    .attr('class', 'summary-heading')
    .text('Summary');

  // Add the row of stat blocks
  const row = container.append('div').attr('class', 'summary-row');

  // Helper to add a stat block
  function stat(label, value) {
    const block = row.append('div').attr('class', 'summary-block');
    block.append('div').attr('class', 'summary-label').text(label);
    block.append('div').attr('class', 'summary-value').text(value);
  }

  stat('COMMITS', numCommits);
  stat('FILES', numFiles);
  stat('TOTAL LOC', totalLOC);
  stat('MAX DEPTH', maxDepth);
  stat('LONGEST LINE', longestLine);
  stat('AVG FILE LENGTH', Math.round(avgFileLength));
}

function renderScatterPlot(data, commits) {
  const width = 1000, height = 600;
  const margin = { top: 10, right: 10, bottom: 40, left: 50 };
  const usableArea = {
    top: margin.top, right: width - margin.right,
    bottom: height - margin.bottom, left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime().domain(d3.extent(commits, d => d.datetime)).range([usableArea.left, usableArea.right]).nice();
  yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

  // Add gridlines first
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Add axes
  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis')
    .call(d3.axisBottom(xScale));
    
  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`));
    
  svg.append('g').attr('class', 'dots');

  // Add brush functionality
  function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));
    renderSelectionCount(selection, commits);
    renderLanguageBreakdown(selection, commits, data);
  }
  
  svg.call(d3.brush().on('start brush end', brushed));
  
  // Raise dots and other elements above the brush overlay
  svg.selectAll('.dots, .overlay ~ *').raise();

  updateScatterPlot(data, commits);
}

function updateScatterPlot(data, commits) {
  if (!commits || commits.length === 0 || !xScale) return;
  
  const svg = d3.select('#chart').select('svg');
  xScale.domain(d3.extent(commits, d => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 25]);

  const xAxis = d3.axisBottom(xScale);
  svg.select('g.x-axis').transition().duration(500).call(xAxis);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  const update = dots.selectAll('circle')
    .data(sortedCommits, d => d.id);

  update
    .join(
      enter => enter.append('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', 0)
        .attr('fill', d => {
          // Color based on time of day (matching our theme)
          const hour = d.hourFrac;
          if (hour >= 6 && hour < 18) {
            return 'rgb(255, 155, 50)'; // Daytime: orange
          } else {
            return 'rgb(50, 120, 255)'; // Nighttime: blue
          }
        })
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
          d3.select(event.currentTarget).style('fill-opacity', 1);
          renderTooltipContent(commit);
          updateTooltipVisibility(true);
          updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
          d3.select(event.currentTarget).style('fill-opacity', 0.7);
          updateTooltipVisibility(false);
        })
        .transition()
        .duration(500)
        .attr('r', d => rScale(d.totalLines)),

      update => update
        .transition()
        .duration(500)
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines)),

      exit => exit
        .transition()
        .duration(300)
        .attr('r', 0)
        .remove()
    );
}

function onTimeSliderChange() {
  commitProgress = +document.getElementById('commit-progress').value;
  commitMaxTime = timeScale.invert(commitProgress);
  document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long', timeStyle: 'short'
  });
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

function updateFileDisplay(filteredCommits) {
  const colors = d3.scaleOrdinal(d3.schemeTableau10);
  const lines = filteredCommits.flatMap(d => d.lines);
  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter => enter.append('div').call(div => {
        div.append('dt').call(dt => {
          dt.append('code');
          dt.append('small');
        });
        div.append('dd');
      })
    );

  // Update file info with proper structure
  filesContainer.select('dt > code').text(d => d.name);
  filesContainer.select('dt > small').text(d => `${d.lines.length} lines`);

  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('background-color', d => colors(d.type));
}

function renderTooltipContent(commit) {
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id.substring(0, 7);
  document.getElementById('commit-date').textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
  document.getElementById('commit-lines').textContent = commit.totalLines;
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-time').textContent = commit.datetime?.toLocaleString('en', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  
  // Position tooltip to avoid going off screen
  let left = event.clientX + 10;
  let top = event.clientY + 10;
  
  if (left + tooltipWidth > window.innerWidth) {
    left = event.clientX - tooltipWidth - 10;
  }
  
  if (top + tooltipHeight > window.innerHeight) {
    top = event.clientY - tooltipHeight - 10;
  }
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

// Scrollytelling setup
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// Commit narrative text
d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html((d, i) => `
    <p>On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })}, I made <a href="${d.url}" target="_blank">
    ${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}</a>.
    I edited ${d.totalLines} lines across ${
      d3.rollups(d.lines, D => D.length, d => d.file).length
    } files. Then I looked over all I had made, and I saw that it was very good.</p>
  `);

// Setup Scrollama
function onStepEnter(response) {
  const commit = response.element.__data__;
  filteredCommits = commits.filter(d => d.datetime <= commit.datetime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scatter-story .step',
    offset: 0.5,
  })
  .onStepEnter(onStepEnter);

// Helper functions for brush functionality
function isCommitSelected(selection, commit) {
  if (!selection) return false;
  
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection, commits) {
  const selectedCommits = selection
    ? commits.filter(d => isCommitSelected(selection, d))
    : [];

  // Add selection count element if it doesn't exist
  let countElement = document.querySelector('#selection-count');
  if (!countElement) {
    countElement = document.createElement('p');
    countElement.id = 'selection-count';
    countElement.style.fontWeight = 'bold';
    countElement.style.fontSize = '1.1em';
    countElement.style.margin = '1em 0';
    document.querySelector('#scatter-plot').appendChild(countElement);
  }
  
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  return selectedCommits;
}

function renderLanguageBreakdown(selection, commits, data) {
  const selectedCommits = selection
    ? commits.filter(d => isCommitSelected(selection, d))
    : [];
    
  // Add language breakdown element if it doesn't exist
  let container = document.getElementById('language-breakdown');
  if (!container) {
    container = document.createElement('dl');
    container.id = 'language-breakdown';
    container.className = 'stats';
    container.style.marginTop = '2em';
    document.querySelector('#scatter-plot').appendChild(container);
  }

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const allLines = [];
  
  // Collect all lines from the selected commits
  requiredCommits.forEach(commit => {
    // Access the hidden 'lines' property
    const commitLines = commit.lines;
    allLines.push(...commitLines);
  });

  // Use d3.rollup to count lines per language/type
  const breakdown = d3.rollup(
    allLines,
    v => v.length,
    d => d.type || 'Unknown'
  );

  // Convert to array and sort by count
  const breakdownArray = Array.from(breakdown).sort((a, b) => b[1] - a[1]);
  
  // Update DOM with breakdown
  container.innerHTML = '';

  // Calculate total lines for percentage
  const totalLines = allLines.length;
  
  breakdownArray.forEach(([language, count]) => {
    const dt = document.createElement('dt');
    dt.textContent = language.toUpperCase();
    
    const dd = document.createElement('dd');
    dd.textContent = `${count} lines (${(count / totalLines * 100).toFixed(1)}%)`;
    
    container.appendChild(dt);
    container.appendChild(dd);
  });
} 