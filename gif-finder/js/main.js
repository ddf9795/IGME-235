// 1
window.onload = (e) => {document.querySelector("#search").onclick = searchButtonClicked};

// 2
let displayTerm = "";

// 3
function searchButtonClicked(){
    console.log("searchButtonClicked() called");
    
    const GIPHY_URL = "https://api.giphy.com/v1/gifs/search?";

    let GIPHY_KEY = "5PuWjWVnwpHUQPZK866vd7wQ2qeCeqg7";

    let url = GIPHY_URL;
    url += "api_key=" + GIPHY_KEY;

    let term = document.querySelector("#searchterm").value;
    displayTerm = term;

    term = term.trim();

    term = encodeURIComponent(term);

    if(term.length < 1) return;

    url += "&q=" + term;

    let limit = document.querySelector("#limit").value;
    url += "&limit=" + limit;

    document.querySelector("#status").innerHTML = "<b>Searching for '" + displayTerm + "'</b>";

    console.log(url);

    getData(url);
}

function getData(url) {
    let xhr = new XMLHttpRequest();

    xhr.onload = dataLoaded;

    xhr.onerror = dataError;

    xhr.open("GET", url);
    xhr.send();
}

function dataLoaded(e) {
    let xhr = e.target;

    console.log(xhr.responseText);

    let obj = JSON.parse(xhr.responseText);

    if (!obj.data || obj.data.length == 0) {
        document.querySelector("#status").innerHTML = "<b>No results found for '" + displayTerm + "'</b>";
        return;
    }

    let results = obj.data;
    console.log("results.length = " + results.length);
    let bigString = "";

    for (let i = 0; i < results.length; i++) {
        let result = results[i];

        let smallURL = result.images.fixed_width_downsampled.url;
        if (!smallURL) smallURL = "images/no-image-found.png";

        let url = result.url;

        let rating = (result.rating ? result.rating : "NA").toUpperCase();

        let line = `<div class='result'><img src='${smallURL}' title='${result.id}' />`;
        line += `<span><a target='_blank' href='${url}'>View on Giphy</a>`;
        
        line += "<p>Rating: ";
        line += rating;
        line += "</p></span></div>";

        bigString += line;
    }

    document.querySelector("#content").innerHTML = bigString;

    document.querySelector("#status").innerHTML = "<b>Success!</b><p><i>Here are " + results.length + " results for '" + displayTerm + "'</i></p>";
}

function dataError(e) {
    console.log("An error occurred");
}