import * as d3 from "d3";
import { RiTa as rita } from "rita";
import Sentiment from "sentiment";
const cuisines = [
  "Italian",
  "Chinese",
  "Mexican",
  "Indian",
  "Japanese",
  "French",
  "American",
  "Thai",
  "Spanish",
  "Korean",
  "Vietnamese",
  "Mediterranean",
  "Middle Eastern",
  "Greek",
  "African",
  "Turkish",
  "Caribbean",
  "Cajun",
  "Soul Food",
  "Vegan",
  "Vegetarian",
];
const fetchBusinessData = async () => {
  const business_data = await d3
    .json("./data/yelp_dataset/business_reformatted.json")
    .then((data) => {
      //parse the data
      let parsedData = data.map((d) => {
        if (!d.categories) {
          return {};
        }
        return {
          name: d.name,
          business_id: d.business_id,
          categories: d.categories.split(",").map((cat) => cat.trim()),
          review_count: d.reviewCount,
          hours: d.hours,

          //geographic
          city: d.city,
          latitude: d.latitude,
          longitude: d.longitude,
          postal_code: parseInt(d.postal_code),
        };
      });

      //filter out non restauraunts
      let filteredData = parsedData.filter(
        (d) =>
          Array.isArray(d.categories) &&
          (d.categories.some((category) =>
            category.toLowerCase().includes("food")
          ) ||
            d.categories.some((category) =>
              category.toLowerCase().includes("restaurant")
            ))
      );
      return filteredData;
    });

  console.log("BUSINESS DATA LOADED:", business_data);
  return business_data;
};

const fetchReviewData = async () => {
  const review_data = await d3.json(
    "./data/yelp_dataset/review_reformatted.json"
  );
  console.log("REVIEW DATA LOADED:", review_data);
  return review_data;
};

//1. Popular proteins across cuisines
function data1_protein(business_data, review_data) {
  //used LLM's to help generate the lists below

  const proteinKeywords = {
    Chicken: [
      "chicken",
      "poultry",
      "grilled chicken",
      "fried chicken",
      "chicken breast",
      "chicken wings",
    ],
    Beef: [
      "beef",
      "steak",
      "ground beef",
      "roast beef",
      "sirloin",
      "ribeye",
      "burger",
      "steakhouse",
    ],
    Pork: [
      "pork",
      "pork chops",
      "pulled pork",
      "sausage",
      "bacon",
      "ham",
      "ribs",
    ],
    Fish: [
      "fish",
      "salmon",
      "tuna",
      "cod",
      "trout",
      "seafood",
      "sashimi",
      "sea bass",
    ],
    Tofu: [
      "tofu",
      "soy",
      "tempeh",
      "soybean",
      "vegetarian protein",
      "vegan protein",
    ],
    Lamb: ["lamb", "lamb chops", "mutton", "rack of lamb"],
    Turkey: ["turkey", "ground turkey", "turkey breast", "roast turkey"],
    Duck: ["duck", "duck breast", "peking duck", "duck confit"],
    Egg: [
      "egg",
      "eggs",
      "scrambled eggs",
      "fried eggs",
      "boiled eggs",
      "omelet",
      "egg whites",
    ],
    Shrimp: [
      "shrimp",
      "prawn",
      "shrimp cocktail",
      "shrimp scampi",
      "shrimp skewers",
    ],
  };

  //1. do the business dataset processing
  const cuisineInfoData = business_data.map((item) => {
    let cuisineList = [];
    for (const cuisine of cuisines) {
      if (
        item.categories.some(
          (category) => category.toLowerCase() == cuisine.toLowerCase()
        )
      ) {
        cuisineList.push(cuisine);
      }
    }
    if (cuisineList == [] || cuisineList.length == 0) {
      return;
    }

    return {
      ...item,
      cuisines: cuisineList,
    };
  });
  const businessCuisineData = cuisineInfoData
    .filter((item) => item != undefined)
    .flatMap((item) =>
      item["cuisines"].map((cuisine) => ({
        business_id: item.business_id,
        cuisine: cuisine,
      }))
    );

  //processing reviews
  function get_proteins_list(review) {
    const text = review.text;
    const words = text.toLowerCase().split(/[^a-zA-Z0-9']+/);
    let proteins = new Set();

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      for (const [protein, keywords] of Object.entries(proteinKeywords)) {
        if (keywords.some((keyword) => word.includes(keyword.toLowerCase()))) {
          proteins.add(protein);
        }
      }
    }
    return Array.from(proteins);
  }

  const reviewProteinData = review_data
    .filter((item) => item.text != undefined)
    .map((item) => {
      return {
        business_id: item.business_id,
        proteins: get_proteins_list(item),
      };
    })
    .flatMap((item) =>
      item["proteins"].map((protein) => ({
        business_id: item.business_id,
        protein: protein,
      }))
    );

  //create maps from each business id in order to merge them on this
  let businessIDToProtein = new Map();
  reviewProteinData.forEach((item) => {
    businessIDToProtein.set(item.business_id, item.protein);
  });

  businessIDToProtein = Object.fromEntries(businessIDToProtein);
  // console.log(Object.keys(businessIDToProtein))

  const cuisineProteinData = d3.rollup(
    businessCuisineData,
    (v) => v.length,
    (d) => {
      return d.cuisine;
    }, //group by the cuisine
    (d) => {
      if (Object.keys(businessIDToProtein).includes(d.business_id)) {
        let protein = businessIDToProtein[d.business_id];
        return protein;
      } else {
        return "no_match";
      }
    } //protein info
  );

  const fcuisineProteinData = Array.from(cuisineProteinData)
    .map((entry) => {
      entry[1] = Array.from(entry[1]).filter(
        (innerEntry) => innerEntry[0] != "no_match"
      );
      return entry;
    })
    .filter((entry) => entry[1].length != 0);

  return fcuisineProteinData;
}

//2. Review Sentiments
//Iused LLM's to help me create the themes/ words associated with each theme
const theme_keywords = {
  "Wait Time": ["wait", "delay", "waiting", "time", "long"],
  Service: ["service", "waiter", "staff", "attentive", "friendly", "rude"],
  "Food Quality": ["food", "taste", "delicious", "flavor", "fresh", "bad"],
  "Portion Size": ["portion", "size", "amount", "too much", "too little"],
  Ambiance: ["ambiance", "atmosphere", "decor", "environment"],
  Cleanliness: ["clean", "dirty", "cleanliness", "hygiene", "restroom"],
  Price: ["price", "expensive", "cheap", "affordable", "value", "cost"],
  Accessibility: [
    "access",
    "location",
    "parking",
    "wheelchair",
    "easy to find",
  ],
  Reservations: ["reservation", "book", "waitlist", "availability"],
  "Staff Attitude": ["staff", "attitude", "friendly", "helpful", "rude"],
  "Noise Level": ["noise", "quiet", "loud", "noisy", "calm"],
  "Food Variety": [
    "menu",
    "variety",
    "options",
    "choices",
    "vegan",
    "gluten-free",
  ],
};

//helper function to get the themes of a review
function get_review_themes(text) {
  const words = text.toLowerCase().split(/[^a-zA-Z0-9']+/);
  let themes = new Set();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    for (const [theme, keywords] of Object.entries(theme_keywords)) {
      if (keywords.some((keyword) => word.includes(keyword.toLowerCase()))) {
        themes.add(theme);
      }
    }
  }
  return Array.from(themes);
}

//helper function to get the sentiments of a review
function get_sentiment(text) {
  const sentiment = new Sentiment();
  const score = sentiment.analyze(text).score;

  if (score < -20) {
    return -3;
  } else if (score < -10) {
    return -2;
  } else if (score < -2) {
    return -1;
  } else if (score == 0) {
    return 0;
  } else if (score < 2) {
    return 1;
  } else if (score < 10) {
    return 2;
  } else if (score > 20) {
    return 3;
  }
}

function data2_sentiments(data) {
  //want data in the form: review theme:{sentiment score, number of reviews}
  const filteredData = data.filter((item) => item.text != undefined);
  //add the sentiment and theme info to the data and flatten it
  const sentimentThemeData = filteredData.map((d) => {
    return {
      id: d.review_id,
      stars: d.stars,
      themes: get_review_themes(d.text),
      sentiment: get_sentiment(d.text),
      text: d.text,
    };
  });
  // console.log(sentimentThemeData)
  const flattenedThemeData = sentimentThemeData.flatMap((item) =>
    item["themes"].map((theme) => ({
      ...item,
      theme: theme,
    }))
  );

  //group data based on both sentiment and theme.
  //We will later lay out based on sentiment and group circles based on theme
  //the v.length will determine the size of each circle
  const groupedData = d3.rollup(
    flattenedThemeData,
    (v) => v.length,
    (d) => {
      return d.sentiment;
    },
    (d) => {
      return d.theme;
    }
  );

  const groupedData2 = d3.rollup(
    flattenedThemeData,
    (v) => v,
    (d) => {
      return d.sentiment;
    },
    (d) => {
      return d.theme;
    }
  );
  return groupedData2;
}

//3. When are they open?
function data3_openTimes(data) {
  // process the data to include the name, geographic info,
  // and parse the hours dat
  const filteredData = data.filter((item) => item.hours != undefined);

  const processedData = filteredData.map((item) => {
    let processedHoursData = {
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      hours: item.hours,
    };

    return processedHoursData;
  });
  // console.log("PROCESSED DATA", processedData)
  //right now our processed data looks like:
  // `
  // {
  //   name:"",
  //   latitude:#,
  //   longitude:#,
  //   Monday: [Date, Date],
  //   Tuesday: [Date, Date],
  //   ...
  //   Saturday: [ Date, Date]
  // }
  // `

  // //we want it in the form
  // `
  // {
  //   Monday:{
  //     1 : [{entry}, {entry}...]
  //     2 : [{entry}, {entry}...]
  //     ...
  //   }
  //   ...
  // }
  // `

  //initialize the data structure
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  let allDayTimeData = {};
  for (const day of daysOfWeek) {
    let dayTimeData = {};
    for (let hour = 0; hour < 24; hour++) {
      dayTimeData[hour] = [];
    }
    allDayTimeData[day] = dayTimeData;
  }

  //populate the datastructures with the data
  for (const item of processedData) {
    for (const [day, hrs_range_str] of Object.entries(item.hours)) {
      //parse the hours
      let [open, close] = hrs_range_str.split("-");
      open = parseInt(open.split(":")[0]);
      close = parseInt(close.split(":")[0]);

      try {
        //add all the open hours
        for (let hour = open; hour < close; hour++) {
          if (!allDayTimeData[day][hour]) {
            allDayTimeData[day][hour] = [];
          }
          allDayTimeData[day][hour].push({
            name: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
          });
        }
      } catch {
        console.log("ERROR WITH:", item, day);
      }
    }
  }

  const roundingVal = 0.2;
  for (const day of daysOfWeek) {
    for (let hour = 0; hour < 24; hour++) {
      allDayTimeData[day][hour] = Object.fromEntries(
        d3.rollup(
          allDayTimeData[day][hour],
          (v) => {
            return {
              count: v.length,
              avg_lat: d3.mean(v.map((d) => d.latitude)),
              avg_long: d3.mean(v.map((d) => d.longitude)),
            };
          },
          (d) =>
            `${Math.floor(d.latitude / roundingVal) * roundingVal} ${
              Math.floor(d.longitude / roundingVal) * roundingVal
            }`
        )
      );
    }
  }

  console.log(allDayTimeData);
  return allDayTimeData;
}

//4. Where are cuisines across NYC?
function data4_cuisines(business_data) {
  let caBusinesses = business_data.filter((d) =>
    isInCalifornia(d.latitude, d.longitude)
  );
  const cities = Array.from(new Set(business_data.map((d) => d.city)));
  caBusinesses = business_data;
  const flattenedCuisinesData = caBusinesses.flatMap((item) =>
    item["categories"].map((category) => ({
      ...item,
      cuisine: category, //geo data cuisine info
    }))
  );

  // console.log(flattenedCuisinesData)
  const cuisineFilteredData = flattenedCuisinesData.filter((d) => {
    const is_Substring1 = cuisines.some((str) => str.includes(d.cuisine));
    const is_Substring2 = cuisines.some((str) => d.cuisine.includes(str));
    return is_Substring1 || is_Substring2;
  });

  const cuisineLocationData = d3.group(cuisineFilteredData, (d) => d.cuisine);
  return cuisineLocationData;
}

// let idToBusiness = {}
// business_data.map(d=>{
//   idToBusiness[d.business_id] = d
// })

// const allbusinessIdx = business_data.map(d=>d.business_id)

// //now get reviews associated with the business ids
// const id_match_reviewData = review_data
//     .filter(d=>allbusinessIdx.includes(d.business_id))

// let businessTextData = {}
// id_match_reviewData.map(review =>{
//   if(Object.keys(businessTextData).includes('review_text')){
//     businessTextData[review.business_id]['review_text']+=" " + review.text
//   }else{
//     businessTextData[review.business_id] = {
//       ...idToBusiness[review.business_id],
//       review_text: review.text
//     }
//   }
// })

// console.log(Object.fromEntries(cuisineLocationData)['Cafes'])

// const matchaCafeData = Array.from(Object.values(businessTextData))
//     .filter(d=>{
//       return /coffee/i.test(d.review_text)})

import * as turf from "@turf/turf";
//helper function used Chat gpt to get this
const californiaPolygon = turf.polygon([
  [
    [-124.4096, 32.5343], // Southern border (near Mexico)
    [-114.1315, 32.5343], // Southwestern corner
    [-114.1315, 42.0095], // Northeastern corner
    [-124.4096, 42.0095], // Northern border (Oregon)
    [-124.4096, 32.5343], // Back to the starting point
  ],
]);

// Helper function to check if a point is in California
function isInCalifornia(latitude, longitude) {
  const point = turf.point([longitude, latitude]);
  return turf.booleanPointInPolygon(point, californiaPolygon);
}

export {
  fetchBusinessData,
  fetchReviewData,
  data1_protein,
  data2_sentiments,
  data3_openTimes,
  data4_cuisines,
  get_sentiment,
  theme_keywords,
};
