// Needs weather.js to be loaded first (see index.html).

const REQUEST_TIMEOUT_MS = 8000;

const weatherForm = document.querySelector(".weather-form");
const cityInput = document.querySelector(".cityInput");
const submitButton = weatherForm.querySelector("button");
const card = document.querySelector(".card");

weatherForm.addEventListener("submit", async event => {
    // Without preventDefault() the form would reload the page.
    event.preventDefault();

    const city = cityInput.value.trim();
    if (!city) {
        // Empty input never reaches the network.
        displayError(ERROR_MESSAGES.empty);
        return;
    }

    // One search at a time: a slow earlier answer must not overwrite a newer one.
    submitButton.disabled = true;
    try {
        const weatherData = await getWeatherData(city);
        displayWeatherInfo(weatherData);
    } catch (error) {
        // A WeatherError is an expected outcome; anything else is a bug and worth a log entry.
        if (!(error instanceof WeatherError)) {
            console.error(error);
        }
        displayError(getErrorMessage(error));
    } finally {
        submitButton.disabled = false;
    }
});

// Open-Meteo's forecast API takes coordinates, not names, so every search is
// two requests: city name -> coordinates, coordinates -> current weather.
async function getWeatherData(city) {
    const place = pickPlace(await fetchJson(buildGeocodingUrl(city)));
    if (!place) {
        throw new WeatherError("not-found");
    }
    const forecast = await fetchJson(buildForecastUrl(place.latitude, place.longitude));
    return { place, current: readCurrentWeather(forecast) };
}

async function fetchJson(url) {
    let response;
    try {
        // Without a timeout a hanging request would leave the button disabled for good.
        response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch {
        // fetch() rejects only when no answer arrived: offline, DNS failure, timeout.
        // Naming that here keeps a TypeError from a bug elsewhere from looking like one.
        throw new WeatherError("network");
    }
    // Both APIs answer 400 for bad parameters and 429 above the rate limit.
    // Neither is something the user can fix by typing another city.
    if (!response.ok) {
        throw new WeatherError("service");
    }
    try {
        return await response.json();
    } catch (error) {
        // The timeout also covers the body; anything else here is an answer that is not JSON.
        throw new WeatherError(error?.name === "TimeoutError" ? "network" : "service");
    }
}

function displayWeatherInfo(data) {
    const {
        place: { name, country },
        current: { temperature, humidity, weatherCode, isDay },
    } = data;

    const cityDisplay = document.createElement("h2");
    const tempDisplay = document.createElement("p");
    const humidityDisplay = document.createElement("p");
    const descDisplay = document.createElement("p");
    const weatherEmoji = document.createElement("p");

    // textContent only: place names come from a third party.
    cityDisplay.textContent = formatPlace(name, country);
    tempDisplay.textContent = formatTemperature(temperature);
    humidityDisplay.textContent = `Humidity: ${humidity}%`;
    descDisplay.textContent = getWeatherDescription(weatherCode);
    weatherEmoji.textContent = getWeatherEmoji(weatherCode, isDay);
    // The description next to it already says what the emoji shows.
    weatherEmoji.setAttribute("aria-hidden", "true");

    cityDisplay.classList.add("cityDisplay");
    tempDisplay.classList.add("tempDisplay");
    humidityDisplay.classList.add("humidityDisplay");
    descDisplay.classList.add("descDisplay");
    weatherEmoji.classList.add("weatherEmoji");

    card.replaceChildren(cityDisplay, tempDisplay, humidityDisplay, descDisplay, weatherEmoji);
    card.hidden = false;
}

function displayError(message) {
    const errorDisplay = document.createElement("p");
    errorDisplay.textContent = message;
    errorDisplay.classList.add("errorDisplay");

    card.replaceChildren(errorDisplay);
    card.hidden = false;
}
