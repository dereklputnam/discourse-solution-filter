import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "solution-filter",

  initialize() {
    console.log('[Solution Filter] Initializing...');

    withPluginApi("0.8", (api) => {
      const settings = this.settings || {};
      console.log('[Solution Filter] Settings loaded:', settings);

      // Build SOLUTIONS object from theme settings
      function buildSolutionsFromSettings() {
        const SOLUTIONS = {
          "All": []
        };

        // Helper to parse category IDs from settings
        function parseIds(settingValue) {
          if (!settingValue) return [];
          return settingValue.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        }

        // Read each solution from settings
        SOLUTIONS.DSPM = parseIds(settings.solution_dspm_categories);
        SOLUTIONS.Directory = parseIds(settings.solution_directory_categories);
        SOLUTIONS.Endpoint = parseIds(settings.solution_endpoint_categories);
        SOLUTIONS.Identity = parseIds(settings.solution_identity_categories);
        SOLUTIONS.ITDR = parseIds(settings.solution_itdr_categories);
        SOLUTIONS.PAM = parseIds(settings.solution_pam_categories);

        console.log('[Solution Filter] Built SOLUTIONS:', SOLUTIONS);
        return SOLUTIONS;
      }

      // Helper function to get which solutions a product belongs to
      function getSolutionsForProduct(categoryId, SOLUTIONS) {
        const solutions = [];
        for (const [solution, ids] of Object.entries(SOLUTIONS)) {
          if (solution !== "All" && ids.includes(categoryId)) {
            solutions.push(solution);
          }
        }
        return solutions;
      }

      api.onPageChange((url, title) => {
        console.log('[Solution Filter] Page change detected:', url);

        // Build solutions from settings each time
        const SOLUTIONS = buildSolutionsFromSettings();

        // Get all product category IDs for filtering logic
        const ALL_PRODUCT_IDS = [...new Set(Object.values(SOLUTIONS).flat())];

        // Categories that exist under Products but aren't mapped to any solution
        function parseIds(settingValue) {
          if (!settingValue) return [];
          return settingValue.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        }
        const UNMAPPED_PRODUCT_IDS = parseIds(settings.unmapped_product_categories);

        console.log('[Solution Filter] ALL_PRODUCT_IDS:', ALL_PRODUCT_IDS);
        console.log('[Solution Filter] UNMAPPED_PRODUCT_IDS:', UNMAPPED_PRODUCT_IDS);

        // Remove any existing filter bar and class first
        const existingBar = document.querySelector("#solutionFilterContainer");
        if (existingBar) {
          existingBar.remove();
        }

        // Remove has-filter class from any heading that has it
        document.querySelectorAll('.category-box-heading.has-filter').forEach(heading => {
          heading.classList.remove('has-filter');
        });

        let attempts = 0;
        const containerCheck = setInterval(() => {
          attempts++;
          console.log('[Solution Filter] Attempt', attempts, '- Looking for Products category...');

          // Look for the Products category box heading
          const categoryBoxHeadings = document.querySelectorAll('.category-box-heading');
          console.log('[Solution Filter] Found', categoryBoxHeadings.length, 'category headings');
          let productsHeading = null;

          // Find the Products category box
          for (let heading of categoryBoxHeadings) {
            const link = heading.querySelector('a[href*="/c/products"]');
            const badgeName = heading.querySelector('.badge-category__name');
            const badgeText = badgeName ? badgeName.textContent.trim() : '';

            if (link && badgeName && badgeText === 'Products') {
              productsHeading = heading;
              console.log('[Solution Filter] Found Products heading!');
              break;
            }
          }

          if (attempts > 20) {
            console.log('[Solution Filter] Max attempts reached, stopping');
            clearInterval(containerCheck);
            return;
          }

          if (!productsHeading || document.querySelector("#solutionFilterContainer")) {
            if (document.querySelector("#solutionFilterContainer")) {
              console.log('[Solution Filter] Filter container already exists');
              clearInterval(containerCheck);
            }
            return;
          }
          clearInterval(containerCheck);
          console.log('[Solution Filter] Creating filter container...');

          // Create the filter container to insert inline with Products header
          const container = document.createElement("div");
          container.id = "solutionFilterContainer";
          container.classList.add("solution-filter-container");

          // Add label
          const label = document.createElement("span");
          label.textContent = "Filter by Solution:";
          label.classList.add("solution-filter-label");
          container.appendChild(label);

          // Create the filter bar
          const bar = document.createElement("div");
          bar.id = "solutionFilterBar";
          bar.classList.add("solution-filter-bar");

          Object.keys(SOLUTIONS).forEach(solution => {
            const btn = document.createElement("button");
            btn.textContent = solution;
            btn.className = "solution-btn solution-" + solution.toLowerCase();
            btn.type = "button";

            // Use both onclick and addEventListener for better reliability
            const handleClick = (e) => {
              e.preventDefault(); // Prevent any default behavior
              e.stopPropagation(); // Stop event bubbling
              e.stopImmediatePropagation(); // Stop all other handlers
              document.querySelectorAll(".solution-btn").forEach(b => b.classList.remove("active"));
              btn.classList.add("active");
              filterCategories(solution);
              return false; // Extra prevention
            };

            btn.onclick = handleClick;
            btn.addEventListener('click', handleClick, true); // Use capture phase
            bar.appendChild(btn);
          });

          container.appendChild(bar);

          // Insert the filter into the category-box-heading div, but AFTER the link
          // This way it's on the same line but not inside the clickable link
          const parentLink = productsHeading.querySelector('.parent-box-link');

          if (parentLink && productsHeading) {
            // Add a class to the heading so we can style it
            productsHeading.classList.add('has-filter');
            // Insert after the link
            productsHeading.appendChild(container);
          }

          const allBtn = document.querySelector(".solution-btn.solution-all");
          if (allBtn) {
            allBtn.classList.add("active");
          }

          // Run the filter function once on load to add badges and show all products
          filterCategories("All");

          function filterCategories(solution) {
            // Find the Products parent box first
            let productsBox = null;
            document.querySelectorAll('.category-box').forEach(box => {
              const badgeName = box.querySelector('.badge-category__name');
              if (badgeName && badgeName.textContent.trim() === 'Products') {
                productsBox = box;
              }
            });

            if (!productsBox) {
              return;
            }

            // Look for subcategory links within the Products box
            const productLinks = productsBox.querySelectorAll('a[href*="/c/"]');

            productLinks.forEach((link, index) => {
              let categoryId = null;
              let categoryName = "";

              // Find the container - use the closest parent div that's NOT the productsBox
              // Start simple: find the link's ancestor that contains the bordered box
              let productContainer = link.closest('div');

              // Keep going up until we find a div that has siblings (meaning it's a grid/flex item)
              while (productContainer && productContainer !== productsBox) {
                const parent = productContainer.parentElement;

                // If this container has the class 'category-box-inner', go one more level up
                if (productContainer.classList.contains('category-box-inner')) {
                  productContainer = parent;
                  break;
                }

                // If the parent has multiple children (grid items), we found it
                if (parent && parent.children.length > 1 && parent !== productsBox) {
                  break;
                }

                productContainer = parent;
              }

              // Get category name from badge within this link
              const badgeName = link.querySelector('.badge-category__name');
              if (badgeName) {
                categoryName = badgeName.textContent.trim();
              }

              // Try to get category ID from data attribute
              const badge = link.querySelector('[data-category-id]');
              if (badge && badge.dataset.categoryId) {
                categoryId = parseInt(badge.dataset.categoryId);
              }

              // If not found, try extracting from URL
              if (!categoryId && link.href) {
                const match = link.href.match(/\/c\/[^\/]+\/(\d+)/);
                if (match) {
                  categoryId = parseInt(match[1]);
                }
              }

              // Skip the Products parent link
              if (categoryName === 'Products') {
                return;
              }

              // Skip if no container found
              if (!productContainer) {
                return;
              }

              // Add solution badges to product cards (only once)
              if (categoryId && !productContainer.querySelector('.product-solution-badges')) {
                const solutions = getSolutionsForProduct(categoryId, SOLUTIONS);
                if (solutions.length > 0) {
                  const badgesContainer = document.createElement('div');
                  badgesContainer.classList.add('product-solution-badges');

                  solutions.forEach(solution => {
                    const badge = document.createElement('span');
                    badge.classList.add('solution-badge', 'solution-' + solution.toLowerCase());
                    badge.textContent = solution;
                    badgesContainer.appendChild(badge);
                  });

                  // Find the best place to insert badges - look for the category name element
                  const categoryNameElement = productContainer.querySelector('.badge-category__name');
                  if (categoryNameElement && categoryNameElement.parentElement) {
                    // Insert after the parent of the category name
                    const insertTarget = categoryNameElement.closest('a') || categoryNameElement.parentElement;
                    if (insertTarget.parentElement) {
                      insertTarget.parentElement.insertBefore(badgesContainer, insertTarget.nextSibling);
                    }
                  }
                }
              }

              // Check if this is an unmapped product (1Secure or Activity Monitor)
              const isUnmappedProduct = UNMAPPED_PRODUCT_IDS.includes(categoryId) ||
                                       (categoryName.toLowerCase().includes('1secure')) ||
                                       (categoryName.toLowerCase().includes('activity monitor'));

              if (categoryId && categoryName) {
                // Special handling for unmapped products (1Secure, Activity Monitor) - only show on "All"
                if (isUnmappedProduct) {
                  if (solution === "All") {
                    productContainer.style.setProperty('display', '', 'important');
                  } else {
                    productContainer.style.setProperty('display', 'none', 'important');
                  }
                }
                // Check if it's a mapped product category
                else if (ALL_PRODUCT_IDS.includes(categoryId)) {
                  if (solution === "All" || SOLUTIONS[solution].includes(categoryId)) {
                    productContainer.style.setProperty('display', '', 'important');
                  } else {
                    productContainer.style.setProperty('display', 'none', 'important');
                  }
                }
                // Not a product in our list - always show
                else {
                  productContainer.style.setProperty('display', '', 'important');
                }
              }
            });
          }
        }, 500);
      });
    });
  }
};
