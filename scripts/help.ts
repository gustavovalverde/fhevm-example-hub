const help = `fhEVM Example Hub

Common commands
  npm run quickstart                     # build + test one example (default: fhe-counter)
  npm run create <slug> <output-dir>     # generate a standalone example repo
  npm run create:category <cat> <dir>    # generate a category bundle
  npm run examples                       # list example slugs
  npm run categories                     # list categories
  npm run docs                           # regenerate all docs
  npm run docs:one -- <slug>             # regenerate docs for one example
  npm run catalog                        # generate docs/catalog.json
  npm run validate:all                   # generate + test all examples
  npm run clean:generated                # remove generated outputs
  npm run verify                         # lint + typecheck + compile + test
  npm run check                          # lint + typecheck + compile (no tests)
  npm run fix                            # autofix formatting + lint

Examples
  npm run quickstart fhe-counter
  npm run create encrypted-age-verification ./output/age-verification
  npm run create:category identity ./output/category-identity
  npm run docs:one -- fhe-counter
`;

console.log(help);
