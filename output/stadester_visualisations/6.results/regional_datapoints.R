#./6.results/regional_datapoints.csv
library(ggplot2)
library(dplyr)
library(tidyr)
library(readr)

# Read the CSV
df <- read_csv("./6.results/regional_datapoints.csv")

# Define the desired year breaks
year_breaks <- c(-10000, -3000, 0, 1000, 1700, 1800, 1950, 1975, 2000, 2025)
all_years <- sort(unique(c(df$year, year_breaks)))

# Reshape data to long format for ggplot
df_long <- df %>%
  pivot_longer(
    cols = c(area, density, population, total),
    names_to = "variable",
    values_to = "value"
  ) %>%
  mutate(
    year_factor = factor(year, levels = as.character(all_years), ordered = TRUE)
  )

# Set linetypes for each variable
linetypes <- c(
  area = "dotdash",
  density = "dotted",
  population = "dashed",
  total = "solid"
)

# Set shapes for each variable (optional, for points)
shapes <- c(
  area = 16,        # solid circle
  density = 17,     # solid triangle
  population = 15,  # solid square
  total = 18        # solid diamond
)

# Set color for each region (using the 'colour' column)
region_colors <- df %>% distinct(name, colour) %>% deframe()

# Set alpha for each variable
alphas <- c(
  area = 0.5,
  density = 0.3,
  population = 0.8,
  total = 1
)

# Find min and max positive values for log scale
y_vals <- df_long$value[df_long$value > 0]
min_y <- min(y_vals, na.rm = TRUE)
max_y <- max(y_vals, na.rm = TRUE)

# Calculate log10 intervals and tick positions
log_min <- floor(log10(min_y))
log_max <- ceiling(log10(max_y))

# Generate tick positions for each interval
tick_positions <- c()
for (i in log_min:log_max) {
  base <- 10^i
  ticks <- base * (1:9) # 1 to 9 within each interval
  tick_positions <- c(tick_positions, ticks)
}
tick_positions <- tick_positions[tick_positions >= min_y & tick_positions <= max_y]
tick_positions <- sort(unique(tick_positions))

# Get the rightmost year tick for label placement
rightmost_year <- as.character(max(year_breaks))

# Plot
ggplot(df_long, aes(
  x = year_factor,
  y = value,
  color = name,
  group = interaction(name, variable),
  linetype = variable,
  shape = variable,
  alpha = variable
)) +
  # Add horizontal tick markers (grid lines) for each log interval
  geom_hline(
    yintercept = tick_positions,
    color = "grey80",
    linetype = "solid",
    linewidth = 0.3
  ) +
  # Add a distinct horizontal line for the maximum Y value
  geom_hline(
    yintercept = max_y,
    color = "grey80",
    linetype = "solid",
    linewidth = 0.8
  ) +
  # Add a label for the maximum Y value at the rightmost year
  annotate(
    "text",
    x = rightmost_year,
    y = max_y,
    label = paste0("Max: ", format(max_y, scientific = TRUE, digits = 3)),
    hjust = -0.1,
    vjust = -0.5,
    color = "grey80",
    size = 5,
    fontface = "bold"
  ) +
  geom_line(size = 1) +
  geom_point(size = 2) +
  scale_color_manual(values = region_colors) +
  scale_linetype_manual(values = linetypes) +
  scale_shape_manual(values = shapes) +
  scale_alpha_manual(values = alphas) +
  scale_y_log10() +
  scale_x_discrete(
    name = "Year",
    breaks = as.character(year_breaks),
    labels = as.character(year_breaks)
  ) +
  labs(
    y = "Concurrent Number of Datapoints",
    color = "Region",
    linetype = "Variable",
    shape = "Variable",
    alpha = "Variable"
  ) +
  theme_minimal(base_size = 14) +
  theme(
    legend.position = "right"
  )