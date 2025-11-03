import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "solution-filter",

  initialize() {
    withPluginApi("0.8", (api) => {
      // Hardcoded SOLUTIONS - can be moved to settings later
      const SOLUTIONS = {
        "All": [],
        "DSPM": [18, 19, 21, 22],
        "Directory": [18, 23, 25],
        "Endpoint": [22, 28, 20],
        "Identity": [34, 23, 25, 181, 182],
        "ITDR": [27, 19, 32, 33, 30],
        "PAM": [29, 28, 26]
      };

      const ALL_PRODUCT_IDS = [...new Set(Object.values(SOLUTIONS).flat())];
      const UNMAPPED_PRODUCT_IDS = [17, 188];

      // Helper function to get which solutions a product belongs to
      function getSolutionsForProduct(categoryId) {
        const solutions = [];
        for (const [solution, ids] of Object.entries(SOLUTIONS)) {
          if (solution !== "All" && ids.includes(categoryId)) {
            solutions.push(solution);
          }
        }
        return solutions;
      }

      api.onPageChange(() => {
        // Remove any existing filter bar
        const existingBar = document.querySelector("#solutionFilterContainer");
        if (existingBar) {
          existingBar.remove();
        }

        document.querySelectorAll('.category-box-heading.has-filter').forEach(heading => {
          heading.classList.remove('has-filter');
        });

        let attempts = 0;
        const containerCheck = setInterval(() => {
          attempts++;

          const categoryBoxHeadings = document.querySelectorAll('.category-box-heading');
          let productsHeading = null;

          for (let heading of categoryBoxHeadings) {
            const link = heading.querySelector('a[href*="/c/products"]');
            const badgeName = heading.querySelector('.badge-category__name');
            const badgeText = badgeName ? badgeName.textContent.trim() : '';

            if (link && badgeName && badgeText === 'Products') {
              productsHeading = heading;
              break;
            }
          }

          if (attempts > 20) {
            clearInterval(containerCheck);
            return;
          }

          if (!productsHeading || document.querySelector("#solutionFilterContainer")) {
            if (document.querySelector("#solutionFilterContainer")) {
              clearInterval(containerCheck);
            }
            return;
          }
          clearInterval(containerCheck);

          const container = document.createElement("div");
          container.id = "solutionFilterContainer";
          container.classList.add("solution-filter-container");

          const label = document.createElement("span");
          label.textContent = "Filter by Solution:";
          label.classList.add("solution-filter-label");
          container.appendChild(label);

          const bar = document.createElement("div");
          bar.id = "solutionFilterBar";
          bar.classList.add("solution-filter-bar");

          Object.keys(SOLUTIONS).forEach(solution => {
            const btn = document.createElement("button");
            btn.textContent = solution;
            btn.className = "solution-btn solution-" + solution.toLowerCase();
            btn.type = "button";

            const handleClick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              document.querySelectorAll(".solution-btn").forEach(b => b.classList.remove("active"));
              btn.classList.add("active");
              filterCategories(solution);
              return false;
            };

            btn.onclick = handleClick;
            btn.addEventListener('click', handleClick, true);
            bar.appendChild(btn);
          });

          container.appendChild(bar);

          const parentLink = productsHeading.querySelector('.parent-box-link');
          if (parentLink && productsHeading) {
            productsHeading.classList.add('has-filter');
            productsHeading.appendChild(container);
          }

          const allBtn = document.querySelector(".solution-btn.solution-all");
          if (allBtn) {
            allBtn.classList.add("active");
          }

          filterCategories("All");

          function filterCategories(solution) {
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

            const productLinks = productsBox.querySelectorAll('a[href*="/c/"]');

            productLinks.forEach((link) => {
              let categoryId = null;
              let categoryName = "";
              let productContainer = link.closest('div');

              while (productContainer && productContainer !== productsBox) {
                const parent = productContainer.parentElement;

                if (productContainer.classList.contains('category-box-inner')) {
                  productContainer = parent;
                  break;
                }

                if (parent && parent.children.length > 1 && parent !== productsBox) {
                  break;
                }

                productContainer = parent;
              }

              const badgeName = link.querySelector('.badge-category__name');
              if (badgeName) {
                categoryName = badgeName.textContent.trim();
              }

              const badge = link.querySelector('[data-category-id]');
              if (badge && badge.dataset.categoryId) {
                categoryId = parseInt(badge.dataset.categoryId);
              }

              if (!categoryId && link.href) {
                const match = link.href.match(/\/c\/[^\/]+\/(\d+)/);
                if (match) {
                  categoryId = parseInt(match[1]);
                }
              }

              if (categoryName === 'Products' || !productContainer) {
                return;
              }

              if (categoryId && !productContainer.querySelector('.product-solution-badges')) {
                const solutions = getSolutionsForProduct(categoryId);
                if (solutions.length > 0) {
                  const badgesContainer = document.createElement('div');
                  badgesContainer.classList.add('product-solution-badges');

                  solutions.forEach(solution => {
                    const badge = document.createElement('span');
                    badge.classList.add('solution-badge', 'solution-' + solution.toLowerCase());
                    badge.textContent = solution;
                    badgesContainer.appendChild(badge);
                  });

                  const categoryNameElement = productContainer.querySelector('.badge-category__name');
                  if (categoryNameElement && categoryNameElement.parentElement) {
                    const insertTarget = categoryNameElement.closest('a') || categoryNameElement.parentElement;
                    if (insertTarget.parentElement) {
                      insertTarget.parentElement.insertBefore(badgesContainer, insertTarget.nextSibling);
                    }
                  }
                }
              }

              const isUnmappedProduct = UNMAPPED_PRODUCT_IDS.includes(categoryId) ||
                                       (categoryName.toLowerCase().includes('1secure')) ||
                                       (categoryName.toLowerCase().includes('activity monitor'));

              if (categoryId && categoryName) {
                if (isUnmappedProduct) {
                  if (solution === "All") {
                    productContainer.style.setProperty('display', '', 'important');
                  } else {
                    productContainer.style.setProperty('display', 'none', 'important');
                  }
                }
                else if (ALL_PRODUCT_IDS.includes(categoryId)) {
                  if (solution === "All" || SOLUTIONS[solution].includes(categoryId)) {
                    productContainer.style.setProperty('display', '', 'important');
                  } else {
                    productContainer.style.setProperty('display', 'none', 'important');
                  }
                }
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
