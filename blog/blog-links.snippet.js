// Daily-feed blog-lane link toggle.
// Add after the activeLane initialization, and call updateBlogLinks()
// inside setLane() (before updateLaneCounts()).
function updateBlogLinks() {
  const bl = document.getElementById('df-blog-links');
  if (bl) bl.style.display = activeLane === 'blog' ? 'grid' : 'none';
}
updateBlogLinks();
