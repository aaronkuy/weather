const test = require("node:test");
const assert = require("node:assert/strict");

const {
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
} = require("../weather.js");

test("geocoding URL keeps special characters inside the city name", () => {
    for (const city of ["A&B", "Paris#x", "Paris&count=99", "São Paulo", "Frankfurt am Main"]) {
        const url = new URL(buildGeocodingUrl(city));
        assert.equal(url.origin + url.pathname, "https://geocoding-api.open-meteo.com/v1/search");
        assert.equal(url.searchParams.get("name"), city);
        assert.deepEqual(url.searchParams.getAll("count"), ["1"]);
        assert.equal(url.hash, "");
    }
});

test("forecast URL asks for the current values of one place", () => {
    const url = new URL(buildForecastUrl(52.52437, 13.41053));
    assert.equal(url.origin + url.pathname, "https://api.open-meteo.com/v1/forecast");
    assert.equal(url.searchParams.get("latitude"), "52.52437");
    assert.equal(url.searchParams.get("longitude"), "13.41053");
    assert.equal(
        url.searchParams.get("current"),
        "temperature_2m,relative_humidity_2m,weather_code,is_day",
    );
});

test("no URL carries a key parameter", () => {
    for (const url of [buildGeocodingUrl("Berlin"), buildForecastUrl(1, 2)]) {
        const names = [...new URL(url).searchParams.keys()];
        assert.ok(!names.some((name) => /key|appid|token/i.test(name)), names.join(","));
    }
});

test("pickPlace returns the first match", () => {
    const body = {
        results: [
            { id: 1, name: "Berlin", country: "Germany", latitude: 52.5, longitude: 13.4, population: 3 },
            { id: 2, name: "Berlin", country: "United States", latitude: 44.4, longitude: -71.1 },
        ],
    };
    assert.deepEqual(pickPlace(body), {
        name: "Berlin",
        country: "Germany",
        latitude: 52.5,
        longitude: 13.4,
    });
});

test("pickPlace returns null when the API found nothing", () => {
    // This is the real answer for an unknown name: status 200, no `results`.
    assert.equal(pickPlace({ generationtime_ms: 0.2 }), null);
    assert.equal(pickPlace({ results: [] }), null);
    assert.equal(pickPlace(null), null);
});

test("readCurrentWeather maps the API fields", () => {
    const body = {
        current: { temperature_2m: 1.8, relative_humidity_2m: 85, weather_code: 61, is_day: 0 },
    };
    assert.deepEqual(readCurrentWeather(body), {
        temperature: 1.8,
        humidity: 85,
        weatherCode: 61,
        isDay: false,
    });
    body.current.is_day = 1;
    assert.equal(readCurrentWeather(body).isDay, true);
    delete body.current.is_day;
    assert.equal(readCurrentWeather(body).isDay, true);
});

test("readCurrentWeather rejects an answer in an unexpected shape", () => {
    const broken = [
        {},
        { error: true, reason: "Latitude must be in range of -90 to 90°." },
        { current: { temperature_2m: null, relative_humidity_2m: 85, weather_code: 3 } },
        { current: { temperature_2m: "1.8", relative_humidity_2m: 85, weather_code: 3 } },
    ];
    for (const body of broken) {
        assert.throws(() => readCurrentWeather(body), { name: "WeatherError", kind: "service" });
    }
});

test("weather codes map to a description and an emoji", () => {
    assert.equal(getWeatherDescription(0), "Clear sky");
    assert.equal(getWeatherEmoji(0), "☀️");
    assert.equal(getWeatherDescription(3), "Overcast");
    assert.equal(getWeatherEmoji(3), "☁️");
    assert.equal(getWeatherEmoji(45), "🌫️");
    assert.equal(getWeatherEmoji(63), "🌧️");
    assert.equal(getWeatherEmoji(75), "❄️");
    assert.equal(getWeatherDescription(95), "Thunderstorm");
    assert.equal(getWeatherEmoji(99), "⛈️");
});

test("every code Open-Meteo documents has an entry", () => {
    const documented = [
        0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
        71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
    ];
    for (const code of documented) {
        assert.notEqual(getWeatherDescription(code), "Unknown conditions", `code ${code}`);
        assert.notEqual(getWeatherEmoji(code), "❓", `code ${code}`);
    }
});

test("an unknown code does not break the card", () => {
    assert.equal(getWeatherDescription(4), "Unknown conditions");
    assert.equal(getWeatherEmoji(4), "❓");
    assert.equal(getWeatherEmoji(undefined), "❓");
});

test("a clear night shows a moon, clouds stay clouds", () => {
    assert.equal(getWeatherEmoji(0, false), "🌙");
    assert.equal(getWeatherEmoji(1, false), "🌙");
    assert.equal(getWeatherEmoji(3, false), "☁️");
    assert.equal(getWeatherEmoji(61, false), "🌧️");
});

test("temperature has one decimal and no negative zero", () => {
    assert.equal(formatTemperature(1.8), "1.8°C");
    assert.equal(formatTemperature(21), "21.0°C");
    assert.equal(formatTemperature(-3.26), "-3.3°C");
    assert.equal(formatTemperature(-0.04), "0.0°C");
    assert.equal(formatTemperature(0.04), "0.0°C");
});

test("place name works with and without a country", () => {
    assert.equal(formatPlace("Berlin", "Germany"), "Berlin, Germany");
    assert.equal(formatPlace("Antarctica", undefined), "Antarctica");
});

test("error messages are sentences, never error objects", () => {
    assert.equal(getErrorMessage(new WeatherError("not-found")), ERROR_MESSAGES["not-found"]);
    assert.equal(getErrorMessage(new WeatherError("service")), ERROR_MESSAGES.service);
    assert.equal(getErrorMessage(new TypeError("Failed to fetch")), ERROR_MESSAGES.network);
    const timeout = new Error("signal timed out");
    timeout.name = "TimeoutError";
    assert.equal(getErrorMessage(timeout), ERROR_MESSAGES.network);
    assert.equal(getErrorMessage(new RangeError("x")), ERROR_MESSAGES.unknown);
    assert.equal(getErrorMessage(undefined), ERROR_MESSAGES.unknown);
    for (const message of Object.values(ERROR_MESSAGES)) {
        assert.match(message, /^[A-Z].*\.$/);
    }
});
