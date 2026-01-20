//API key implementation
const apiKey = "359a0531cd1ab7ff290fea212542bb92";
//Fetch HTML elements
const weatherForm = document.querySelector(".weather-form");
const cityInput = document.querySelector(".cityInput");
const card = document.querySelector(".card");

//If no city got queried then don't display the card
card.style.display = "none";
//Prevent refresh the page when the user presses the submit button
weatherForm.addEventListener("submit", async event => {
    event.preventDefault();
//Extract the entered value of the input and allocate it
    const city = cityInput.value;
//If the input has a value (True), then try
    //initiate the getWeatherData function with the parameter city
    //cached with extracted value, await cuz the api query requires
    //a short term of time
    if(city){
        try{
            const weatherData = await getWeatherData(city);
            //If the api found the entered city, then initiate the display within the DOM
            displayWeatherInfo(weatherData);
        }
        //For potential debugging
        catch(error){
            console.error(error);
            displayError(error);
        }
    }
    //If the city is not found, return the corresponded string as a parameter
        //and display it with the function beneath
    else{
        displayError("please enter a valid city");
    }
});
//With the cached package 'city' queried by the previous input
//await the returned package as a reply
async function getWeatherData(city){
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
//Async allows us await in order to wait until the package is fully loaded and mailed
//Allocate it to response
    const response = await fetch(apiUrl);
//'ok' allows us to test if response contains a value or not, in this case
    //when the boolean is set to false, so no value indicated in response
    //then display a string
    if(!response.ok){
        throw new Error("city not found");
    }
//To conclude the function convert the string to a JSON in order to display it properly
    return await response.json();
}
//Create our array
function displayWeatherInfo(data){
    const {name: city,
        main: {temp, humidity},
        weather: [{description, id}]} = data;
//Default settings, when no city got entered nor found
    card.textContent = "";
    card.style.display = "flex";
//Create HTML container which displays the weather card
    //allocated to the corresponded variables
    const cityDisplay = document.createElement("h1");
    const tempDisplay = document.createElement("p");
    const humidityDisplay = document.createElement("p");
    const descDisplay = document.createElement("p");
    const weatherEmoji = document.createElement("p");
//Allocating the values from the returned api package towards the weather card
    cityDisplay.textContent = city;
    //273.15 Kelvin definition of 0 degrees, api delivers temp in Kelvin
    tempDisplay.textContent = `${(temp - 273.15).toFixed(1)}°C`;
    humidityDisplay.textContent = `humidity: ${humidity}%`;
    descDisplay.textContent = description;
    weatherEmoji.textContent = getWeatherEmoji(id);
//Connect HTML elements with the CSS styling
    cityDisplay.classList.add("cityDisplay");
    tempDisplay.classList.add("tempDisplay");
    humidityDisplay.classList.add("humidityDisplay");
    descDisplay.classList.add("descDisplay");
    weatherEmoji.classList.add("weatherEmoji");
//Insert all the HTML elements inside the weather card container
    card.appendChild(cityDisplay);
    card.appendChild(tempDisplay);
    card.appendChild(humidityDisplay);
    card.appendChild(descDisplay);
    card.appendChild(weatherEmoji);
}
//Depending on what range the ID has, so does change the symbol
function getWeatherEmoji(weatherId){
    switch(true){
        case (weatherId >= 200 && weatherId < 300):
            return "⛈️";
        case (weatherId >= 300 && weatherId < 400):
            return "🌧️";
        case (weatherId >= 500 && weatherId < 600):
            return "🌧️";
        case (weatherId >= 600 && weatherId < 700):
            return "❄️";
        case (weatherId >= 700 && weatherId < 800):
            return "🌫️";
        case (weatherId === 800):
            return "☀️";
        case (weatherId >= 801 && weatherId < 810):
            return "☁️";
        default:
            return "❓";
    }
}
//Revise the Card container when an error occurs
function displayError(message){
    const errorDisplay = document.createElement("p");
    errorDisplay.textContent = message;
    errorDisplay.classList.add("errorDisplay");

    card.textContent = "";
    card.style.display = "flex";
    card.appendChild(errorDisplay);
}