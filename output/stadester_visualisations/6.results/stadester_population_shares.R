library(jsonlite)
library(dplyr)
library(tidyr)
library(stringr)
library(purrr)
library(ggplot2)
library(scales)
library(patchwork)

# ==========================================
# 1. CONFIGURATION & COLOR MAPPINGS
# ==========================================

region_config <- list(
  northern_america = list(
    colour = c(87, 122, 175),
    name = "Northern America"
  ),
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
  rgb(
    region$colour[1],
    region$colour[2],
    region$colour[3],
    maxColorValue = 255
  )
})

label_mapping <- sapply(region_config, function(region) {
  region$name
})

# ==========================================
# 2. AXIS TRANSFORMATION FUNCTION
# ==========================================

# Maps historical years to a uniform [0, 1] x-axis based on non-linear intervals
map_years_to_axis <- function(year) {
  case_when(
    year <= 0 ~ 0.00 + 0.25 * (year - (-10000)) / (0 - (-10000)),
    year <= 1700 ~ 0.25 + 0.25 * (year - 0) / (1700 - 0),
    year <= 1950 ~ 0.50 + 0.25 * (year - 1700) / (1950 - 1700),
    year <= 2023 ~ 0.75 + 0.25 * (year - 1950) / (2023 - 1950),
    TRUE ~ NA_real_
  )
}

# Define key historical years for tick marks
axis_years <- c(
  -10000,
  -5000,
  -3000,
  0,
  1000,
  1700,
  1800,
  1900,
  1950,
  1975,
  2000,
  2023
)

axis_labels_df <- data.frame(
  Year = axis_years,
  Scaled_X = map_years_to_axis(axis_years)
)

# ==========================================
# 3. DATA LOADING & PREPARATION
# ==========================================

json_file_path <- "./6.results/population.json"

if (file.exists(json_file_path)) {
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
      )
    ) %>%
    select(Region_Key, Year, Population_Type, Value) %>%
    filter(!is.na(Value), Value > 0)
} else {
  # Fallback generator if population.json is not present
  set.seed(42)
  years <- c(
    seq(-10000, 0, by = 1000),
    seq(100, 1700, by = 200),
    seq(1710, 1950, by = 20),
    seq(1955, 2023, by = 5)
  )
  regions <- names(region_config)
  types <- c("Total Population", "Urban Population", "Rural Population")
  
  tidy_population_data <- expand.grid(
    Year = years,
    Region_Key = regions,
    Population_Type = types
  ) %>%
    mutate(Value = runif(n(), 1e4, 1e8))
}

# Attach continuous scaled coordinate
pct_population_data <- tidy_population_data %>%
  mutate(
    Scaled_X = map_years_to_axis(Year),
    Percentage = Value
  )

all_scaled_x <- unique(pct_population_data$Scaled_X)
all_regions <- setdiff(unique(pct_population_data$Region_Key), "world")

prepare_clean_data <- function(target_type) {
  pct_population_data %>%
    filter(Population_Type == target_type, Region_Key != "world") %>%
    complete(
      Scaled_X = all_scaled_x,
      Region_Key = all_regions,
      fill = list(Percentage = 0)
    ) %>%
    group_by(Scaled_X) %>%
    mutate(
      total_at_x = sum(Percentage, na.rm = TRUE),
      Percentage = ifelse(total_at_x > 0, Percentage / total_at_x, 0)
    ) %>%
    ungroup()
}

df_total <- prepare_clean_data("Total Population")
df_rural <- prepare_clean_data("Rural Population")
df_urban <- prepare_clean_data("Urban Population") %>%
  filter(Scaled_X >= map_years_to_axis(-3000))

# ==========================================
# 4. PLOTTING CONFIGURATION & HELPERS
# ==========================================

theme_pop_share <- function() {
  theme_minimal() +
    theme(
      panel.grid.major = element_line(color = "grey90", linewidth = 0.3),
      panel.grid.minor.y = element_line(
        color = "grey92",
        linewidth = 0.2,
        linetype = "dashed"
      ),
      panel.grid.minor.x = element_blank(),
      strip.text = element_text(face = "bold", size = 11),
      plot.title = element_text(face = "bold", size = 13, hjust = 0),
      axis.text.x = element_text(angle = 45, hjust = 1, size = 8),
      legend.position = "none",
      panel.spacing = unit(2, "lines"),
      plot.margin = margin(5, 5, 5, 5)
    )
}

clean_colors <- color_mapping[names(color_mapping) != "world"]
clean_labels <- label_mapping[names(label_mapping) != "world"]

shared_fill_scale <- scale_fill_manual(
  values = clean_colors,
  labels = clean_labels,
  name = NULL,
  guide = guide_legend(nrow = 2)
)

add_shared_layers <- function(p, show_text = TRUE) {
  p <- p +
    geom_vline(
      xintercept = c(0.25, 0.5, 0.75),
      linetype = "dotted",
      color = "grey60",
      linewidth = 0.4
    ) +
    geom_vline(
      xintercept = map_years_to_axis(1975),
      linetype = "dashed",
      color = adjustcolor("white", alpha.f = 0.6),
      linewidth = 0.7
    ) +
    geom_hline(
      yintercept = seq(0.2, 0.8, by = 0.2),
      color = "white",
      alpha = 0.3,
      linewidth = 0.2
    )
  
  if (show_text) {
    p <- p +
      annotate(
        "text",
        x = map_years_to_axis(1975),
        y = 0.5,
        label = "Pre-Satellite Data",
        color = "white",
        angle = 90,
        vjust = -0.6,
        size = 2.8,
        fontface = "italic",
        alpha = 0.7
      ) +
      annotate(
        "text",
        x = map_years_to_axis(1975),
        y = 0.5,
        label = "Modern Satellite Data",
        color = "white",
        angle = 90,
        vjust = 1.6,
        size = 2.8,
        fontface = "italic",
        alpha = 0.7
      )
  }
  return(p)
}

# ==========================================
# 5. INDIVIDUAL PLOTS & COMPOSITE ASSEMBLY
# ==========================================

# Top Plot: Total Population
p1 <- ggplot(df_total, aes(x = Scaled_X, y = Percentage, fill = Region_Key)) +
  geom_area(alpha = 0.9, color = "white", linewidth = 0.05) +
  scale_y_continuous(
    labels = label_percent(),
    expand = c(0, 0),
    breaks = seq(0, 1, 0.2)
  ) +
  scale_x_continuous(
    breaks = axis_labels_df$Scaled_X,
    labels = axis_labels_df$Year,
    expand = c(0, 0)
  ) +
  shared_fill_scale +
  labs(title = "Share of Total Population", x = NULL, y = "% of Total") +
  theme_pop_share()

p1 <- add_shared_layers(p1, show_text = TRUE)

# Bottom-Left Plot: Urban Population
x_start_val <- map_years_to_axis(-3000)

p2 <- ggplot(df_urban, aes(x = Scaled_X, y = Percentage, fill = Region_Key)) +
  geom_area(alpha = 0.9, color = "white", linewidth = 0.05) +
  scale_y_continuous(
    labels = label_percent(),
    expand = c(0, 0),
    breaks = seq(0, 1, 0.2)
  ) +
  scale_x_continuous(
    breaks = axis_labels_df$Scaled_X[axis_labels_df$Year > -3000],
    labels = axis_labels_df$Year[axis_labels_df$Year > -3000],
    expand = c(0, 0)
  ) +
  shared_fill_scale +
  labs(title = "Urban Population", x = "Year", y = "% of Urban Total") +
  theme_pop_share() +
  annotate(
    "text",
    x = x_start_val,
    y = -0.02,
    label = "-3000",
    angle = 45,
    hjust = 1.1,
    vjust = 1.1,
    size = 2.8,
    color = "grey30"
  ) +
  annotate(
    "segment",
    x = x_start_val,
    xend = x_start_val,
    y = 0,
    yend = -0.015,
    color = "grey90",
    linewidth = 0.3
  ) +
  coord_cartesian(
    xlim = c(x_start_val, max(axis_labels_df$Scaled_X)),
    clip = "off"
  ) +
  theme(plot.margin = margin(5, 5, 10, 5))

p2 <- add_shared_layers(p2, show_text = TRUE)

# Bottom-Right Plot: Rural Population
p3 <- ggplot(df_rural, aes(x = Scaled_X, y = Percentage, fill = Region_Key)) +
  geom_area(alpha = 0.9, color = "white", linewidth = 0.05) +
  scale_y_continuous(
    labels = label_percent(),
    expand = c(0, 0),
    breaks = seq(0, 1, 0.2)
  ) +
  scale_x_continuous(
    breaks = axis_labels_df$Scaled_X,
    labels = axis_labels_df$Year,
    expand = c(0, 0)
  ) +
  shared_fill_scale +
  labs(title = "Rural Population", x = "Year", y = NULL) +
  theme_pop_share()

p3 <- add_shared_layers(p3, show_text = TRUE)

# Final Assembly
final_composite <- p1 / (p2 | p3) +
  plot_layout(guides = "collect") +
  plot_annotation(
    caption = "Urban data starts at -3000. Interval scales: 1000y (-10k to 0), 100y (0 to 1700), 10y (1700 to 1950), 1y (1950 to 2023).",
    theme = theme(
      plot.caption = element_text(hjust = 1, size = 9, color = "grey30")
    )
  ) &
  theme(
    legend.position = "bottom",
    plot.background = element_rect(fill = "white", color = NA)
  )

print(final_composite)

ggsave(
  "./6.results/global_population_shares.png",
  bg = "white",
  plot = final_composite,
  width = 14,
  height = 8,
  dpi = 300
)