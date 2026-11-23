// Everything in this file works without the DOM and without the network.
// It is a classic script, not an ES module: modules do not load when
// index.html is opened straight from disk. The tests load it with require().

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather interpretation codes as Open-Meteo returns them:
// https://open-meteo.com/en/docs#weather_variable_documentation
const WEATHER_CODES = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Depositing rime fog", "🌫️"],
    51: ["Light drizzle", "🌧️"],
    53: ["Moderate drizzle", "🌧️"],
    55: ["Dense drizzle", "🌧️"],
    56: ["Light freezing drizzle", "🌧️"],
    57: ["Dense freezing drizzle", "🌧️"],
    61: ["Slight rain", "🌧️"],
    63: ["Moderate rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Light freezing rain", "🌧️"],
    67: ["Heavy freezing rain", "🌧️"],
    71: ["Slight snowfall", "❄️"],
    73: ["Moderate snowfall", "❄️"],
    75: ["Heavy snowfall", "❄️"],
    77: ["Snow grains", "❄️"],
    80: ["Slight rain showers", "🌧️"],
    81: ["Moderate rain showers", "🌧️"],
    82: ["Violent rain showers", "🌧️"],
    85: ["Slight snow showers", "❄️"],
    86: ["Heavy snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with slight hail", "⛈️"],
    99: ["Thunderstorm with heavy hail", "⛈️"],
};

const ERROR_MESSAGES = {
    empty: "Please enter a city.",
    "not-found": "City not found. Check the spelling and try again.",
    service: "The weather service is not available right now. Please try again later.",
    network: "No connection to the weather service. Check your network and try again.",
    unknown: "Something went wrong. Please try again.",
};

// An error the user can do something about. `kind` is a key of ERROR_MESSAGES.
class WeatherError extends Error {
    constructor(kind) {
        super(ERROR_MESSAGES[kind]);
        this.name = "WeatherError";
        this.kind = kind;
    }
}

// URLSearchParams encodes the name. Pasted into the URL as it is, "A&B" would
// search for "A" and "Paris#x" would cut off every parameter after it.
function buildGeocodingUrl(city) {
    const params = new URLSearchParams({
        name: city,
        count: "1",
        language: "en",
        format: "json",
    });
    return `${GEOCODING_URL}?${params}`;
}

function buildForecastUrl(latitude, longitude) {
    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: "temperature_2m,relative_humidity_2m,weather_code,is_day",
    });
    return `${FORECAST_URL}?${params}`;
}

// The geocoding API answers 200 without a `results` key when nothing matches,
// so "not found" has to be read from the body, not from the status.
function pickPlace(geocoding) {
    const [first] = geocoding?.results ?? [];
    if (!first) {
        return null;
    }
    const { name, country, latitude, longitude } = first;
    return { name, country, latitude, longitude };
}

function readCurrentWeather(forecast) {
    const current = forecast?.current ?? {};
    const {
        temperature_2m: temperature,
        relative_humidity_2m: humidity,
        weather_code: weatherCode,
        is_day: isDay,
    } = current;
    // A 200 answer in an unexpected shape is the service's problem, not the user's.
    if (![temperature, humidity, weatherCode].every(Number.isFinite)) {
        throw new WeatherError("service");
    }
    // Only an explicit 0 means night; a missing field counts as day.
    return { temperature, humidity, weatherCode, isDay: isDay !== 0 };
}

function getWeatherDescription(weatherCode) {
    return WEATHER_CODES[weatherCode]?.[0] ?? "Unknown conditions";
}

function getWeatherEmoji(weatherCode, isDay = true) {
    // A sun for a clear sky at midnight would be wrong.
    if (!isDay && (weatherCode === 0 || weatherCode === 1)) {
        return "🌙";
    }
    return WEATHER_CODES[weatherCode]?.[1] ?? "❓";
}

function formatTemperature(celsius) {
    // `|| 0` turns -0 into 0; otherwise -0.04 would be shown as "-0.0°C".
    const rounded = Math.round(celsius * 10) / 10 || 0;
    return `${rounded.toFixed(1)}°C`;
}

function formatPlace(name, country) {
    return country ? `${name}, ${country}` : name;
}

function getErrorMessage(error) {
    if (error instanceof WeatherError) {
        return error.message;
    }
    // fetch() rejects with a TypeError when the request never got an answer,
    // and AbortSignal.timeout() aborts it with a TimeoutError.
    if (error instanceof TypeError || error?.name === "TimeoutError" || error?.name === "AbortError") {
        return ERROR_MESSAGES.network;
    }
    return ERROR_MESSAGES.unknown;
}

if (typeof module !== "undefined") {
    module.exports = {
        ERROR_MESSAGES,
        WeatherError,
        buildGeocodingUrl,
        buildForecastUrl,
        pickPlace,
        readCurrentWeather,
        getWeatherDescription,
        getWeatherEmoji,
        formatTemperature,
        formatPlace,
        getErrorMessage,
    };
}
