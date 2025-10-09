# backend API
#  here we can clean, transform, reduce, map, filter, sort, etc. data
# backend functions will make front end code like making diagrams, visualizations, dashboards, etc. easier and cleaner


# little example 
# Load dataset
data = pd.read_csv("../data/sample_data.csv")  # put your filename here

# Define simple function
def get_data_by_state(state_name):
    """Filter dataset by state name."""
    filtered = data[data["state"].str.lower() == state_name.lower()]
    return filtered
