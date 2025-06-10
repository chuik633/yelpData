import { fetchBusinessData, fetchReviewData } from "./data.js"; //data
import {
  data1_protein,
  data2_sentiments,
  data3_openTimes,
  data4_cuisines,
} from "./data.js"; //data processing
import { proteinPlot } from "./a_proteins.js";
import { sentimentPlot } from "./b_sentiments.js";
import { hoursPlot } from "./c_hours.js";
import { cuisineMapPlot } from "./d_cuisinemap.js";

async function initialize() {
  const business_data = await fetchBusinessData();
  const review_data = await fetchReviewData();

  // Create the data
  const data1 = data1_protein(business_data, review_data);
  const data2 = data2_sentiments(review_data);
  const data3 = data3_openTimes(business_data);
  const data4 = data4_cuisines(business_data);

  // Preview of datasets
  console.log("------------\n 1. POPULAR DISHES IN EACH CUISINE", data1);
  console.log("------------\n 2. REVIEW SENTIMENTS", data2);
  console.log("------------\n 3. WHEN ARE RESTAURANTS OPEN?", data3);
  console.log("------------\n 4. WHERE ARE DIFFERENT CUISINES IN NYC?", data4);

  // Create the plots
  proteinPlot(data1);
  sentimentPlot(data2);
  hoursPlot(data3);
  cuisineMapPlot(data4);
}

// Call the initialize function
initialize();
