const {SIMILARWEB_API_ENDPOINT, TOTAL_TRAFFIC_ENGAGEMENT_VISITS, TOTAL_TRAFFIC_BOUNCE_RATE} = require("./ApiEndpoints");


function getAverage(arrayOfNumbers) {
  const total = arrayOfNumbers.reduce((sum, val) => sum + val, 0);
  const avg = total / arrayOfNumbers.length;
  return parseFloat(avg.toFixed(3));
}

function getUseCaseMultiplier(useCase) {

  switch (useCase) {
    case 'website':
      return 1.5;
    case 'community':
      return 2;
    case 'intranet':
      return 1.75;
    default:
      return 1;
  }
}

async function requestSimilarWebData(domains, params) {

  const visitsArray = [];
  const bounceRateArray = [];

  for (const domain of domains) {
    try {
      const [visits, bounceRate] = await Promise.all([similarWebVisitsCall(domain, params), similarWebBounceRateCall(domain, params)]);
      visitsArray.push(visits);
      bounceRateArray.push(bounceRate);
    } catch (error) {
      console.error(`Failed to retrieve data for domain ${domain.url}: ${error.message}.`);
      throw error;
    }
  }

  const avgVisits = getAverage(visitsArray);
  const avgBounceRates = getAverage(bounceRateArray);

  return {
    averageVisits: avgVisits.toFixed(0),
    averageBounceRates: avgBounceRates
  };
}

async function similarWebBounceRateCall(domain, params) {

  const url = `${SIMILARWEB_API_ENDPOINT}${domain.url}/${TOTAL_TRAFFIC_BOUNCE_RATE}?${params.toString()}`;

  try {
    const response = await fetch(url, {method: "get"});

    if (!response.ok) {
      throw new Error(`API request for bounce rate to ${domain.url} failed with status ${response.status}.`);
    }

    const result = await response.json();

    if (result && result.bounce_rate && Array.isArray(result.bounce_rate) && result.bounce_rate.length > 0) {
      return getAverage(result.bounce_rate.map(d => d.bounce_rate));
    } else {
      throw new Error(`Bounce rate data not found or is empty for ${domain.url}.`);
    }
  } catch (error) {
    console.error(`Error in similarWebBounceRateCall for ${domain.url}: ${error.message}`);
    throw error;
  }
}


async function similarWebVisitsCall(domain, params) {

  const url = `${SIMILARWEB_API_ENDPOINT}${domain.url}/${TOTAL_TRAFFIC_ENGAGEMENT_VISITS}?${params.toString()}`;

  try {
    const response = await fetch(url, {method: "get"});
    if (!response.ok) {
      throw new Error(`API request for visits to ${domain.url} failed with status ${response.status}.`);
    }

    const result = await response.json();

    if (result && result.visits && Array.isArray(result.visits) && result.visits.length > 0) {
      return getAverage(result.visits.map(d => d.visits));
    } else {
      console.warn(`Visits data not found for ${domain.url}. Response:`, result);
      throw new Error(`Visits data not found or is empty for ${domain.url}.`);
    }
  } catch (error) {
    console.error(`Error in similarWebVisitsCall for ${domain.url}: ${error.message}`);
    throw error;
  }
}

function cleanDomainUrls(domains) {
  return domains.map(obj => {
    const cleanedUrl = obj.url
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/\/$/, '');
    return { url: cleanedUrl };
  });
}
async function calculateQPM(body) {
  const {dateRange, country, domains, useCase, caseDeflection} = body;

  if (!dateRange || dateRange.length < 2) {
    throw new Error("dateRange (array with start and end date) is required.");
  }
  if (!country) {
    throw new Error("country is required.");
  }
  if (domains.length === 0) {
    throw new Error("domains (array of domain objects) cannot be empty.");
  }
  if (!useCase) {
    throw new Error("useCase is required.");
  }

  if (typeof caseDeflection !== 'number' || isNaN(caseDeflection)) {
    throw new Error("caseDeflection (number) is required.");
  }

  const [start_date, end_date] = dateRange;
  const useCaseMultiplier = getUseCaseMultiplier(useCase);
  const apiKey = process.env.SIMILAR_WEB_API_KEY;

  if (!apiKey) {
    console.error("SIMILAR_WEB_API_KEY is not set in environment variables.");
    throw new Error("Server configuration error: Missing API key. Please contact the core team :)");
  }

  const params = new URLSearchParams({
    api_key: apiKey, start_date, end_date, country, granularity: 'monthly'
  });

  const cleanedDomains = cleanDomainUrls(domains);

  const {averageVisits, averageBounceRates} = await requestSimilarWebData(cleanedDomains, params);
  const numAverageVisits = parseFloat(averageVisits);
  const potentialQueries = numAverageVisits * (1 - averageBounceRates);
  const estimatedQPM = Math.round(potentialQueries * useCaseMultiplier * (caseDeflection / 100));

  return {
    estimatedQPM: estimatedQPM, averageVisits: averageVisits, averageBounceRates: (averageBounceRates * 100).toFixed(2)
  };
}

module.exports = calculateQPM;
