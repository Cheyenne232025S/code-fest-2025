from data.scripts.extract.extract_osm import extract_osm_restaurants
from data.scripts.transform.clean_restaurants import clean_osm_data

def run_etl():
    raw = extract_osm_restaurants("New York")
    clean_osm_data("data/raw/osm_restaurants_new_york.json")

if __name__ == "__main__":
    run_etl()
