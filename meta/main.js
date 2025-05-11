import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Global variables for scales to be used in brush selection
let xScale, yScale;

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/ChinmayB1/personal-website/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: true,
        writable: true,
        enumerable: false
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  // Calculate stats
  const numCommits = commits.length;
  const numFiles = d3.group(data, d => d.file).size;
  const totalLOC = data.length;
  const maxDepth = d3.max(data, d => d.depth);
  const longestLine = d3.max(data, d => d.length);
  const maxLines = d3.max(
    d3.rollups(
      data,
      v => d3.max(v, d => d.line),
      d => d.file
    ),
    d => d[1]
  );

  // Create the summary container
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
  stat('MAX LINES', maxLines);
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id.substring(0, 7); // Show short commit hash
  
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  
  time.textContent = commit.datetime?.toLocaleString('en', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });
  
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
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

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection, commits, data) {
  const selectedCommits = selection
    ? commits.filter(d => isCommitSelected(selection, d))
    : [];
    
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const allLines = [];
  
  // Collect all lines from the selected commits
  requiredCommits.forEach(commit => {
    // Access the hidden 'lines' property
    const commitLines = Object.getOwnPropertyDescriptor(commit, 'lines').value;
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

function renderScatterPlot(data, commits) {
  // Sort commits by size for better interaction
  const sortedCommits = [...commits].sort((a, b) => b.totalLines - a.totalLines);
  
  // Set dimensions
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 40, left: 50 };
  
  // Calculate usable area
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  
  // Create SVG
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');
  
  // Create scales
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();
  
  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);
  
  // Calculate min/max lines for radius scale
  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  
  // Create radius scale with square root to ensure area proportionality
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([3, 30]);
  
  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);
  
  // Create gridlines
  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableArea.width)
  );
  
  // Create and add X axis
  const xAxis = d3.axisBottom(xScale);
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);
  
  // Create and add Y axis with custom format
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');
  
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);
  
  // Add the dots
  const dots = svg.append('g').attr('class', 'dots');
  
  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', d => {
      // Color based on time of day (bluer for night, orange for day)
      const hour = d.hourFrac;
      if (hour >= 6 && hour < 18) {
        // Daytime: orange/yellow
        return 'rgb(255, 155, 50)';
      } else {
        // Nighttime: blue
        return 'rgb(50, 120, 255)';
      }
    })
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
  
  // Create brush
  function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));
    renderSelectionCount(selection, commits);
    renderLanguageBreakdown(selection, commits, data);
  }
  
  svg.call(d3.brush().on('start brush end', brushed));
  
  // Raise dots and other elements above the brush overlay
  svg.selectAll('.dots, .overlay ~ *').raise();
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await loadData();
    const commits = processCommits(data);
    renderCommitInfo(data, commits);
    renderScatterPlot(data, commits);
  } catch (error) {
    console.error('Error initializing code analysis:', error);
    d3.select('#stats').html('<p>Error loading code analysis data. Please try again later.</p>');
    d3.select('#chart').html('<p>Error loading chart data. Please try again later.</p>');
  }
}); 