config.wikipedia.processing = {
  thousands_patterns: [`thousand`, `1000s`,  `1,000s`, `1.000s`],
  millions_patterns: [`million`, `1000000s`, `1,000,000s`, `1.000.000s`],

  population_patterns: [`estimate`, `population`, `pop`, `resident`, `inhabitant`, `ihb`],
  year_patterns: [`year`, `census`, `date`],

  excluded_urls: [`List_of`],
  population_table_selector: `div:has(h2) ~ table`
};