library(dplyr)
library(readr)
library(stringr)
library(tidyr)
set.seed(42)  # for reproducibility


df <- read.csv("restaurants_near_hotels.csv")


# Replace empty strings with NA
df$price[df$price == ""] <- NA

# Randomly fill missing price values with $, $$, $$$, $$$$
all_levels <- c("$", "$$", "$$$", "$$$$")
probs <- c(0.25, 0.45, 0.25, 0.05)  # adjust probabilities if you like

df$price[is.na(df$price)] <- sample(all_levels,
                                    size = sum(is.na(df$price)),
                                    replace = TRUE,
                                    prob = probs)

# Add price_level (count number of $ signs)
df <- df %>%
  mutate(price_level = str_count(price, fixed("$")))

# Save the cleaned version
write_csv(df, "restaurants_near_hotels_clean.csv")
cleaned <- read.csv("restaurants_near_hotels_clean.csv")


