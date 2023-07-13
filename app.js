//Libraries and variables
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const urlencodedParser = bodyParser.urlencoded({ extended: false });

var userInput;
var prices, shipPrices, totalPrices = [];
var avgPrice = 0.0;
var searchFor = "";



(async () => {


//Use xternal html and css files and start server
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');

  app.get('/', (req, res) => {
    res.render('index');
  });
  app.get('/results', (req, res) => {
    res.render('results');
  });
  app.use('/public', express.static(__dirname + '/public'));

  const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
  server.keepAliveTimeout = 120 * 1000;
  server.headersTimeout = 120 * 1000;



//Get inputs from form, get prices and display results
  app.post('/', urlencodedParser, (req, res) => {
    userInput = req.body;
    displayResults(res);
  });




})();






//Functions

//Take user input array and turn into on string to search for on ebay
async function organizeSearchInputs() {
  searchFor = '\"' + userInput.name + '\" \"' + userInput.year + '\" \"' + userInput.brand + '\"';
  if (userInput.insertName != '') { searchFor += ' \"' + userInput.insertName + '\"' }
  if (userInput.cardNumber != '') { searchFor += ' \"' + userInput.cardNumber + '\"' }

  searchFor += ' -gold -refractor -silver -holo -cracked -psa -bgs -sgc -csg -gma';

}



//Use puppeter to scrape ebay for sold prices of user input
async function getPrices() {

  //Open browser and search sold items on ebay
  var browser = await puppeteer.launch({
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('https://ebay.com');
  await page.waitForSelector("#gh-ac");
  await page.type('#gh-ac', searchFor);
  await page.click('input[value="Search"]');
  await page.waitForSelector('.checkbox__control');
  await page.click('.checkbox__control[aria-label="Sold Items"]');


  //Get item price and shipping cost and add them together. Store in array
  await page.waitForSelector('span.s-item__price');
  prices = await page.$$eval('span.s-item__price', elems => elems.map(elem => elem.innerText.split('$')[1].replace(',', '')));
  prices = prices.slice(1);
  try {
    await page.waitForSelector('span.s-item__shipping');
    shipPrices = await page.$$eval('span.s-item__shipping', elems => elems.map(elem => elem.innerText.replace(' shipping', '').split('$')[1]));
  } catch(error) {
    console.log("No cards found under this description.");
    await browser.close();
    process.exit(1);
  }
  for (var i=0; i<prices.length; i++) {
    if (shipPrices[i] == null) {shipPrices[i] = 0.0;}
    totalPrices[i] = Math.round((parseFloat(prices[i]) + parseFloat(shipPrices[i])) * 100) / 100;
  }
  console.log("Total Cards: " + totalPrices.length);


  //Sort prices array and eliminate lowest 25% and highest 25%. Display middle 50%
  totalPrices.sort(function(a,b) { return a - b;});
  totalPrices = totalPrices.slice(Math.round(totalPrices.length*0.2), Math.round(totalPrices.length-(totalPrices.length*0.3)));
  console.log(totalPrices);


  //Find average selling price and display
  for (var i=0; i<totalPrices.length; i++) {
    avgPrice += totalPrices[i];
  }
  avgPrice /= totalPrices.length;
  if (avgPrice < 15) {avgPrice *= 0.9;}
  avgPrice = Math.round(avgPrice * 100) / 100;
  if (totalPrices.length < 2) {
    console.log("Not enough cards sold for accurate pricing.");
  } else {
    console.log(avgPrice);
  }


  //Close browser
  await browser.close();

}



//Process search input function and get prices function then load results page
async function displayResults(res) {
  await organizeSearchInputs();
  await getPrices();
  res.render('results', {searchFor: searchFor, totalPrices: totalPrices, avgPrice: avgPrice});

}


