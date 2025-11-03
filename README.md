# Discourse Solution Filter

A Discourse theme component that adds filterable solution categories to the Products section on the homepage.

## Features

- Adds filter buttons (All, DSPM, Directory, Endpoint, Identity, ITDR, PAM) to the Products category
- Dynamically shows/hides product categories based on selected solution
- Displays solution badges on product cards
- Fully configurable via theme settings - no code changes needed to update category mappings

## Installation

1. Go to your Discourse Admin panel
2. Navigate to Customize > Themes
3. Click "Install" and select "From a git repository"
4. Enter: `https://github.com/dereklputnam/discourse-solution-filter`
5. Click "Install"

## Configuration

All solution-to-category mappings are configurable in the theme settings:

- **solution_dspm_categories**: Category IDs for DSPM solution
- **solution_directory_categories**: Category IDs for Directory solution
- **solution_endpoint_categories**: Category IDs for Endpoint solution
- **solution_identity_categories**: Category IDs for Identity solution
- **solution_itdr_categories**: Category IDs for ITDR solution
- **solution_pam_categories**: Category IDs for PAM solution
- **unmapped_product_categories**: Category IDs for products not mapped to any solution

To modify the mappings, go to Admin > Customize > Themes > [Your Theme] > Settings and update the category ID lists.

## License

MIT License - see LICENSE file for details
