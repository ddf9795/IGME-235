//"use strict";

//Web Storage data
const prefix = "ddf9795-";
const sessionKey = prefix + "session";
const optionsKey = prefix + "options";
const questionsKey = prefix + "questions";

//API data
const API_URL = "https://opentdb.com/api.php?";

let questionsUrl = "";

//Try to load any pre-existing local data if it exists
let storedSession = localStorage.getItem(sessionKey);
let storedOptions = localStorage.getItem(optionsKey);
let storedQuestions = localStorage.getItem(questionsKey);

let amount = document.querySelector("#amount");
let category = document.querySelector("#category");
let difficulty = document.querySelector("#difficulty")
let type = document.querySelectorAll("input.type");

let submit = document.querySelector("#submit");
let clear = document.querySelector("#clear");
let reset = document.querySelector("#reset");

let aside = document.querySelector("aside");
let counter = document.querySelector("#counter");
let question = document.querySelector("#question");
let answers_wrapper = document.querySelector("#answers-wrapper");

let load = document.querySelector("#load");

//Event subscribers so we can update preferences as they're changed
amount.addEventListener("change", () => {
    storedOptions.amount = amount.value;
    localStorage.setItem(optionsKey, JSON.stringify(storedOptions));
});
category.addEventListener("change", () => {
    storedOptions.category = category.value;
    localStorage.setItem(optionsKey, JSON.stringify(storedOptions));
});
difficulty.addEventListener("change", () => {
    storedOptions.difficulty = difficulty.value;
    localStorage.setItem(optionsKey, JSON.stringify(storedOptions));
});
for (let i = 0; i < type.length; i++)
{
    type[i].addEventListener("change", () => {
        storedOptions.type = type[i].value;
        localStorage.setItem(optionsKey, JSON.stringify(storedOptions));
    });
}

submit.addEventListener("click", submitButtonClicked);
clear.addEventListener("click", clearButtonClicked);
reset.addEventListener("click", resetButtonClicked);

//If no options are already stored locally, generate some defaults
if (!storedOptions)
{
    storedOptions = 
    {
        //Amount of questions to ask the API for
        amount: "10",
        //The category of questions (by default, we use "null", and check later if it's null. If so, we omit the category section of the API call entirely, as an absence stands in for "Any Category")
        category: "any",
        //The difficulty of questions (same default as above)
        difficulty: "any",
        //The answer type (+1 above)
        type: "any"
    }
    
    //Store the default options
    localStorage.setItem(optionsKey, JSON.stringify(storedOptions));
}
else
{
    storedOptions = JSON.parse(storedOptions);
}
//If no session key is already stored, generate an a new one
if (!storedSession)
{
    retrieveSessionToken();

    localStorage.setItem(sessionKey, JSON.stringify(storedSession));
}
// else
// {
//     storedSession = JSON.parse(storedSession);
// }
//Do the same as above for questions
if (!storedQuestions || storedQuestions.array === "undefined")
{
    storedQuestions = {
        questions: undefined
    }

    localStorage.setItem(questionsKey, JSON.stringify(storedQuestions));
}
else
{
    storedQuestions = JSON.parse(storedQuestions);

    for (let i = 0; i < storedQuestions.questions.length; i++)
    {
        addToSidebar(storedQuestions, i);
    }

    //Display the question in the appropriate part of the website
    displayQuestion(storedQuestions, 0);
    displayAnswers(storedQuestions, 0);
    displayCounter(storedQuestions, 0);
}

//Match the options to their matching HTML elements
amount.value = storedOptions.amount;

category.querySelector(`option[value='${storedOptions.category}']`).selected = true;

difficulty.querySelector(`option[value='${storedOptions.difficulty}']`).selected = true;

for (let i = 0; i < type.length; i++)
{
    if (type[i].value == storedOptions.type)
    {
        type[i].checked = true;
        break;
    }
}

//Retrieve a new session token
function retrieveSessionToken() 
{
    let xhr = new XMLHttpRequest();

    xhr.onload = tokenLoaded;

    xhr.onerror = dataError;

    xhr.open("GET", "https://opentdb.com/api_token.php?command=request");
    xhr.send();
}

function tokenLoaded(e)
{
    let xhr = e.target;

    let obj = JSON.parse(xhr.responseText);

    storedSession = obj.token;

    localStorage.setItem(sessionKey, storedSession);

    console.log("New token generated!");

    clearLoading();

    window.alert("New session generated. Please try again to get your questions.");
}

//Try to retrieve a set of questions
function getQuestions()
{
    let xhr = new XMLHttpRequest();

    xhr.onload = questionsLoaded;

    xhr.onerror = dataError;

    xhr.open("GET", questionsUrl);
    xhr.send();
}

function questionsLoaded(e)
{
    let xhr = e.target;

    let obj = JSON.parse(xhr.responseText);

    //Check for errors first before anything

    //Error Code 1: No Results
    if (obj.response_code === 1)
    {
        //Front-end code here
        console.log("No results found!");
        clearLoading();
        return 1;
    }
    //Error Code 2: Invalid Parameter
    else if (obj.response_code === 2)
    {
        console.log("Invalid parameter(s) found in request!");
        clearLoading();
        return 2;
    }
    //Error Code 3: Token Not Found
    else if (obj.response_code === 3)
    {
        console.log("Token not found!");
        //Front-end code here
        //Generate a new token
        retrieveSessionToken();
        loadMessage("Previous session expired. Generating new session...");
        //Try again
        // getQuestions();
        return 3;
    }
    //Error Code 4: Token Empty
    else if (obj.response_code === 4)
    {
        //Front-end code here
        console.log("Token Empty!");

        return 4;
    }

    //Error Code 0: Success
    else if (obj.response_code === 0)
    {
        console.log("Success!");

        //Add each of the questions to the storedQuestions
        // for (let i = 0; i < obj.results.length; i++)
        // {
        //     storedQuestions[i] = obj.results[i];
        // }
        let newQuestions = {
            questions: undefined
        }
        newQuestions.questions = obj.results
        storedQuestions = newQuestions;

        //Add all the answers to the questions to a pool and randomize them
        for (let i = 0; i < storedQuestions.questions.length; i++)
        {
            storedQuestions.questions[i].questionPool = [{
                answer: storedQuestions.questions[i].correct_answer,
                correct: true
            }, 
            {
                answer: storedQuestions.questions[i].incorrect_answers[0],
                correct: false
            }, 
            {
                answer: storedQuestions.questions[i].incorrect_answers[1],
                correct: false
            }, 
            {
                answer: storedQuestions.questions[i].incorrect_answers[2],
                correct: false
            }];
            for (let j = 0; j < storedQuestions.questions[i].questionPool.length;)
            {
                if (storedQuestions.questions[i].questionPool[j].answer === undefined)
                {
                    storedQuestions.questions[i].questionPool.splice(j, 1);
                }
                else
                {
                    j++;
                }
            }
            storedQuestions.questions[i].questionPool.sort(() => Math.random() - 0.5);
        }
        
        //Save it to local storage
        localStorage.setItem(questionsKey, JSON.stringify(storedQuestions));

        //Clear the sidebar and repopulate it with the new questions
        resetSidebar();
        for (let i = 0; i < storedQuestions.questions.length; i++)
        {
            addToSidebar(storedQuestions, i);
        }

        clearLoading();
        
        //Display the first question and its answers in the appropriate part of the website
        resetCounter();
        resetQuestion();
        resetAnswers();
        displayCounter(storedQuestions, 0);
        displayQuestion(storedQuestions, 0);
        displayAnswers(storedQuestions, 0);
    }
}

//Function that handles the encoding the the API call and the sending of it
function submitButtonClicked()
{
    loadMessage("Fetching new questions...");

    //Encode an API call and try to send it
    let url = API_URL;
    url += "amount=" + storedOptions.amount;
    if (storedOptions.category !== "any")
    {
        url += "&category=" + storedOptions.category;
    }
    if (storedOptions.difficulty !== "any")
    {
        url += "&difficulty=" + storedOptions.difficulty;
    }
    if (storedOptions.type !== "any")
    {
        url += "&type=" + storedOptions.type;
    }
    url += "&token=" + storedSession;

    //Store the url
    questionsUrl = url;

    //Submit the url to the API call method
    getQuestions();
}

//Function that handles the clearing of questions
function clearButtonClicked()
{
    storedQuestions = {
        questions: undefined
    }

    localStorage.setItem(questionsKey, JSON.stringify(storedQuestions));

    counter.innerHTML="";
    aside.innerHTML = "";
    question.innerHTML = "";
    answers_wrapper.innerHTML = "";
}

//Function that handles the resetting of the session
function resetButtonClicked()
{
    let url = "https://opentdb.com/api_token.php?command=reset&token=" + storedSession;

    resetSession(url);
}

function resetSession(url)
{
    let xhr = new XMLHttpRequest();

    xhr.onerror = dataError;

    xhr.open("GET", url);
    xhr.send();

    console.log("Session reset!");

    window.alert("Session Reset!");
}

//Functions related to the aside bar
function resetSidebar()
{
    aside.innerHTML = "";
}
function addToSidebar(obj, index)
{
    //Form a new HTML element
    let newHTML = "";
    newHTML += "<p>" + obj.questions[index].category + " - " + obj.questions[index].difficulty + "</p>";
    newHTML += "<h3><a href='#' class='sidebarQuestion' onclick='javascript:redirectToQuestion(" + index + ")'>" + obj.questions[index].question + "</a></h3>";
    if (obj.questions[index].type == "multiple")
    {
        newHTML += "<p>Multiple Choice</p><hr>";
    }
    else if (obj.questions[index].type == "boolean")
    {
        newHTML += "<p>True/False</p><hr>";
    }
    //Append it as a child to the sidebar
    aside.innerHTML += newHTML;
}

//Functions related to the counter display
function resetCounter()
{
    counter.innerHTML = "";
}
function displayCounter(obj, index)
{
    //Form a new HTML element
    let newHTML = "";
    newHTML += "<p class='counter'> Question " + (index + 1) + " of " + obj.questions.length + "</p>";

    counter.innerHTML = newHTML;
}

//Functions related to the question display
function resetQuestion()
{
    question.innerHTML = "";
}
function displayQuestion(obj, index)
{
    //Form a new HTML element
    let newHTML = "";
    newHTML += "<h2>" + obj.questions[index].question + "</h2>"

    question.innerHTML += newHTML;

}

//Functions related to the answers display
function resetAnswers()
{
    answers_wrapper.innerHTML = "";
}
function displayAnswers(obj, index)
{
    //Form new HTML elements
    for (let i = 0; i < obj.questions[index].questionPool.length; i++)
    {
        let newHTML = "";
        if (obj.questions[index].questionPool[i].correct)
        {
            newHTML += "<p class='answer correct'><a href='#' onclick='javascript:correctAnswerClicked(" + index + "," + i + ")'>" + obj.questions[index].questionPool[i].answer + "</a></p>";
        }
        else
        {
            newHTML += "<p class='answer incorrect'><a href='#' onclick='javascript:incorrectAnswerClicked(" + index + "," + i + ")'>" + obj.questions[index].questionPool[i].answer + "</a></p>";
        }
        answers_wrapper.innerHTML += newHTML;
    }
    if (obj.questions[index].answered === true)
    {
        revealAnswers();
    }
}

function correctAnswerClicked(question, index)
{
    storedQuestions.questions[question].correctAnswerChosen = true;
    storedQuestions.questions[question].answered = true;

    localStorage.setItem(questionsKey, JSON.stringify(storedQuestions));

    revealAnswers();

    
}
function incorrectAnswerClicked(question, index)
{
    storedQuestions.questions[question].correctAnswerChosen = false;
    storedQuestions.questions[question].answered = true;

    localStorage.setItem(questionsKey, JSON.stringify(storedQuestions));

    revealAnswers();
}
function revealAnswers()
{
    let correctAnswers = document.querySelectorAll("p.correct");
    for (let i = 0; i < correctAnswers.length; i++)
    {
        correctAnswers[i].style.backgroundColor = "green";
        correctAnswers[i].querySelector("a").style.color = "white";
        correctAnswers[i].onclick = "";
    }
    let incorrectAnswers = document.querySelectorAll("p.incorrect");
    for (let i = 0; i < incorrectAnswers.length; i++)
    {
        incorrectAnswers[i].style.backgroundColor = "red";
        incorrectAnswers[i].querySelector("a").style.color = "white";
        incorrectAnswers[i].onclick = "";
    }
}

//Redirect to the question selected
function redirectToQuestion(index)
{
    resetQuestion();
    displayQuestion(storedQuestions, index);
    resetAnswers();
    displayAnswers(storedQuestions, index);
    resetCounter();
    displayCounter(storedQuestions, index);
}

//Functions related to the loading display
function clearLoading()
{
    load.style.zIndex="-1";
    load.style.background = "rgb(0,0,0,0)";
    load.innerHTML="";
}
function loadMessage(string)
{
    load.style.zIndex="1000";
    load.style.background="rgba(0.5,0.5,0.5,0.3)";
    load.innerHTML = "<img src='media/Ripple-1s-200px.gif' alt='Loading...'><p class='load'>" + string + "</p>";
}

function dataError(e)
{
    console.log("An error has occurred somewhere in the API calls!");
}