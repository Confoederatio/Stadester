library(jsonlite)
library(tidyverse)
library(scales)

# --- Step 1: Define Region Configuration ---
region_config <- list(
  northern_america = list(colour = c(87, 122, 175), name = "Northern America"),
  latin_america = list(colour = c(71, 165, 101), name = "Latin America"),
  europe = list(colour = c(47, 97, 170), name = "Europe"),
  eastern_europe_and_russia = list(
    colour = c(20, 114, 30),
    name = "Eastern Europe and Russia"
  ),
  central_asia = list(colour = c(41, 193, 175), name = "Central Asia"),
  middle_east = list(colour = c(198, 130, 129), name = "Middle East"),
  maghreb_egypt = list(colour = c(239, 188, 112), name = "Maghreb and Egypt"),
  sub_saharan_africa = list(
    colour = c(155, 101, 77),
    name = "Sub-Saharan Africa"
  ),
  oceania = list(colour = c(0, 205, 143), name = "Oceania"),
  indian_subcontinent = list(
    colour = c(214, 144, 83),
    name = "Indian Subcontinent"
  ),
  southeast_asia = list(colour = c(97, 144, 163), name = "Southeast Asia"),
  eastasia = list(colour = c(173, 62, 62), name = "East Asia"),
  world = list(colour = c(150, 150, 150), name = "World")
)

color_mapping <- sapply(region_config, function(region) {
  rgb(region$colour[1], region$colour[2], region$colour[3], maxColorValue = 255)
})

label_mapping <- sapply(region_config, function(region) {
  region$name
})

# --- Step 2: Piecewise Axis Mapping Function ---
map_years_to_axis <- function(year) {
  case_when(
    year <= 0 ~ 0.00 + 0.25 * (year - (-10000)) / (0 - (-10000)),
    year <= 1700 ~ 0.25 + 0.25 * (year - 0) / (1700 - 0),
    year <= 1950 ~ 0.50 + 0.25 * (year - 1700) / (1950 - 1700),
    year <= 2023 ~ 0.75 + 0.25 * (year - 1950) / (2023 - 1950),
    TRUE ~ NA_real_
  )
}

# --- Step 3: Load and Process Data ---
json_file_path <- "./6.results/population.json"
raw_data <- fromJSON(json_file_path)

tidy_population_data <- imap_dfr(raw_data, ~ {
  tibble(
    key = names(.x),
    Value = unlist(.x)
  ) %>%
    mutate(Region_Key = .y)
}) %>%
  separate(
    key,
    into = c("Population_Type", "Year"),
    sep = "-",
    extra = "merge",
    convert = TRUE
  ) %>%
  mutate(
    Population_Type = factor(
      str_to_title(str_replace_all(Population_Type, "_", " ")),
      levels = c("Total Population", "Urban Population", "Rural Population")
    ),
    Scaled_X = map_years_to_axis(Year)
  ) %>%
  select(Region_Key, Year, Scaled_X, Population_Type, Value) %>%
  filter(!is.na(Value), Value > 0) %>%
  arrange(Region_Key, Population_Type, Year)

# --- Step 4: Axis Breaks Setup ---
# X-axis ticks matching the image
x_tick_years <- c(
  -10000,
  -5000,
  0,
  500,
  1000,
  1500,
  1700,
  1900,
  1950,
  1975,
  2000,
  2023
)
x_tick_scaled <- map_years_to_axis(x_tick_years)

# Logarithmic Y-axis breaks (1k to 10G)
major_breaks <- 10^(3:10)
minor_breaks <- as.vector(sapply(3:10, function(p) (2:9) * 10^p))

# Key threshold values
x_1975 <- map_years_to_axis(1975)
transition_years_scaled <- map_years_to_axis(c(0, 1700, 1950))

# --- Step 5: Build Chart ---
final_plot <- ggplot(
  tidy_population_data,
  aes(
    x = Scaled_X,
    y = Value,
    color = Region_Key,
    shape = Population_Type,
    group = interaction(Region_Key, Population_Type)
  )
) +
  # Scale interval boundaries (dotted lines at 0, 1700, 1950)
  geom_vline(
    xintercept = transition_years_scaled,
    linetype = "dotted",
    color = "grey60",
    linewidth = 0.5
  ) +
  # 1975 Satellite line
  geom_vline(
    xintercept = x_1975,
    linetype = "dashed",
    color = "#D9534F",
    linewidth = 0.6
  ) +
  # Lines and Points
  geom_line(linewidth = 0.45, alpha = 0.85) +
  geom_point(size = 1.1, alpha = 0.85) +
  # Text Annotations around 1975 line
  annotate(
    "text",
    x = x_1975,
    y = 3e5,
    label = "Modern Satellite Data",
    angle = 90,
    vjust = 1.3,
    color = "#D9534F",
    fontface = "italic",
    size = 3.2
  ) +
  annotate(
    "text",
    x = x_1975,
    y = 3e5,
    label = "Pre-Satellite Data",
    angle = 90,
    vjust = -0.5,
    color = "#D9534F",
    fontface = "italic",
    size = 3.2
  ) +
  # Axes configuration
  scale_x_continuous(
    breaks = x_tick_scaled,
    labels = x_tick_years,
    expand = c(0.01, 0.01)
  ) +
  scale_y_log10(
    labels = label_number(scale_cut = cut_si("")),
    breaks = major_breaks,
    minor_breaks = minor_breaks
  ) +
  # Manual Aesthetic Scales
  scale_color_manual(
    name = "Region",
    values = color_mapping,
    labels = label_mapping
  ) +
  scale_shape_manual(
    name = "Population Type",
    values = c(
      "Total Population" = 16,
      "Urban Population" = 15,
      "Rural Population" = 17
    )
  ) +
  # Legend formatting to match the black glyphs in the top legend
  guides(
    shape = guide_legend(
      order = 1,
      nrow = 1,
      override.aes = list(color = "black", size = 2)
    ),
    color = guide_legend(
      order = 2,
      nrow = 3
    )
  ) +
  labs(
    x = "Year",
    y = "Population, Logarithmic",
    caption = "1000-year intervals (-10000-0), 100-year intervals (0-1700), 10-year intervals (1700-1950), yearly since (1950-2023)"
  ) +
  theme_minimal() +
  theme(
    legend.position = "bottom",
    legend.box = "vertical",
    legend.box.just = "center",
    legend.title = element_text(face = "bold", size = 10),
    legend.text = element_text(size = 9),
    panel.grid.minor.y = element_line(
      color = "grey92",
      linewidth = 0.2,
      linetype = "dashed"
    ),
    panel.grid.minor.x = element_blank(),
    plot.caption = element_text(
      hjust = 1,
      size = 8,
      color = "grey30",
      margin = margin(t = 10)
    )
  )

print(final_plot)

ggsave(
  "./6.results/global_population_totals_graph.png",
  bg = "white",
  plot = final_plot,
  width = 14,
  height = 8,
  dpi = 300
)