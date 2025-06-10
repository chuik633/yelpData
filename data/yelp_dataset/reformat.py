import json

# with open('data/yelp_dataset/business.json', 'r') as input_file:
#     lines = input_file.readlines()
#     data = [json.loads(line) for line in lines]

# with open('data/yelp_dataset/business_reformatted.json', 'w') as output_file:
#     json.dump(data, output_file, indent=4)


with open('data/yelp_dataset/review.json', 'r') as input_file:
    lines = input_file.readlines()
    print(len(lines))
    data = [json.loads(line) for line in lines[:10000]]

with open('data/yelp_dataset/review_reformatted.json', 'w') as output_file:
    json.dump(data, output_file, indent=4)
